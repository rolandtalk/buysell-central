/**
 * Proxy /api/* to sctr-railway-api on Railway. Avoids CORS when the app is served from Cloudflare Pages.
 */
const RAILWAY_API = 'https://web-production-1b15c.up.railway.app';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const upstream = RAILWAY_API + url.pathname + url.search;
  const headers = new Headers(context.request.headers);
  headers.delete('Host');
  try {
    const res = await fetch(upstream, {
      method: context.request.method,
      headers,
      body: context.request.method !== 'GET' && context.request.method !== 'HEAD' ? context.request.body : undefined,
    });
    const resHeaders = new Headers(res.headers);
    resHeaders.set('Access-Control-Allow-Origin', url.origin);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response('Proxy error: ' + (err.message || String(err)), {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
