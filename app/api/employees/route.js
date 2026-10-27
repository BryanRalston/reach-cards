import crypto from 'crypto';
import { authed, deny, json, EMAIL_RE } from '@/lib/core';
import { getDoc, putDoc } from '@/lib/store';
export async function GET(req) { if (!(await authed(req))) return deny(); return json(await getDoc('employees.json', [])); }
// POST {employees:[{name,email}]} -> upsert by email (case-insensitive)
export async function POST(req) {
  if (!(await authed(req))) return deny();
  const { employees = [] } = await req.json();
  const list = await getDoc('employees.json', []);
  const byEmail = new Map(list.map((e) => [e.email.toLowerCase(), e]));
  let added = 0, updated = 0; const invalid = [];
  for (const raw of employees) {
    const name = String(raw.name || '').trim().slice(0, 60), email = String(raw.email || '').trim().toLowerCase();
    if (!name || !EMAIL_RE.test(email)) { invalid.push(raw); continue; }
    const ex = byEmail.get(email);
    const extra = {}; for (const k of ['workjamId', 'employeeId', 'location']) if (raw[k]) extra[k] = String(raw[k]).slice(0, 80);
    if (ex) { if (ex.name !== name || Object.entries(extra).some(([k, v]) => ex[k] !== v)) { Object.assign(ex, { name }, extra); updated++; } }
    else { const e = { id: crypto.randomUUID(), name, email, ...extra, addedAt: new Date().toISOString() }; list.push(e); byEmail.set(email, e); added++; }
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  await putDoc('employees.json', list);
  return json({ added, updated, invalid, total: list.length });
}
export async function DELETE(req) {
  if (!(await authed(req))) return deny();
  const { id } = await req.json();
  const list = (await getDoc('employees.json', [])).filter((e) => e.id !== id);
  await putDoc('employees.json', list); return json({ total: list.length });
}
