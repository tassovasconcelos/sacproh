import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

type AuthenticatedRequest = Request & { authUserId?: string };

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function apiRateLimit(limit = 30, windowMs = 60_000) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.authUserId || req.ip || 'unknown';
    const bucket = requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      requestBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= limit) {
      return res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto e tente novamente.' });
    }
    bucket.count += 1;
    return next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
  app.use(express.json({ limit: '10mb' }));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const authClient = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const requireAuthenticatedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!authClient) return res.status(503).json({ error: 'Autenticação do servidor não configurada.' });
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'Sessão obrigatória.' });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    req.authUserId = data.user.id;
    return next();
  };

  // Initialize Gemini AI SDK lazily
  const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({ apiKey: key });
  };

  // --- API ROUTES ---
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      app: 'GRIT SAC 4.0', 
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') 
    });
  });

  // AI Classification Endpoint
  app.use('/api/ai', requireAuthenticatedUser, apiRateLimit(20));
  app.use('/api/import', requireAuthenticatedUser, apiRateLimit(10));

  app.post('/api/ai/classify', async (req, res) => {
    try {
      const description = String(req.body?.description || '').trim();
      if (!description || description.length > 8_000) {
        return res.status(400).json({ error: 'O relato deve ter entre 1 e 8.000 caracteres.' });
      }
      const ai = getGeminiClient();

      if (!ai) {
        // Structured fallback response
        return res.json({
          suggested_category: description.toLowerCase().includes('erro') ? 'Assistência Técnica' : 'Logística / Avaria',
          suggested_subcategory: 'Falha de Componente / Fabricação',
          suggested_priority: description.toLowerCase().includes('cirúrgico') ? 'CRITICAL' : 'HIGH',
          suggested_severity: 'S2 - Moderada',
          summary: description,
          possible_root_causes: ['Instabilidade elétrica', 'Defeito de solda do conector'],
          missing_information: ['Lote do Fabricante'],
          confidence: 85
        });
      }

      const prompt = `Você é o assistente de triagem inteligente do GRIT SAC 4.0 para a empresa médica Procirúrgica.
Analise o relato do cliente a seguir e retorne ESTRITAMENTE um objeto JSON válido no seguinte formato:
{
  "suggested_category": "Assistência Técnica | Logística / Avaria | Qualidade | Comercial | Dúvida Técnica",
  "suggested_subcategory": "string",
  "suggested_priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "suggested_severity": "S1 - Crítica | S2 - Moderada | S3 - Leve",
  "summary": "resumo de 1 frase",
  "possible_root_causes": ["causa 1", "causa 2"],
  "missing_information": ["dado 1"],
  "confidence": 92
}

Relato do cliente:
"${description}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err) {
      console.error('Error calling Gemini AI for classification:', err);
      return res.status(500).json({ error: 'Failed to classify ticket' });
    }
  });

  // AI Executive Summary Endpoint
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { ticket } = req.body;
      if (!ticket || typeof ticket !== 'object') return res.status(400).json({ error: 'Chamado inválido.' });
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          summary: `Protocolo ${ticket.protocol}: Ocorrência de ${ticket.category} registrada para ${ticket.customerName}. Status atual: ${ticket.status}.`
        });
      }

      const prompt = `Gere um resumo executivo objetivo em português para o protocolo SAC ${ticket.protocol} do cliente ${ticket.customerName}.
Detalhes:
- Categoria: ${ticket.category}
- Descrição: ${ticket.description}
- Status: ${ticket.status}
- Prioridade: ${ticket.priority}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({ summary: response.text });
    } catch (err) {
      console.error('Error generating summary:', err);
      return res.status(500).json({ error: 'Failed to summarize ticket' });
    }
  });

  // AI Suggested Response Endpoint
  app.post('/api/ai/suggest-response', async (req, res) => {
    try {
      const { ticket } = req.body;
      if (!ticket || typeof ticket !== 'object') return res.status(400).json({ error: 'Chamado inválido.' });
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          suggestedResponse: `Prezado(a) ${ticket.customerName},\n\nRecebemos o seu relato referente ao protocolo ${ticket.protocol}. Nossa equipe médica e técnica iniciou o acompanhamento com prioridade.\n\nAtenciosamente,\nSAC Procirúrgica`
        });
      }

      const prompt = `Escreva uma resposta formal, empática e profissional em português para enviar ao cliente ${ticket.customerName} sobre o protocolo ${ticket.protocol} (Categoria: ${ticket.category}). Mantenha tom corporativo médico.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return res.json({ suggestedResponse: response.text });
    } catch (err) {
      console.error('Error suggesting response:', err);
      return res.status(500).json({ error: 'Failed to generate suggested response' });
    }
  });

  // Spreadsheet Parser Endpoint
  app.post('/api/import/spreadsheet', (req, res) => {
    try {
      const { rawRows } = req.body; // array of objects or strings
      if (!rawRows || !Array.isArray(rawRows) || rawRows.length > 10_000) {
        return res.status(400).json({ error: 'Invalid rows input' });
      }

      // Group rows by protocol if present
      const groupedMap = new Map();
      rawRows.forEach((row, idx) => {
        const protocolKey = row.protocol || row['Protocolo'] || `SAC.2607.${(idx + 100).toString().padStart(3, '0')}`;
        if (!groupedMap.has(protocolKey)) {
          groupedMap.set(protocolKey, {
            protocol: protocolKey,
            customerName: row.customer || row['Cliente'] || 'Cliente Importado',
            category: row.category || row['Categoria'] || 'Importação de Planilha',
            description: row.description || row['Ocorrência'] || row['Relato'] || 'Sem relato informado',
            status: row.status || row['Status'] || 'TRIAGE',
            items: []
          });
        }
        groupedMap.get(protocolKey).items.push({
          productName: row.product || row['Produto'] || 'Produto Geral',
          quantity: Number(row.quantity || row['Qtd']) || 1,
          serialNumber: row.serial || row['Série'] || '',
          lotNumber: row.lot || row['Lote'] || ''
        });
      });

      const parsedTickets = Array.from(groupedMap.values());
      return res.json({
        totalRowsParsed: rawRows.length,
        totalTicketsGrouped: parsedTickets.length,
        tickets: parsedTickets
      });
    } catch (err) {
      console.error('Spreadsheet import error:', err);
      return res.status(500).json({ error: 'Import failed' });
    }
  });

  // --- VITE MIDDLEWARE (DEV vs PROD) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GRIT SAC 4.0 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
