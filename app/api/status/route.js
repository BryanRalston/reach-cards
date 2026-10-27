import { authed, json, emailConfigured } from '@/lib/core';
import { WorkJamNotifier, notifiers } from '@/lib/notify';
import { WorkJamDirectory } from '@/lib/directory';
export async function GET(req) {
  return json({ backend: true, authed: await authed(req), email: emailConfigured(), workjamNotify: WorkJamNotifier.configured(), workjamDirectory: WorkJamDirectory.configured(), workjamWrite: WorkJamDirectory.configured() && WorkJamDirectory.canWrite(), senders: notifiers().map((n) => n.name), dryRun: process.env.EMAIL_DRY_RUN === '1', storage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local-file' });
}
