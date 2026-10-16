import { put } from '@vercel/blob';
import { createHash } from 'node:crypto';

const hits = new Map(); // best-effort per-instance rate limit
function limited(ip) {
  const now = Date.now(), w = 60_000, max = 6;
  const a = (hits.get(ip) || []).filter(t => now - t < w);
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > max;
}
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return res.status(415).json({ ok: false });
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ ok: false });
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: pretend success
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ ok: false });
  const raw = String(b.email ?? '').trim();
  if (raw.length > 254 || !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(raw)) return res.status(400).json({ ok: false });
  const email = raw.toLowerCase();
  let product = clean(b.product, 500);
  if (product && !/^https?:\/\//i.test(product)) product = '';
  const kind = b.kind === 'kit' ? 'kit' : 'scan';
  const rec = { email, product, kind, at: new Date().toISOString() };
  const id = createHash('sha256').update(kind + ':' + email).digest('hex').slice(0, 24);
  // One record per email + kind; a repeat signup keeps the first record (and its URL) untouched.
  try {
    await put(`signups/${kind}/${id}.json`, JSON.stringify(rec), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' });
  } catch (e) {
    if (!/already exists/i.test(String(e?.message))) { console.error('blob put failed', e?.message); return res.status(500).json({ ok: false }); }
  }
  res.status(200).json({ ok: true });
}
