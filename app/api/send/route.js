import crypto from 'crypto';
import { authed, deny, json, CATEGORIES, monthOf } from '@/lib/core';
import { getDoc, putDoc } from '@/lib/store';
import { notify, notifiers } from '@/lib/notify';
// POST {employeeId, cardType, category, why, from, date, png(dataURL), recordOnly}
export async function POST(req) {
  if (!(await authed(req))) return deny();
  const b = await req.json();
  const emp = (await getDoc('employees.json', [])).find((e) => e.id === b.employeeId);
  if (!emp) return json({ error: 'Pick an employee from the list' }, 400);
  if (!CATEGORIES.includes(b.category)) return json({ error: 'Bad category' }, 400);
  if (!['prize', 'congrats'].includes(b.cardType)) return json({ error: 'Bad card type' }, 400);
  b.why = String(b.why || '').slice(0, 220); b.from = String(b.from || '').slice(0, 40);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : new Date().toISOString().slice(0, 10);
  let mail = { ok: false, skipped: true };
  if (!b.recordOnly) {
    if (!notifiers().length) return json({ error: 'Sender not configured yet (no WorkJam or email credentials). Use "Record without sending".' }, 503);
    const png = String(b.png || '').replace(/^data:image\/png;base64,/, '');
    if (!png || png.length > 4_000_000) return json({ error: 'Card image missing or too large' }, 400);
    mail = await notify('sendCard', emp, b, png);
    if (!mail.ok) return json({ error: 'Send failed: ' + mail.error }, 502);
  }
  const month = monthOf(date);
  const entry = { id: crypto.randomUUID(), employeeId: emp.id, name: emp.name, email: emp.email, category: b.category, cardType: b.cardType, why: b.why, from: b.from, date, createdAt: new Date().toISOString(), sent: !!mail.ok, via: mail.via || null, dryRun: !!mail.dryRun };
  const entries = await getDoc(`entries/${month}.json`, []); entries.push(entry); await putDoc(`entries/${month}.json`, entries);
  return json({ ok: true, entry, mail });
}
