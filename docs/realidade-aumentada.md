# Realidade aumentada (pratos em 3D na mesa)

Recurso exclusivo do plano Pro. O lojista envia até 4 fotos do prato (frente
obrigatória; esquerda, trás e direita opcionais), informa a largura real em
cm, e a IA da Tripo3D gera um modelo 3D (`.glb`). O lojista revisa no painel
e só então publica — o cliente vê o prato girando no cardápio e, no celular,
abre a câmera com "Ver na sua mesa" (Scene Viewer no Android, Quick Look no
iPhone).

## Ligar o recurso

1. Conta em https://platform.tripo3d.ai → API Keys → gerar chave (`tsk_...`).
2. `.env.local` e Vercel (Production + Preview):
   - `TRIPO_API_KEY=tsk_...` — sem ela, a seção no painel mostra
     "temporariamente indisponível" e a rota de geração responde 503.
   - `AR_MONTHLY_LIMIT=10` (opcional; padrão 10 gerações/loja/mês).
3. Migração `docs/migracao-realidade-aumentada.sql` aplicada (já aplicada no
   projeto cardapio-agil em 10/11/2026).

## Custo e cota

Cada geração consome créditos da Tripo (~US$ 0,20–0,30 com textura PBR).
A cota mensal conta TODAS as gerações que não falharam: em andamento e
descartadas incluídas (o crédito já foi gasto). Falha na IA devolve a cota.
A contagem é feita por linhas de `ar_generations` no mês corrente.

## Peças

- `lib/ar/config.js` — cota, vistas, gate por env.
- `lib/ar/tripo.js` — cliente da API (task multiview + consulta). A URL do
  `.glb` que a Tripo devolve expira em ~5 min.
- `lib/ar/glb.js` — pós-processamento: descomprime meshopt, escala para o
  tamanho real (é isso que faz o prato aparecer na mesa no tamanho certo),
  apoia no chão e comprime texturas para JPEG 1024.
- `POST /api/ar/generate` — gates no servidor (dono, Pro, cota, frente
  obrigatória, fotos só do nosso Storage) e dispara a task.
- `GET /api/ar/status?id=` — polling; no sucesso baixa o `.glb` dentro da
  janela de 5 min, processa e grava em `store-assets/<loja>/ar/*.glb`.
- `app/dashboard/cardapio/ar-actions.js` — publicar / descartar / tirar do ar.
- `app/dashboard/cardapio/[id]/ArSection.jsx` — UI no painel.
- `app/loja/[slug]/ArProductViewer.jsx` — visor no cardápio público (portado
  da demo de vendas): folha de dicas, escape de navegador de app
  (Instagram/WhatsApp), aviso de ARCore e QR no desktop (`#p=<produto>` abre
  o produto direto).

## Banco

- `products.ar_model_url` + `products.ar_size_cm` — só o modelo PUBLICADO.
- `ar_generations` — pipeline e base da cota (RLS: só o dono da loja).

## Se der problema

- Modelo não abre no cardápio: confira se a URL responde e é `.glb` público.
- "A câmera em 3D não abriu" no Android: falta/atualização do ARCore — a
  folha do próprio cardápio orienta o cliente.
- Geração presa em "processing": o fechamento acontece no GET /status (o
  painel aberto faz o polling). Abrir a página do produto no painel resolve.
