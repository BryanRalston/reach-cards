import crypto from 'crypto';
import { cookies } from 'next/headers';
import { authToken, json } from '@/lib/core';
export async function POST(req) {
  const { passcode } = await req.json().catch(() => ({}));
  const p = process.env.ADMIN_PASSCODE;
  if (!p) return json({ error: 'ADMIN_PASSCODE not set on server' }, 500);
  const a = crypto.createHash('sha256').update(String(passcode || '')).digest(), b = crypto.createHash('sha256').update(p).digest();
  if (!crypto.timingSafeEqual(a, b)) { await new Promise((r) => setTimeout(r, 800)); return json({ error: 'Wrong passcode' }, 401); }
  (await cookies()).set('reach_auth', authToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return json({ ok: true });
}
export async function DELETE() { (await cookies()).delete('reach_auth'); return json({ ok: true }); }
