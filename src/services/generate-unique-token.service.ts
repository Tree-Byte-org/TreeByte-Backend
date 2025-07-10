import { Horizon, Keypair, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { loadAccount, fetchBaseFee } from '@/lib/stellar/server';

type GenerateUniqueTokenParams = {
  issuerSecret: string;
  assetCode: string;
  recipientPublicKey: string;
};

export async function generateUniqueToken({
  issuerSecret,
  assetCode,
  recipientPublicKey,
}: GenerateUniqueTokenParams): Promise<string> {
  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const issuerPublicKey = issuerKeypair.publicKey();

  const asset = new Asset(assetCode, issuerPublicKey);
  const issuerAccount = await loadAccount(issuerPublicKey);

  const txBuilder = new TransactionBuilder(issuerAccount, {
    fee: (await fetchBaseFee()).toString(),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  });

  const tx = txBuilder
    .addOperation(
      Operation.payment({
        destination: recipientPublicKey,
        asset,
        amount: '1',
      })
    )
    .setTimeout(100)
    .build();

  tx.sign(issuerKeypair);
  const res = await new Horizon.Server(STELLAR_CONFIG.horizonURL).submitTransaction(tx);
  return res.hash;
}
