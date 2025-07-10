import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);

export const getTransactionHistory = async (publicKey: string) => {
  const transactions = await server.transactions()
    .forAccount(publicKey)
    .order('desc')
    .limit(10)
    .call();

  return transactions.records.map((tx: any) => ({
    hash: tx.hash,
    asset_code: tx.asset_code || 'XLM',
    amount: tx.amount || 'N/A',
    created_at: tx.created_at,
    memo: tx.memo,
    status: tx.successful ? 'Success' : 'Failed',
  }));
};
