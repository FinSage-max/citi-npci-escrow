import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { TextDecoder } from 'util';
import { closeFabric, getConnectionInfo, getContract, initFabric } from './fabric';

const app = express();
const port = Number(process.env.PORT || 4000);
const utf8Decoder = new TextDecoder();

app.use(cors());
app.use(express.json());

function nowIso(): string {
  return new Date().toISOString();
}

function decodeJson<T>(bytes: Uint8Array): T {
  const text = utf8Decoder.decode(bytes);
  if (!text) {
    return [] as unknown as T;
  }
  return JSON.parse(text) as T;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    connection: getConnectionInfo(),
  });
});

app.post('/api/escrows', async (req: Request, res: Response) => {
  try {
    const { escrowId, senderOrg, receiverOrg, amount, condition } = req.body as {
      escrowId?: string;
      senderOrg?: string;
      receiverOrg?: string;
      amount?: number;
      condition?: string;
    };

    if (!escrowId || !senderOrg || !receiverOrg || amount === undefined || !condition) {
      res.status(400).json({
        error: 'escrowId, senderOrg, receiverOrg, amount, and condition are required',
      });
      return;
    }

    const contract = await getContract();
    const timestamp = nowIso();
    await contract.submitTransaction(
      'CreateEscrow',
      escrowId,
      senderOrg,
      receiverOrg,
      String(amount),
      condition,
      timestamp,
    );

    res.status(201).json({
      escrowId,
      senderOrg,
      receiverOrg,
      amount,
      condition,
      status: 'LOCKED',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

app.post('/api/escrows/:id/settle', async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const contract = await getContract();
    const timestamp = nowIso();
    await contract.submitTransaction('SettleEscrow', escrowId, timestamp);
    res.json({ escrowId, status: 'SETTLED', updatedAt: timestamp });
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

app.post('/api/escrows/:id/refund', async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const contract = await getContract();
    const timestamp = nowIso();
    await contract.submitTransaction('RefundEscrow', escrowId, timestamp);
    res.json({ escrowId, status: 'REFUNDED', updatedAt: timestamp });
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

app.get('/api/escrows', async (_req: Request, res: Response) => {
  try {
    const contract = await getContract();
    const resultBytes = await contract.evaluateTransaction('GetAllEscrows');
    const escrows = decodeJson<unknown[]>(resultBytes);
    res.json(escrows ?? []);
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

app.get('/api/escrows/:id/history', async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const contract = await getContract();
    const resultBytes = await contract.evaluateTransaction('GetEscrowHistory', escrowId);
    const history = decodeJson<unknown[]>(resultBytes);
    res.json(history ?? []);
  } catch (error) {
    res.status(500).json({ error: errorMessage(error) });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ error: err.message });
});

async function main(): Promise<void> {
  console.log('Connecting to Drunix Fabric Gateway with:');
  console.log(JSON.stringify(getConnectionInfo(), null, 2));
  await initFabric();

  const server = app.listen(port, () => {
    console.log(`Citi × NPCI escrow API listening on http://localhost:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await closeFabric();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((error: unknown) => {
  console.error('Failed to start API gateway:', error);
  process.exit(1);
});
