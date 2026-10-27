import { authed, deny, json } from '@/lib/core';
import { runDraw, confirmDraw } from '@/lib/draw';
// POST {month, mode, action:'preview'|'confirm'}  preview = draw + save (no emails); confirm = email winners of latest draw
export async function POST(req) {
  if (!(await authed(req))) return deny();
  const { month, mode, action } = await req.json();
  if (!/^\d{4}-\d{2}$/.test(month || '')) return json({ error: 'Bad month' }, 400);
  try { return json(action === 'confirm' ? await confirmDraw(month) : await runDraw(month, mode === 'per-person' ? 'per-person' : 'per-card', 'manual')); }
  catch (e) { return json({ error: e.message }, 400); }
}
