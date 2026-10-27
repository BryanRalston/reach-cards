import { authed, deny, json } from '@/lib/core';
import { WorkJamDirectory } from '@/lib/directory';
// GET -> WorkJam employee list for search/pick + sync. POST {name,email,employeeId} -> push (only if write enabled).
export async function GET(req) {
  if (!(await authed(req))) return deny();
  if (!WorkJamDirectory.configured()) return json({ error: 'WorkJam directory not configured' }, 503);
  try { return json({ employees: await WorkJamDirectory.list() }); } catch (e) { return json({ error: e.message }, 502); }
}
export async function POST(req) {
  if (!(await authed(req))) return deny();
  if (!WorkJamDirectory.configured() || !WorkJamDirectory.canWrite()) return json({ error: 'Writing to WorkJam is disabled' }, 403);
  try { return json(await WorkJamDirectory.push(await req.json())); } catch (e) { return json({ error: e.message }, 502); }
}
