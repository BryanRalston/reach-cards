// JSON document store: Vercel Blob in production (BLOB_READ_WRITE_TOKEN), local ./.data in dev.
import fs from 'fs/promises';
import path from 'path';
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const DIR = path.join(process.cwd(), '.data');
export async function getDoc(key, fallback) {
  if (!useBlob) { try { return JSON.parse(await fs.readFile(path.join(DIR, key), 'utf8')); } catch { return fallback; } }
  const { get } = await import('@vercel/blob');
  try {
    const r = await get(key, { access: 'private', useCache: false });
    if (!r || !r.stream) return fallback;
    return JSON.parse(await new Response(r.stream).text());
  } catch { return fallback; }
}
export async function putDoc(key, val) {
  const body = JSON.stringify(val, null, 1);
  if (!useBlob) { await fs.mkdir(path.dirname(path.join(DIR, key)), { recursive: true }); await fs.writeFile(path.join(DIR, key), body); return; }
  const { put } = await import('@vercel/blob');
  await put(key, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 0 });
}
