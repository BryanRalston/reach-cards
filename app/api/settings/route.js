import { authed, deny, json } from '@/lib/core';
import { getDoc, putDoc } from '@/lib/store';
export async function GET(req) { if (!(await authed(req))) return deny(); return json(await getDoc('settings.json', { mode: 'per-card' })); }
export async function POST(req) { if (!(await authed(req))) return deny(); const { mode } = await req.json(); const s = { mode: mode === 'per-person' ? 'per-person' : 'per-card' }; await putDoc('settings.json', s); return json(s); }
