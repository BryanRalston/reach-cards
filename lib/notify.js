// Notifier interface: { name, configured(), sendCard(emp, card, png), sendWinner(emp, category, month) } -> {ok, ...}
// Selection: NOTIFIER=workjam|email (default auto: workjam if configured, else email). WorkJam failures fall back to email.
import { sendEmail, emailConfigured, esc } from './core';
import { wjConfigured, wjFetch } from './workjam';
const label = (m) => new Date(m + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
export const EmailNotifier = {
  name: 'email', configured: emailConfigured,
  sendCard(emp, b, png) {
    const why = b.cardType === 'prize' && b.why ? `<p><i>“${esc(b.why)}”</i></p>` : '';
    return sendEmail({ to: emp.email,
      subject: b.cardType === 'prize' ? `You received a REACH card for ${b.category}!` : `Congratulations from ${b.from || 'your team'} – REACH ${b.category}`,
      text: `Hi ${emp.name}, you received a REACH recognition card for ${b.category} from ${b.from || 'your team'}.${b.why ? ' Why: ' + b.why : ''} You've been entered into this month's ${b.category} prize drawing. Your card is attached.`,
      html: `<p>Hi ${esc(emp.name)},</p><p>You received a <b>REACH recognition card</b> for <b>${esc(b.category)}</b> from ${esc(b.from || 'your team')}.</p>${why}<p><img src="cid:reachcard" alt="Your REACH card" width="525" style="max-width:100%;border:1px solid #ddd"></p><p>You've been entered into this month's <b>${esc(b.category)}</b> prize drawing. Thank you!</p>`,
      attachments: [{ filename: `REACH-card-${emp.name.replace(/\W+/g, '-')}.png`, content: png, content_type: 'image/png', content_id: 'reachcard' }] });
  },
  sendWinner(emp, cat, month) {
    return sendEmail({ to: emp.email, subject: `You won the ${label(month)} REACH raffle – ${cat}!`,
      text: `Congratulations ${emp.name}! You won the ${label(month)} REACH monthly raffle in the ${cat} category.`,
      html: `<p>Congratulations <b>${esc(emp.name)}</b>!</p><p>You won the <b>${label(month)} REACH monthly raffle</b> in the <b>${esc(cat)}</b> category.</p><p>Thank you for living our REACH values!</p>` });
  },
};
// UNVERIFIED: posts a generic JSON message to WORKJAM_NOTIFY_PATH. Payload shape must be adjusted to WorkJam's real API.
export const WorkJamNotifier = {
  name: 'workjam', configured: () => wjConfigured() && !!process.env.WORKJAM_NOTIFY_PATH,
  async send(emp, title, body, png) {
    const recipient = emp.workjamId || emp.employeeId;
    if (!recipient) return { ok: false, error: 'employee has no workjamId/employeeId' };
    try { const d = await wjFetch('WORKJAM_NOTIFY_PATH', { method: 'POST', body: JSON.stringify({ recipients: [{ id: recipient, idType: emp.workjamId ? 'workjam' : 'external' }], title, body, imagePngBase64: png || undefined }) }); return { ok: true, id: d.id }; }
    catch (e) { return { ok: false, error: e.message }; }
  },
  sendCard(emp, b, png) { return this.send(emp, `REACH card: ${b.category}`, `${b.from || 'Your team'} recognized you for ${b.category}.${b.why ? ' ' + b.why : ''} You're entered in this month's ${b.category} drawing.`, png); },
  sendWinner(emp, cat, month) { return this.send(emp, 'You won the REACH raffle!', `You won the ${label(month)} REACH raffle in ${cat}.`); },
};
export function notifiers() {
  const pref = process.env.NOTIFIER || 'auto';
  const list = [];
  if ((pref === 'auto' || pref === 'workjam') && WorkJamNotifier.configured()) list.push(WorkJamNotifier);
  if (EmailNotifier.configured()) list.push(EmailNotifier);
  return list;
}
export async function notify(method, ...args) {
  const list = notifiers(); if (!list.length) return { ok: false, notConfigured: true, error: 'No notifier configured (WorkJam or email)' };
  const tried = [];
  for (const n of list) { const r = await n[method](...args); if (r.ok) return { ...r, via: n.name, tried }; tried.push({ via: n.name, error: r.error }); }
  return { ok: false, error: tried.map((t) => `${t.via}: ${t.error}`).join('; '), tried };
}
