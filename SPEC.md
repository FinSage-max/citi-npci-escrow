# Hackathon Project Specification: Citi × NPCI Drunix Settlement Platform

## 1. Project Overview
- **Core Concept:** Instant tokenised cross-border/domestic settlement or programmable escrow for high-value merchant transactions using NPCI's Drunix blockchain.
- **Primary Value Proposition:** Eliminates multi-day clearing delays and reconciliation risks between commercial banks (Citi) and central payment rails (NPCI) using distributed SQL ledger storage and verifiable smart contracts.

## 2. Actors & Participants
- **Org1 (Citi / Issuing Bank):** Initiates tokenisation, locks fiat liquidity, and submits settlement proposals.
- **Org2 (NPCI / Clearing Rails):** Validates endorsement policies, triggers clearing, and maintains immutable cross-institution audit trails.
- **Customer / Merchant:** Initiates the transaction flow via the frontend dashboard.

## 3. On-Chain Assets / States (Ledger Schemas)
1. **Digital Rupee / Settlement Token (`TokenWallet`)**
   - Fields: `walletId`, `ownerOrg`, `balance`, `status`
2. **Transaction Escrow (`SettlementEscrow`)**
   - Fields: `escrowId`, `senderId`, `receiverId`, `amount`, `status` (PENDING, LOCKED, SETTLED, FAILED), `timestamp`

## 4. Chaincode Functions (Smart Contract Methods)
1. `CreateWallet(walletId, ownerOrg, initialBalance)` — Initializes a new bank/merchant wallet on-chain.
2. `LockFunds(escrowId, senderId, receiverId, amount)` — Moves funds into a verifiable escrow state.
3. `ApproveSettlement(escrowId)` — Triggers multi-party endorsement (Citi + NPCI) and releases funds to the receiver.
4. `GetTransactionHistory(escrowId)` — Queries immutable ledger history for real-time audit trails.

## 5. API Gateway Endpoints (Backend REST Routes)
- `POST /api/wallets` -> Calls `CreateWallet`
- `POST /api/escrow/lock` -> Calls `LockFunds`
- `POST /api/escrow/settle` -> Calls `ApproveSettlement`
- `GET /api/audit/:escrowId` -> Calls `GetTransactionHistory`

## 6. Frontend Demo Screens
1. **Dashboard Overview:** Real-time balances for Citi and NPCI nodes.
2. **Initiate Transfer / Escrow:** A clean form to lock funds and simulate a transaction.
3. **Audit & Reconciliation View:** Live view of immutable Drunix SQL blocks and state transitions.
