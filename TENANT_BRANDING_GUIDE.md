# Identidade visual por cliente

## Configuração

Administradores acessam **Configurações → Marca & Documentos** para enviar o logo, escolher as cores principal, secundária, de destaque e de texto, definir o rodapé e decidir se a assinatura do SAC 4.0 aparece nos documentos.

O logo aceita PNG, JPG ou WebP de até 2 MB. Recomenda-se imagem horizontal, com fundo transparente, boa margem interna e resolução suficiente para impressão. As cores usam hexadecimal completo, por exemplo `#145EDB`.

## Segurança e isolamento

- Cada configuração pertence a um único tenant.
- Somente `SUPERADMIN` e `ADMIN_EMPRESA` do próprio tenant podem alterar a identidade.
- Os arquivos ficam em pastas separadas pelo identificador do tenant.
- O bucket aceita somente os formatos permitidos e limita o arquivo a 2 MB.
- O logo é público para permitir sua renderização em documentos e impressões; portanto, não deve conter informação confidencial.

## Aplicação nos documentos

O componente central de documentos aplica logo, razão/nome comercial, CNPJ, título, referência, cores e rodapé. Ele já está ligado ao relatório gerencial e à ordem de serviço. Propostas, laudos, comprovantes, termos de atendimento e novos documentos devem reutilizar `BrandedDocumentHeader` e `BrandedDocumentFooter`, evitando logos ou cores fixas no código.

## Homologação

1. Salvar marcas diferentes em dois tenants de teste.
2. Confirmar que cada administrador visualiza e altera somente sua empresa.
3. Testar formatos e arquivos acima de 2 MB e confirmar o bloqueio.
4. Imprimir relatório e OS em PDF, verificando logo, cores, contraste e rodapé.
5. Testar sem logo e confirmar o monograma de fallback.
6. Validar impressão colorida e monocromática, desktop e navegador móvel.
