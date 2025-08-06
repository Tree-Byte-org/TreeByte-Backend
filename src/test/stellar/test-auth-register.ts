import { fetch } from "undici";
import { accountService } from "@/services/stellar";

const API_URL = "http://localhost:3000";

interface RegisterResponse {
  message: string;
  user: {
    email: string;
    authMethod: string;
    publicKey: string;
  };
}

(async () => {
  console.log("\n🔐 Testing /auth/register");
  console.log("───────────────────────────────");

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `user-${Date.now()}@test.com`,
      authMethod: "email",
    }),
  });

  const raw = await res.text(); // ✅ read once only
  let data: RegisterResponse;

  try {
    data = JSON.parse(raw) as RegisterResponse;
  } catch (err) {
    console.error("❌ Response is not valid JSON. Raw response:\n", raw);
    console.error(`\n📦 Status code: ${res.status}`);
    process.exit(1);
  }

  if (res.status !== 201) {
    console.error("❌ Registration failed:", data);
    process.exit(1);
  }

  const { email, publicKey } = data.user;

  console.log(`✅ User registered: ${email}`);
  console.log(`🔑 Public key: ${publicKey}`);

  console.log("\n💸 Funding Stellar account...");
  await accountService.fundAccount(publicKey);
  console.log("✅ Account funded.");

  // Wait for account to be available
  console.log("⏳ Waiting for account to be available...");
  await accountService.waitForAccount(publicKey);

  const balances = await accountService.getBalances(publicKey);
  console.log(`📊 Balances:`);

  for (const b of balances) {
    if (b.asset_code && b.asset_issuer) {
      console.log(`• ${b.balance} ${b.asset_code}`);
    } else {
      console.log(`• ${b.balance} ${b.asset_type}`); // e.g., native (XLM)
    }
  }

  console.log("\n✅ Registration + Stellar integration test passed.\n");
})();
