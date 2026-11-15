export type EscrowStatus = 'LOCKED' | 'SETTLED' | 'REFUNDED';

export interface EscrowTx {
  EscrowID: string;
  SenderOrg: string;
  ReceiverOrg: string;
  Amount: number;
  Condition: string;
  Status: EscrowStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface HistoryRecord {
  TxID: string;
  Timestamp: string;
  IsDelete: boolean;
  Value: EscrowTx;
}
