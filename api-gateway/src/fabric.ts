import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Gateway,
  hash,
  Identity,
  Signer,
  signers,
} from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'escrow';
const mspId = process.env.MSP_ID || 'Org1MSP';

/**
 * Absolute paths resolved against the local Drunix test-network crypto material.
 * Lite Peer (gateway) for Org1 is peer0.org1.example.com mapped to localhost:7051.
 */
const cryptoPath = path.resolve(
  process.env.CRYPTO_PATH ||
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'drunix',
      'drunix-network',
      'test-network',
      'organizations',
      'peerOrganizations',
      'org1.example.com',
    ),
);

const keyDirectoryPath = path.resolve(
  process.env.KEY_DIRECTORY_PATH ||
    path.join(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'),
);

const certDirectoryPath = path.resolve(
  process.env.CERT_DIRECTORY_PATH ||
    path.join(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts'),
);

const tlsCertPath = path.resolve(
  process.env.TLS_CERT_PATH ||
    path.join(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'),
);

const peerEndpoint = process.env.PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';

let gateway: Gateway | undefined;
let client: grpc.Client | undefined;
let contract: Contract | undefined;

async function getFirstDirFileName(dirPath: string): Promise<string> {
  const files = await fs.readdir(dirPath);
  const file = files[0];
  if (!file) {
    throw new Error(`No files in directory: ${dirPath}`);
  }
  return path.join(dirPath, file);
}

async function newGrpcConnection(): Promise<grpc.Client> {
  const tlsRootCert = await fs.readFile(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': peerHostAlias,
  });
}

async function newIdentity(): Promise<Identity> {
  const certPath = await getFirstDirFileName(certDirectoryPath);
  const credentials = await fs.readFile(certPath);
  return { mspId, credentials };
}

async function newSigner(): Promise<Signer> {
  const keyPath = await getFirstDirFileName(keyDirectoryPath);
  const privateKeyPem = await fs.readFile(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

export function getConnectionInfo() {
  return {
    channelName,
    chaincodeName,
    mspId,
    cryptoPath,
    keyDirectoryPath,
    certDirectoryPath,
    tlsCertPath,
    peerEndpoint,
    peerHostAlias,
  };
}

export async function initFabric(): Promise<Contract> {
  if (contract) {
    return contract;
  }

  client = await newGrpcConnection();
  gateway = connect({
    client,
    identity: await newIdentity(),
    signer: await newSigner(),
    hash: hash.sha256,
    evaluateOptions: () => ({ deadline: Date.now() + 10_000 }),
    endorseOptions: () => ({ deadline: Date.now() + 30_000 }),
    submitOptions: () => ({ deadline: Date.now() + 10_000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
  });

  const network = gateway.getNetwork(channelName);
  contract = network.getContract(chaincodeName);
  return contract;
}

export async function getContract(): Promise<Contract> {
  return initFabric();
}

export async function closeFabric(): Promise<void> {
  gateway?.close();
  client?.close();
  gateway = undefined;
  client = undefined;
  contract = undefined;
}
