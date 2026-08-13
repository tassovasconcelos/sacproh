import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Scene = {eyebrow: string; title: string; body: string; icon: string};
type Reel = {id: string; hook: string; scenes: Scene[]; cta: string};

export const reelContent: Reel[] = [
  {
    id: 'ReelFluxo',
    hook: 'Como funciona o SAC 4.0?',
    cta: 'Teste grátis por 15 dias',
    scenes: [
      {eyebrow: '1. Entrada', title: 'O cliente abre o chamado', body: 'Todos os dados entram em um único fluxo.', icon: '✉'},
      {eyebrow: '2. Organização', title: 'Classificação automática', body: 'Assunto, prioridade, responsável e prazo definidos.', icon: '✓'},
      {eyebrow: '3. Execução', title: 'A equipe acompanha cada etapa', body: 'Histórico completo, documentos e comunicação centralizada.', icon: '↗'},
      {eyebrow: '4. Resultado', title: 'Gestão em tempo real', body: 'SLA, produtividade e satisfação em uma única visão.', icon: '◫'},
    ],
  },
  {
    id: 'ReelRastreabilidade',
    hook: 'Garantia sem rastreabilidade custa caro.',
    cta: 'Conheça o SAC 4.0',
    scenes: [
      {eyebrow: 'Produto', title: 'Identifique lote e validade', body: 'Registre a origem do atendimento desde o primeiro contato.', icon: '▦'},
      {eyebrow: 'Garantia', title: 'Valide regras e documentos', body: 'Menos dúvida, menos retrabalho e respostas mais rápidas.', icon: '◆'},
      {eyebrow: 'Assistência', title: 'Conecte serviço técnico e logística', body: 'Acompanhe coleta, análise, reparo e devolução.', icon: '↔'},
      {eyebrow: 'Qualidade', title: 'Transforme ocorrências em melhoria', body: 'Encontre padrões e aja sobre a causa do problema.', icon: '◎'},
    ],
  },
  {
    id: 'ReelGestao',
    hook: 'Você sabe onde cada chamado está agora?',
    cta: 'Acesse o link da bio',
    scenes: [
      {eyebrow: 'Controle', title: 'Cada chamado tem um responsável', body: 'Nada fica perdido entre planilhas e mensagens.', icon: '●'},
      {eyebrow: 'Prazo', title: 'O SLA trabalha com a equipe', body: 'Alertas ajudam a agir antes do vencimento.', icon: '◷'},
      {eyebrow: 'Visibilidade', title: 'Indicadores para decidir melhor', body: 'Volume, tempo, pendências e satisfação em tempo real.', icon: '▥'},
      {eyebrow: 'Confiança', title: 'O cliente acompanha a solução', body: 'Mais transparência para fortalecer o relacionamento.', icon: '★'},
    ],
  },
  {
    id: 'ReelInstitucionalGrit',
    hook: 'O que a GRIT resolve?',
    cta: 'Conte seu desafio para a GRIT',
    scenes: [
      {eyebrow: 'Escutar', title: 'Entendemos o seu desafio', body: 'Começamos pelo processo real, pelas pessoas e pelo resultado que o negócio precisa.', icon: '01'},
      {eyebrow: 'Mapear', title: 'Encontramos os pontos de melhoria', body: 'Identificamos gargalos, retrabalho e oportunidades de integração.', icon: '02'},
      {eyebrow: 'Desenvolver', title: 'Criamos a solução certa', body: 'Tecnologia sob medida para simplificar a operação e conectar informações.', icon: '03'},
      {eyebrow: 'Evoluir', title: 'Acompanhamos cada avanço', body: 'Indicadores e evolução contínua para sustentar melhores decisões.', icon: '04'},
    ],
  },
  {
    id: 'ReelProcessosInteligentes',
    hook: 'Seu processo ainda depende de tarefas manuais?',
    cta: 'Fale com a GRIT',
    scenes: [
      {eyebrow: 'Diagnóstico', title: 'Veja onde o tempo se perde', body: 'Planilhas isoladas, mensagens dispersas e tarefas repetidas escondem gargalos.', icon: '01'},
      {eyebrow: 'Integração', title: 'Conecte equipes e dados', body: 'Uma visão compartilhada reduz ruído e acelera a execução.', icon: '02'},
      {eyebrow: 'Automação', title: 'Transforme rotina em fluxo', body: 'Alertas, regras e etapas claras apoiam a equipe no momento certo.', icon: '03'},
      {eyebrow: 'Resultado', title: 'Decida com mais clareza', body: 'Informação organizada para acompanhar prazos, qualidade e desempenho.', icon: '04'},
    ],
  },
];

export const AnimatedReel: React.FC<{reel: Reel}> = ({reel}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sceneIndex = Math.min(reel.scenes.length - 1, Math.floor(frame / 120));
  const local = frame % 120;
  const scene = reel.scenes[sceneIndex];
  const enter = spring({frame: local, fps, config: {damping: 16, stiffness: 110}});
  const exit = interpolate(local, [96, 119], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = enter * exit;
  const translateY = interpolate(enter, [0, 1], [80, 0]);
  const pulse = 1 + Math.sin(frame / 9) * 0.035;

  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 75% 25%, #123e60 0%, #08243A 42%, #031421 100%)', color: 'white', fontFamily: 'Arial, sans-serif', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, opacity: 0.22, backgroundImage: 'linear-gradient(#1f6a90 1px, transparent 1px), linear-gradient(90deg, #1f6a90 1px, transparent 1px)', backgroundSize: '90px 90px', transform: `translateY(${(frame * 0.7) % 90}px)`}} />
      <div style={{position: 'absolute', width: 760, height: 760, right: -250, top: 310, borderRadius: 999, border: '4px solid #FF7A00', opacity: 0.2, transform: `scale(${pulse})`}} />
      <Img src={staticFile('grit-logo.png')} style={{position: 'absolute', top: 90, left: 80, width: 360, height: 180, objectFit: 'contain', objectPosition: 'left center'}} />
      <div style={{position: 'absolute', top: 315, left: 80, right: 80, fontSize: 54, color: '#FF7A00', fontWeight: 800, letterSpacing: 2}}>{scene.eyebrow}</div>
      <div style={{position: 'absolute', top: 430, left: 80, right: 80, opacity, transform: `translateY(${translateY}px)`}}>
        <div style={{fontSize: 105, lineHeight: 1.03, fontWeight: 900, letterSpacing: -4}}>{scene.title}</div>
        <div style={{marginTop: 55, fontSize: 52, lineHeight: 1.25, color: '#dbeaf2', maxWidth: 860}}>{scene.body}</div>
      </div>
      <div style={{position: 'absolute', right: 100, bottom: 420, width: 240, height: 240, borderRadius: 56, background: 'linear-gradient(145deg,#ff9c2b,#FF6A00)', display: 'grid', placeItems: 'center', fontSize: 120, fontWeight: 900, boxShadow: '0 20px 70px #ff7a0066', transform: `scale(${pulse})`}}>{scene.icon}</div>
      <div style={{position: 'absolute', left: 80, right: 80, bottom: 130, borderTop: '2px solid #ffffff33', paddingTop: 35, display: 'flex', justifyContent: 'space-between', fontSize: 42, fontWeight: 700}}>
        <span>{reel.hook}</span><span style={{color: '#FF7A00'}}>{sceneIndex === reel.scenes.length - 1 ? reel.cta : `${sceneIndex + 1}/${reel.scenes.length}`}</span>
      </div>
    </AbsoluteFill>
  );
};
