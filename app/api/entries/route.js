import { authed, deny, json, monthOf } from '@/lib/core';
import { getDoc, putDoc } from '@/lib/store';
export async function GET(req) {
  if (!(await authed(req))) return deny();
  const m = new URL(req.url).searchParams.get('month') || monthOf();
  return json({ month: m, entries: await getDoc(`entries/${m}.json`, []), draws: await getDoc(`draws/${m}.json`, []) });
}
export async function DELETE(req) {
  if (!(await authed(req))) return deny();
  const { month, id } = await req.json();
  const e = (await getDoc(`entries/${month}.json`, [])).filter((x) => x.id !== id);
  await putDoc(`entries/${month}.json`, e); return json({ ok: true });
}
