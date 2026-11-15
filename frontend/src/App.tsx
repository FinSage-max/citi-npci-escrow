import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEscrow,
  getEscrowHistory,
  listEscrows,
  refundEscrow,
  settleEscrow,
} from './api';
import type { EscrowTx, HistoryRecord } from './types';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function statusClass(status: string): string {
  if (status === 'LOCKED') return 'bg-amber-100 text-amber-800 ring-amber-200';
  if (status === 'SETTLED') return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  return 'bg-rose-100 text-rose-800 ring-rose-200';
}

export default function App() {
  const [escrows, setEscrows] = useState<EscrowTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [senderOrg, setSenderOrg] = useState('Citi Corporate');
  const [receiverOrg, setReceiverOrg] = useState('Merchant / Beneficiary');
  const [amount, setAmount] = useState('1500000');
  const [condition, setCondition] = useState('DELIVERY_VERIFIED');

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const data = await listEscrows();
    setEscrows(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const lockedTotal = useMemo(
    () => escrows.filter((e) => e.Status === 'LOCKED').reduce((sum, e) => sum + Number(e.Amount || 0), 0),
    [escrows],
  );

  const settledTotal = useMemo(
    () => escrows.filter((e) => e.Status === 'SETTLED').reduce((sum, e) => sum + Number(e.Amount || 0), 0),
    [escrows],
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusyId('create');
    try {
      const escrowId = `ESC-${Date.now().toString().slice(-6)}`;
      await createEscrow({
        escrowId,
        senderOrg,
        receiverOrg,
        amount: Number(amount),
        condition,
      });
      setNotice(`Locked ${escrowId} on Drunix`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onSettle(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await settleEscrow(id);
      setNotice(`Settled ${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onRefund(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await refundEscrow(id);
      setNotice(`Refunded ${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function openAudit(id: string) {
    setAuditId(id);
    setAuditOpen(true);
    setAuditLoading(true);
    setHistory([]);
    try {
      const records = await getEscrowHistory(id);
      setHistory(Array.isArray(records) ? records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-ink-950">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="animate-rise mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-ink-700">
              Programmable Escrow PoC
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Citi × NPCI
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-700/80">
              Instant settlement escrow on NPCI Drunix — lock corporate liquidity,
              endorse release conditions, and reconcile immutable SQL ledger history.
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-ink-900 px-5 py-4 text-sand-50 shadow-panel">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-mint-400 animate-pulse-soft" />
              Drunix channel live
            </div>
            <p className="mt-1 text-xs text-sand-200">mychannel · chaincode escrow · Org1MSP gateway</p>
          </div>
        </header>

        <section className="animate-rise mb-8 grid gap-4 md:grid-cols-3" style={{ animationDelay: '80ms' }}>
          <SummaryCard label="Total Locked Liquidity" value={inr.format(lockedTotal)} hint="Funds held in LOCKED escrows" />
          <SummaryCard label="Total Settled Volume" value={inr.format(settledTotal)} hint="Released to merchant beneficiaries" />
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-panel backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700/70">Active Endorsement Nodes</p>
            <div className="mt-4 space-y-3">
              <NodeRow org="Org1: Citi" role="Issuing bank / gateway peer" />
              <NodeRow org="Org2: NPCI" role="Clearing rails / endorsement" />
            </div>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={`animate-rise mb-6 rounded-2xl px-4 py-3 text-sm ${
              error ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200' : 'bg-mint-300/20 text-ink-800 ring-1 ring-mint-300/50'
            }`}
          >
            {error || notice}
          </div>
        )}

        <section className="animate-rise mb-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" style={{ animationDelay: '140ms' }}>
          <form onSubmit={onCreate} className="rounded-3xl border border-sand-200 bg-white/85 p-6 shadow-panel backdrop-blur">
            <h2 className="font-display text-2xl font-semibold text-ink-900">Initiate Transfer / Escrow</h2>
            <p className="mt-1 text-sm text-ink-700/70">Lock INR liquidity against a release condition on Drunix.</p>

            <div className="mt-6 space-y-4">
              <Field label="Sender (Citi Corporate)">
                <input
                  className="field"
                  value={senderOrg}
                  onChange={(e) => setSenderOrg(e.target.value)}
                  required
                />
              </Field>
              <Field label="Receiver (Merchant / Beneficiary)">
                <input
                  className="field"
                  value={receiverOrg}
                  onChange={(e) => setReceiverOrg(e.target.value)}
                  required
                />
              </Field>
              <Field label="Amount (INR)">
                <input
                  className="field"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
              <Field label="Release Condition">
                <select
                  className="field"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="DELIVERY_VERIFIED">DELIVERY_VERIFIED</option>
                  <option value="INVOICE_APPROVED">INVOICE_APPROVED</option>
                  <option value="KYC_CLEARED">KYC_CLEARED</option>
                  <option value="SLA_MET">SLA_MET</option>
                </select>
              </Field>
            </div>

            <button
              type="submit"
              disabled={busyId === 'create'}
              className="mt-6 w-full rounded-2xl bg-ink-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:opacity-60"
            >
              {busyId === 'create' ? 'Submitting to Drunix…' : 'Lock Funds on Drunix'}
            </button>
          </form>

          <div className="rounded-3xl border border-sand-200 bg-white/85 p-6 shadow-panel backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink-900">Live Ledger</h2>
                <p className="mt-1 text-sm text-ink-700/70">Immutable escrow state on mychannel</p>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-xl border border-sand-200 px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-sand-50"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-ink-700/70">Loading ledger…</p>
            ) : escrows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-700/70">No escrows yet. Lock funds to seed the ledger.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-sand-200 text-xs uppercase tracking-wide text-ink-700/60">
                    <tr>
                      <th className="px-2 py-3 font-semibold">Escrow</th>
                      <th className="px-2 py-3 font-semibold">Parties</th>
                      <th className="px-2 py-3 font-semibold">Amount</th>
                      <th className="px-2 py-3 font-semibold">Status</th>
                      <th className="px-2 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escrows.map((escrow) => (
                      <tr key={escrow.EscrowID} className="border-b border-sand-100 align-top">
                        <td className="px-2 py-4">
                          <div className="font-semibold text-ink-900">{escrow.EscrowID}</div>
                          <div className="mt-1 text-xs text-ink-700/60">{escrow.Condition}</div>
                        </td>
                        <td className="px-2 py-4">
                          <div>{escrow.SenderOrg}</div>
                          <div className="text-xs text-ink-700/60">→ {escrow.ReceiverOrg}</div>
                        </td>
                        <td className="px-2 py-4 font-medium">{inr.format(Number(escrow.Amount || 0))}</td>
                        <td className="px-2 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(escrow.Status)}`}>
                            {escrow.Status}
                          </span>
                        </td>
                        <td className="px-2 py-4">
                          <div className="flex flex-wrap gap-2">
                            {escrow.Status === 'LOCKED' && (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === escrow.EscrowID}
                                  onClick={() => void onSettle(escrow.EscrowID)}
                                  className="rounded-lg bg-mint-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-mint-400 disabled:opacity-60"
                                >
                                  Settle
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === escrow.EscrowID}
                                  onClick={() => void onRefund(escrow.EscrowID)}
                                  className="rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-ink-700 disabled:opacity-60"
                                >
                                  Refund
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => void openAudit(escrow.EscrowID)}
                              className="rounded-lg border border-sand-200 px-2.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-sand-50"
                            >
                              Audit Trail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {auditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-sand-50 p-6 shadow-panel animate-rise">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-700/60">Audit & Reconciliation</p>
                <h3 className="mt-2 font-display text-3xl font-semibold text-ink-900">{auditId}</h3>
                <p className="mt-1 text-sm text-ink-700/70">Immutable Drunix history via GetHistoryForKey</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditOpen(false)}
                className="rounded-xl border border-sand-200 px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-white"
              >
                Close
              </button>
            </div>

            {auditLoading ? (
              <p className="text-sm text-ink-700/70">Fetching ledger history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-ink-700/70">No history records returned.</p>
            ) : (
              <ul className="space-y-4">
                {history.map((record) => (
                  <li key={`${record.TxID}-${record.Timestamp}`} className="rounded-2xl border border-sand-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(record.Value?.Status || 'LOCKED')}`}>
                        {record.IsDelete ? 'DELETED' : record.Value?.Status || 'UNKNOWN'}
                      </span>
                      <span className="text-xs text-ink-700/60">{record.Timestamp}</span>
                    </div>
                    <p className="mt-3 break-all font-mono text-xs text-ink-800">TxID: {record.TxID}</p>
                    {!record.IsDelete && record.Value && (
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-700">
                        <div>
                          <dt className="text-ink-700/50">Amount</dt>
                          <dd className="font-semibold">{inr.format(Number(record.Value.Amount || 0))}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-700/50">Condition</dt>
                          <dd className="font-semibold">{record.Value.Condition}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-700/50">Sender</dt>
                          <dd className="font-semibold">{record.Value.SenderOrg}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-700/50">Receiver</dt>
                          <dd className="font-semibold">{record.Value.ReceiverOrg}</dd>
                        </div>
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <style>{`
        .field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #d4deeb;
          background: #fff;
          padding: 0.75rem 0.9rem;
          font-size: 0.925rem;
          outline: none;
        }
        .field:focus {
          border-color: #3ecfad;
          box-shadow: 0 0 0 3px rgba(62, 207, 173, 0.18);
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-700/70">{label}</p>
      <p className="mt-4 font-display text-3xl font-semibold text-ink-950">{value}</p>
      <p className="mt-2 text-xs text-ink-700/60">{hint}</p>
    </div>
  );
}

function NodeRow({ org, role }: { org: string; role: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-sand-50 px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-ink-900">{org}</p>
        <p className="text-xs text-ink-700/60">{role}</p>
      </div>
      <span className="h-2.5 w-2.5 rounded-full bg-mint-400 animate-pulse-soft" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-700/60">
        {label}
      </span>
      {children}
    </label>
  );
}
