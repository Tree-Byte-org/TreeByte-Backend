import { Horizon, Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);

export const generateKeypair = () => Keypair.random();

export const loadAccount = async (publicKey: string) => {
  return server.loadAccount(publicKey);
};

export const createTransactionSkeleton = async (sourcePublicKey: string) => {
  const account = await loadAccount(sourcePublicKey);

  return new TransactionBuilder(account, {
    fee: String(await server.fetchBaseFee()),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  });
};
