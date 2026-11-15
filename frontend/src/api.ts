import type { EscrowTx, HistoryRecord } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Request failed (${response.status})`);
  }
  return payload as T;
}

export function listEscrows(): Promise<EscrowTx[]> {
  return request<EscrowTx[]>('/api/escrows');
}

export function createEscrow(body: {
  escrowId: string;
  senderOrg: string;
  receiverOrg: string;
  amount: number;
  condition: string;
}): Promise<EscrowTx> {
  return request('/api/escrows', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function settleEscrow(id: string): Promise<{ escrowId: string; status: string }> {
  return request(`/api/escrows/${encodeURIComponent(id)}/settle`, { method: 'POST' });
}

export function refundEscrow(id: string): Promise<{ escrowId: string; status: string }> {
  return request(`/api/escrows/${encodeURIComponent(id)}/refund`, { method: 'POST' });
}

export function getEscrowHistory(id: string): Promise<HistoryRecord[]> {
  return request(`/api/escrows/${encodeURIComponent(id)}/history`);
}
