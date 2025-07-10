import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);


const publicKey = 'GASAEA7TGN3JPAORQSK7FLK4ERCQMYY4PA5UETV3NGLBJMCPIFVNH4QX'; 

(async () => {
  console.log("\n🔍 Transaction History Test");
  console.log("────────────────────────────");
  console.log(`🔑 Public Key: ${publicKey}`);
  console.log(`🌐 Network: ${STELLAR_CONFIG.networkPassphrase}\n`);

  try {
    const transactions = await server
      .transactions()
      .forAccount(publicKey)
      .order('desc')
      .limit(10)
      .call();

    if (transactions.records.length === 0) {
      console.log('⚠️  Account found, but has no transactions.\n');
    } else {
      console.log(`✅ Found ${transactions.records.length} transaction(s):\n`);
      transactions.records.forEach((tx, i) => {
        console.log(`#${i + 1}`);
        console.log(`Hash: ${tx.hash}`);
        console.log(`Created At: ${tx.created_at}`);
        console.log(`Memo: ${tx.memo || '(none)'}`);
        console.log(`Result: ${tx.successful ? 'Success' : 'Failed'}\n`);
      });
    }
  } catch (err: any) {
    if (err?.response?.data?.status === 404) {
      console.error("❌ Account not found on the Stellar testnet.");
    } else {
      console.error("❌ Failed to fetch transaction history.");
      console.error(err?.response?.data || err.message || err);
    }
    process.exit(1);
  }
})();
