import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
} from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { stellarServer, loadAccount } from '@/lib/stellar/server';

type PurchaseNFTParams = {
  issuerSecret: string;         // Secret key of the current NFT owner
  buyerSecret: string;          // Secret key of the buyer (MUST sign payment)
  assetCode: string;            // Unique asset code (e.g. TREE123456)
  assetIssuer: string;          // Issuer public key (must match issuerSecret)
  priceXLM: string;             // Amount the buyer will pay in XLM
};

export async function purchaseNFT({
  issuerSecret,
  buyerSecret,
  assetCode,
  assetIssuer,
  priceXLM,
}: PurchaseNFTParams): Promise<string> {
  const issuerKeypair = Keypair.fromSecret(issuerSecret);
  const buyerKeypair = Keypair.fromSecret(buyerSecret);

  const issuerPublicKey = issuerKeypair.publicKey();
  const buyerPublicKey = buyerKeypair.publicKey();

  const asset = new Asset(assetCode, assetIssuer);
  const issuerAccount = await loadAccount(issuerPublicKey);

  const txBuilder = new TransactionBuilder(issuerAccount, {
    fee: String(await stellarServer.fetchBaseFee()),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  });

  // 1. Transfer the NFT to buyer
  txBuilder.addOperation(
    Operation.payment({
      destination: buyerPublicKey,
      asset,
      amount: '1',
    })
  );

  // 2. Buyer pays in XLM to issuer
  txBuilder.addOperation(
    Operation.payment({
      destination: issuerPublicKey,
      asset: Asset.native(), // XLM
      amount: priceXLM,
      source: buyerPublicKey, // Buyer must sign this
    })
  );

  const tx = txBuilder.setTimeout(100).build();

  // Both issuer and buyer must sign
  tx.sign(issuerKeypair);
  tx.sign(buyerKeypair);

  const result = await stellarServer.submitTransaction(tx);
  return result.hash;
}
