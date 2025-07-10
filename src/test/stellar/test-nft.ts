import { Horizon, Keypair, Asset, TransactionBuilder, Operation } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { generateUniqueToken } from '@/services/generate-unique-token.service';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);

const fundAccount = async (publicKey: string) => {
  const url = `${STELLAR_CONFIG.friendbotURL}?addr=${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`❌ Friendbot failed: ${res.statusText}`);
};

(async () => {
  console.log('\n🌱 NFT Generation Test on Stellar Testnet');
  console.log('──────────────────────────────────────────');

  const issuer = Keypair.random();
  const recipient = Keypair.random();

  console.log(`🔑 Issuer:    ${issuer.publicKey()}`);
  console.log(`👤 Recipient: ${recipient.publicKey()}`);

  console.log('\n💸 Funding accounts...');
  await Promise.all([
    fundAccount(issuer.publicKey()),
    fundAccount(recipient.publicKey()),
  ]);
  console.log('✅ Accounts funded.\n');

  const randomSuffix = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  const assetCode = `TREE${randomSuffix}`; // Máximo 10 caracteres

  const asset = new Asset(assetCode, issuer.publicKey());

  const recipientAccount = await server.loadAccount(recipient.publicKey());

  const trustTx = new TransactionBuilder(recipientAccount, {
    fee: (await server.fetchBaseFee()).toString(),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(100)
    .build();

  trustTx.sign(recipient);
  await server.submitTransaction(trustTx);
  console.log(`✅ Trustline established for asset "${assetCode}".\n`);

  console.log('🚀 Issuing token...');
  const txHash = await generateUniqueToken({
    issuerSecret: issuer.secret(),
    assetCode,
    recipientPublicKey: recipient.publicKey(),
  });

  console.log(`✅ Token issued!`);
  console.log(`🔗 Hash: ${txHash}\n`);

  const updated = await server.loadAccount(recipient.publicKey());
  const balance = updated.balances.find(
    (b: any) => b.asset_code === assetCode && b.asset_issuer === issuer.publicKey()
  );

  if (balance) {
    console.log(`🎉 NFT balance confirmed: ${balance.balance} ${assetCode}`);
  } else {
    console.error('❌ NFT not found in recipient balance.');
  }

  console.log('\n✅ Test completed.\n');
})();
