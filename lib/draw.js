import crypto from 'crypto';
import { getDoc, putDoc } from './store';
import { CATEGORIES } from './core';
import { notify } from './notify';
// One winner per category. mode 'per-card': every card = one entry (more cards, more chances).
// mode 'per-person': each employee counted once per category. Uses crypto.randomInt (CSPRNG, unbiased).
export async function runDraw(month, mode = 'per-card', by = 'manual') {
  const entries = await getDoc(`entries/${month}.json`, []);
  const results = {};
  for (const cat of CATEGORIES) {
    let pool = entries.filter((e) => e.category === cat);
    if (mode === 'per-person') { const seen = new Set(); pool = pool.filter((e) => { const k = e.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); }
    if (!pool.length) { results[cat] = { winner: null, poolSize: 0, pool: [] }; continue; }
    const idx = crypto.randomInt(pool.length);
    results[cat] = { winner: { name: pool[idx].name, email: pool[idx].email, entryId: pool[idx].id }, index: idx, poolSize: pool.length, pool: pool.map((e) => ({ id: e.id, name: e.name, email: e.email, cardType: e.cardType, date: e.date, from: e.from })) };
  }
  const draw = { month, mode, by, drawnAt: new Date().toISOString(), rng: 'node crypto.randomInt', status: 'pending', results, notifications: {} };
  const hist = await getDoc(`draws/${month}.json`, []);
  hist.push(draw); await putDoc(`draws/${month}.json`, hist);
  return draw;
}
export async function confirmDraw(month) {
  const hist = await getDoc(`draws/${month}.json`, []);
  const draw = hist[hist.length - 1];
  if (!draw) throw new Error('No draw for ' + month);
  if (draw.status === 'confirmed') return draw;
  const emps = await getDoc('employees.json', []);
  for (const [cat, r] of Object.entries(draw.results)) {
    if (!r.winner) continue;
    const emp = emps.find((e) => e.email.toLowerCase() === r.winner.email.toLowerCase()) || r.winner;
    draw.notifications[cat] = await notify('sendWinner', emp, cat, month);
  }
  draw.status = 'confirmed'; draw.confirmedAt = new Date().toISOString();
  await putDoc(`draws/${month}.json`, hist);
  return draw;
}
export function winnersSummary(d) {
  return Object.entries(d.results).map(([c, r]) => `${c}: ${r.winner ? `${r.winner.name} <${r.winner.email}> (1 of ${r.poolSize} entries)` : 'no entries'}${d.notifications[c] ? (d.notifications[c].ok ? ' – emailed' : ' – NOT emailed: ' + d.notifications[c].error) : ''}`).join('\n');
}
