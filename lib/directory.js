// EmployeeDirectory: LocalDirectory (Blob/file storage, always) + WorkJamDirectory (read sync; write only if enabled).
import { wjConfigured, wjFetch } from './workjam';
export const WorkJamDirectory = {
  configured: () => wjConfigured() && !!process.env.WORKJAM_EMPLOYEES_PATH,
  // Writes are off unless WORKJAM_EMPLOYEES_WRITE=1: WorkJam profiles are usually HRIS-driven (Workday/UKG).
  canWrite: () => process.env.WORKJAM_EMPLOYEES_WRITE === '1',
  async list() {
    const d = await wjFetch('WORKJAM_EMPLOYEES_PATH');
    const rows = Array.isArray(d) ? d : d.items || d.employees || d.content || [];
    // UNVERIFIED field mapping; adjust to WorkJam's real response.
    return rows.map((r) => ({ name: r.name || [r.firstName, r.lastName].filter(Boolean).join(' '), email: r.email || r.workEmail || '', workjamId: String(r.id ?? ''), employeeId: String(r.externalId ?? r.employeeId ?? ''), location: r.location?.name || r.storeName || '' })).filter((r) => r.name);
  },
  async push(emp) { return wjFetch('WORKJAM_EMPLOYEES_PATH', { method: 'POST', body: JSON.stringify({ name: emp.name, email: emp.email, externalId: emp.employeeId || undefined }) }); },
};
