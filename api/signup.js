import { put } from '@vercel/blob';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(b.email || '').trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false });
  const rec = { email, product: String(b.product || '').slice(0, 500), kind: b.kind === 'kit' ? 'kit' : 'scan', at: new Date().toISOString(), ua: (req.headers['user-agent'] || '').slice(0, 200) };
  await put(`signups/${rec.kind}/${Date.now()}.json`, JSON.stringify(rec), { access: 'private', addRandomSuffix: true, contentType: 'application/json' });
  res.status(200).json({ ok: true });
}
