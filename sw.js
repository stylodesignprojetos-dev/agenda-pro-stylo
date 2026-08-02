/* ══════════════════════════════════════════════════════════════
   ADICIONAR ao seu Worker existente (agenda-pro-proxy)
   Cria os endpoints /caixa (GET e POST) que guardam o financeiro
   (C.A.I.X.A. PRO) numa "gaveta" separada usando o Cloudflare KV —
   isso resolve o erro 500 que vinha do JSONBin estourando 1MB.

   COMO INSTALAR:

   1) Criar o KV Namespace (só uma vez):
      Dashboard da Cloudflare → Workers & Pages → KV → "Create a namespace"
      Nome sugerido: AGENDA_CAIXA_PRO → Criar

   2) Vincular ao Worker:
      Abra seu Worker (agenda-pro-proxy) → aba "Settings" → "Variables"
      → seção "KV Namespace Bindings" → "Add binding"
        Variable name:  CAIXA_KV
        KV namespace:   AGENDA_CAIXA_PRO (a que você criou no passo 1)
      Salva.

   3) Colar este código:
      Vai em "Edit Code" e adiciona o tratamento das rotas /caixa dentro
      do seu `fetch` que já existe. NÃO cole um segundo `export default`
      — só adiciona esse trecho de rota dentro do handler que já roda
      hoje, ANTES de tratar a rota /dados. Exemplo de como deve ficar:

        export default {
          async fetch(request, env, ctx) {
            const url = new URL(request.url);

            // CORS preflight (se seu Worker já trata isso em outro lugar,
            // não precisa duplicar — só garanta que /caixa também responde
            // a OPTIONS com os mesmos headers que o resto do seu Worker usa)
            if (request.method === 'OPTIONS') {
              return new Response(null, { headers: CORS_HEADERS });
            }

            if (url.pathname === '/caixa') {
              return tratarRotaCaixa(request, url, env);
            }

            // ... o resto do seu código atual (rota /dados, /ia, etc) continua aqui ...
          },
          async scheduled(event, env, ctx) {
            // se você já colou o worker-adicionar-lembretes.js, o conteúdo
            // dele entra aqui também
          }
        };

   4) Cola as funções abaixo soltas no arquivo (fora do export default),
      igual já fez com o worker-adicionar-lembretes.js.
   ══════════════════════════════════════════════════════════════ */

// Se seu Worker já tem uma constante de CORS com outro nome, reutiliza ela
// no lugar dessa — o importante é que /caixa responda com os mesmos headers
// de CORS que o resto do seu Worker já usa, pra o navegador não bloquear.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function tratarRotaCaixa(request, url, env) {
  if (request.method === 'GET') {
    const email = url.searchParams.get('email');
    if (!email) {
      return new Response(JSON.stringify({ erro: 'email obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    const salvo = await env.CAIXA_KV.get(`caixa:${email}`);
    return new Response(salvo || 'null', {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (!body.email || !body.state) {
        return new Response(JSON.stringify({ erro: 'email e state obrigatórios' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
      await env.CAIXA_KV.put(`caixa:${body.email}`, JSON.stringify(body.state));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    } catch (e) {
      return new Response(JSON.stringify({ erro: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }

  return new Response('Método não permitido', { status: 405, headers: CORS_HEADERS });
}
