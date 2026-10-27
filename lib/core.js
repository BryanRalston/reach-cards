import crypto from 'crypto';
import { cookies } from 'next/headers';
export const CATEGORIES = ['Customer Engagement', 'Connection', 'Caring', 'Empowerment', 'Coaching'];
export const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const tok = () => crypto.createHmac('sha256', process.env.ADMIN_PASSCODE || '').update('reach-admin').digest('hex');
export async function authed(req) {
  if (!process.env.ADMIN_PASSCODE) return false;
  const c = (await cookies()).get('reach_auth')?.value;
  return !!c && c.length === tok().length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(tok()));
}
export const authToken = tok;
export const json = (d, s = 200) => Response.json(d, { status: s });
export const deny = () => json({ error: 'Not signed in' }, 401);
export const monthOf = (d) => (d || new Date().toISOString()).slice(0, 7);
export function priorMonth(now = new Date()) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)); return d.toISOString().slice(0, 7); }
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- email (Resend). Not configured => never sends. ----
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!emailConfigured()) return { ok: false, notConfigured: true, error: 'Email not configured (set RESEND_API_KEY and EMAIL_FROM)' };
  if (process.env.EMAIL_DRY_RUN === '1') return { ok: true, dryRun: true };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text, attachments, reply_to: process.env.ADMIN_EMAIL || undefined }) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: d.id } : { ok: false, error: d.message || `Resend HTTP ${r.status}` };
}
