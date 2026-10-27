import { json, priorMonth, sendEmail, esc } from '@/lib/core';
import { runDraw, confirmDraw, winnersSummary } from '@/lib/draw';
import { getDoc } from '@/lib/store';
// Vercel cron: 1st of each month. Draws prior month (if not already confirmed), emails winners + Bryan.
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: 'unauthorized' }, 401);
  const month = priorMonth();
  const hist = await getDoc(`draws/${month}.json`, []);
  if (hist.some((d) => d.status === 'confirmed')) return json({ skipped: 'already drawn', month });
  const settings = await getDoc('settings.json', {});
  await runDraw(month, settings.mode === 'per-person' ? 'per-person' : 'per-card', 'cron');
  const d = await confirmDraw(month);
  const summary = winnersSummary(d);
  if (process.env.ADMIN_EMAIL) d.adminEmail = await sendEmail({ to: process.env.ADMIN_EMAIL, subject: `REACH raffle winners – ${month}`, text: summary, html: `<pre>${esc(summary)}</pre>` });
  return json({ month, summary });
}
