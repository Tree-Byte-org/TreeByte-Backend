import { Keypair, Asset, TransactionBuilder, Operation, Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { purchaseNFT } from '@/services/purchase-nft.service';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);

const fundAccount = async (publicKey: string) => {
  const url = `${STELLAR_CONFIG.friendbotURL}?addr=${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`❌ Friendbot failed: ${res.statusText}`);
};

(async () => {
  console.log('\n🧪 NFT Purchase Test');
  console.log('──────────────────────────────');

  // Setup issuer and buyer
  const issuer = Keypair.random();
  const buyer = Keypair.random();

  console.log(`🪪 Issuer: ${issuer.publicKey()}`);
  console.log(`🛍️  Buyer:  ${buyer.publicKey()}`);

  console.log('\n💸 Funding accounts...');
  await Promise.all([
    fundAccount(issuer.publicKey()),
    fundAccount(buyer.publicKey()),
  ]);
  console.log('✅ Accounts funded.');

  // Create NFT asset
  const assetCode = `TREE${Math.floor(Math.random() * 1_000_000)}`;
  const asset = new Asset(assetCode, issuer.publicKey());

  // Buyer establishes trustline to the NFT
  const buyerAccount = await server.loadAccount(buyer.publicKey());

  const trustTx = new TransactionBuilder(buyerAccount, {
    fee: String(await server.fetchBaseFee()),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(100)
    .build();

  trustTx.sign(buyer);
  await server.submitTransaction(trustTx);
  console.log(`✅ Trustline established for asset "${assetCode}".`);

  // Issuer sends the NFT to itself (mint 1 unit to hold it)
  const issuerAccount = await server.loadAccount(issuer.publicKey());

  const mintTx = new TransactionBuilder(issuerAccount, {
    fee: String(await server.fetchBaseFee()),
    networkPassphrase: STELLAR_CONFIG.networkPassphrase,
  })
    .addOperation(Operation.payment({
      destination: issuer.publicKey(),
      asset,
      amount: '1',
    }))
    .setTimeout(100)
    .build();

  mintTx.sign(issuer);
  await server.submitTransaction(mintTx);
  console.log('✅ NFT minted to issuer.\n');

  // Execute purchase
  console.log('🛒 Executing purchase...');
  const txHash = await purchaseNFT({
    issuerSecret: issuer.secret(),
    buyerSecret: buyer.secret(), 
    assetCode,
    assetIssuer: issuer.publicKey(),
    priceXLM: '2',
  });

  console.log(`✅ Purchase successful!`);
  console.log(`🔗 Transaction Hash: ${txHash}`);

  // Confirm balance
  const updatedBuyer = await server.loadAccount(buyer.publicKey());
  const balance = updatedBuyer.balances.find(
    (b: any) => b.asset_code === assetCode && b.asset_issuer === issuer.publicKey()
  );

  if (balance) {
    console.log(`🎉 Buyer now holds: ${balance.balance} ${assetCode}`);
  } else {
    console.error('❌ Buyer does not hold the NFT.');
  }

  console.log('\n✅ Test completed.\n');
})();
