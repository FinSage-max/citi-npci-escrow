# Citi × NPCI Programmable Escrow PoC

End-to-end escrow demo on a local NPCI Drunix test network:

- `chaincode/` — Go smart contract (`EscrowTx` lifecycle + immutable history)
- `api-gateway/` — Express + TypeScript Fabric Gateway REST API on port `4000`
- `frontend/` — React + Vite + Tailwind dashboard on port `3000`

This project lives as a **sibling** of the `drunix/` repo and does not modify Drunix internals.

## Drunix connection (Org1 Lite Peer / Gateway)

Resolved from `drunix/drunix-network/test-network`:

| Setting | Value |
| --- | --- |
| MSP | `Org1MSP` |
| Identity | `User1@org1.example.com` |
| Cert | `.../users/User1@org1.example.com/msp/signcerts/User1@org1.example.com-cert.pem` |
| Private key | `.../users/User1@org1.example.com/msp/keystore/priv_sk` |
| Peer TLS CA | `.../peers/peer0.org1.example.com/tls/ca.crt` |
| Gateway endpoint | `localhost:7051` (Lite Peer `peer0.org1.example.com`) |
| SSL target name | `peer0.org1.example.com` |
| Channel | `mychannel` |
| Chaincode name | `escrow` |

## Prerequisites

1. Drunix test network is up with `mychannel` created.
2. Go `1.23+`, Node.js `20+`, and Docker are available for chaincode packaging/runtime.
3. Run deploy commands from **WSL** (not PowerShell). Ensure `go` is on `PATH`:

```bash
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
go version
```

## 1) Deploy chaincode

From `drunix/drunix-network/test-network` (WSL):

```bash
export PATH="$HOME/.local/go/bin:$HOME/.local/bin:$PATH"
bash ./network.sh deployCC -ccn escrow -ccp ../../../citi-npci-escrow/chaincode -ccl go
```

Seed sample escrows (optional but recommended for the dashboard):

```bash
bash ./network.sh cc invoke -c mychannel -ccn escrow -ccic '{"Args":["InitLedger"]}'
```

## 2) Start API gateway

```bash
cd ../citi-npci-escrow/api-gateway
npm install
npm run dev
```

API listens on `http://localhost:4000`.

## 3) Launch frontend

```bash
cd ../citi-npci-escrow/frontend
npm install
npm run dev
```

Dashboard listens on `http://localhost:3000`.

## REST routes

| Method | Path | Chaincode |
| --- | --- | --- |
| `POST` | `/api/escrows` | `CreateEscrow` |
| `POST` | `/api/escrows/:id/settle` | `SettleEscrow` |
| `POST` | `/api/escrows/:id/refund` | `RefundEscrow` |
| `GET` | `/api/escrows` | `GetAllEscrows` |
| `GET` | `/api/escrows/:id/history` | `GetEscrowHistory` |

## Demo flow

1. Open the dashboard and confirm locked/settled summary cards populate (after `InitLedger`).
2. Lock a new escrow with sender/receiver/amount/condition.
3. Settle or refund a `LOCKED` row.
4. Open **Audit Trail** to inspect immutable `TxID` history from Drunix.
