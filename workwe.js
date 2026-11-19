// Cloudflare Worker — يحمل مفتاح Dify سرّاً ولا يظهر للزوار
// الإعدادات (Settings > Variables and Secrets):
//   DIFY_KEY        (Secret)  = مفتاح Dify
//   ALLOWED_ORIGIN  (Text)    = رابط موقعك مثل https://muhkam.example.com
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN)
      return new Response(JSON.stringify({ message: 'غير مصرّح' }), { status: 403, headers: cors });

    let body;
    try { body = await req.json(); } catch { return json({ message: 'طلب غير صالح' }, 400, cors); }
    const role = String(body.user_role || '').slice(0, 50);
    const text = String(body.contract_text || '');
    if (!text.trim()) return json({ message: 'نص العقد فارغ' }, 400, cors);
    if (text.length > 30000) return json({ message: 'النص طويل جداً' }, 413, cors);

    const r = await fetch('https://api.dify.ai/v1/workflows/run', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.DIFY_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: { user_role: role, contract_text: text },
        response_mode: 'blocking',
        user: 'muhkam-user',
      }),
    });
    return new Response(await r.text(), {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  },
};
const json = (o, status, cors) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
