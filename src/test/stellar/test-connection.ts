import { Horizon } from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config/stellar-config";

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);

(async () => {
  console.log("\n🔍 Horizon Connection Test");
  console.log("────────────────────────────");
  console.log(`🌐 Network: ${STELLAR_CONFIG.networkPassphrase}`);
  console.log(`🔗 Horizon URL: ${STELLAR_CONFIG.horizonURL}\n`);

  try {
    const ledgers = await server.ledgers().limit(1).call();
    const latest = ledgers.records[0].sequence;

    console.log("✅ Successfully connected to Stellar Horizon.");
    console.log(`📄 Latest ledger sequence: ${latest}\n`);
    console.log("🚀 Horizon is operational!\n");
  } catch (err) {
    console.error("❌ ERROR: Could not connect to Horizon.\n");
    console.error(err);
    process.exit(1);
  }
})();
