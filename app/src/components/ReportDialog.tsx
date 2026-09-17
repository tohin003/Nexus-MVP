import { useState } from 'react';
import type { Report } from '../domain/types';
import { useActions, useMe } from '../repo/store';
import { Modal } from './Modal';
export function ReportDialog({ open, onClose, targetKind, targetId, targetLabel }: { open: boolean; onClose: () => void; targetKind: Report['targetKind']; targetId: string; targetLabel?: string }) {
  const actions = useActions(); const me = useMe();
  const [reason, setReason] = useState('Spam or misleading content'); const [detail, setDetail] = useState(''); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  return <Modal open={open} onClose={() => { setSent(false); setError(''); onClose(); }} title={sent ? 'Report received' : `Report ${targetLabel ?? targetKind}`}>
    {sent ? <div><p className="text-sm">Thank you. Your report is saved for review. The reported person will not see your identity.</p><button className="btn btn-primary w-full mt-4" onClick={() => { setSent(false); onClose(); }}>Done</button></div> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); try { actions.reports.file(targetKind, targetId, reason, detail); setSent(true); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit report. Try again.'); } }}>
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>Help keep NEXUS a useful, respectful space.</p>
      <label className="block text-sm">Reason<select className="input mt-2" value={reason} onChange={e => setReason(e.target.value)}>{['Spam or misleading content', 'Harassment or abuse', 'Unsafe or inappropriate content', 'Impersonation', 'Other'].map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="block text-sm">Details (optional)<textarea className="input mt-2" maxLength={5000} rows={3} value={detail} onChange={e => setDetail(e.target.value)} /></label>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button className="btn btn-danger w-full" disabled={me?.suspended}>Submit report</button>
    </form>}
  </Modal>;
}
export default ReportDialog;
