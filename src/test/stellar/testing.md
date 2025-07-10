
## 🧪 TESTING.md — Stellar SDK

### 🌐 Horizon Connection Test

📍 **Path:** `src/test/stellar/test-connection.ts`
💻 **Command:** `npm run test:connection:stellar`
🛠️ **Purpose:** Verifies if the backend can successfully connect to the Stellar testnet Horizon server and fetch the latest ledger.
✅ **Expected result:** Displays the latest ledger number with a success message.
❌ **Failure case:** Network/configuration error; unable to connect to Horizon.
📦 **Script added in package.json:** `test:connection:stellar`

---

### 💸 Transaction Build Test

📍 **Path:** `src/test/stellar/test-transaction-skeleton.ts`
💻 **Command:** `npx ts-node -r tsconfig-paths/register src/test/stellar/test-transaction-skeleton.ts`
🛠️ **Purpose:** Validates the ability to load an existing Stellar account and build a transaction skeleton using the `TransactionBuilder` from the SDK.
✅ **Expected result:** Successfully logs that the account was loaded and shows a built transaction (not signed or submitted).
❌ **Failure case:** Returns an error if the account doesn't exist or if base fee fetching fails.
📎 **Note:** This test does not sign or submit the transaction; it only builds and logs the XDR for inspection.
🔑 **Requirement:** A valid source public key on the Stellar testnet (with at least 1 XLM balance).
📦 **Script added in package.json:** `test:transaction:stellar`

---

### 🌱 NFT Generation Test

📍 **Path:** `src/test/stellar/test-nft.ts`
💻 **Command:** `npm run test:nft:stellar`
🛠️ **Purpose:** Simulates minting a unique token ("NFT") on the Stellar testnet. It creates issuer and recipient accounts, funds them, sets a trustline, and issues one unit of a custom asset.
✅ **Expected result:** A token with a unique code is issued and appears in the recipient's balance.
❌ **Failure case:** Trustline not set, account funding failed, or transaction rejected by the network.
📎 **Note:** Asset code must be ≤12 characters; uses random suffix to ensure uniqueness.
📦 **Script added in package.json:** `test:nft:stellar`

---

### 🛒 NFT Purchase Test

📍 **Path:** `src/test/stellar/test-purchase-nft.ts`
💻 **Command:** `npm run test:purchase:nft`
🛠️ **Purpose:** Validates the full flow of purchasing a unique token (NFT) using XLM. It involves trustline setup, NFT minting, and a transaction where the buyer pays in XLM and receives the asset.
✅ **Expected result:** NFT is transferred to the buyer and their balance reflects ownership; transaction hash is displayed.
❌ **Failure case:** Missing trustline, insufficient funds, or missing buyer signature.
🔐 **Requirement:** Both `issuerSecret` and `buyerSecret` are used to sign the transaction.
📦 **Script added in package.json:** `test:purchase:nft`

---

🔐 Registration + Funding Test
📍 Path: src/test/stellar/test-auth-register.ts
💻 Command: npm run test:register
🛠️ Purpose: Simulates registering a user via /auth/register, then funds the generated Stellar public key using Friendbot. Also validates connectivity to Horizon and confirms account balances.
✅ Expected result: Returns 201 Created with email + public key, and shows XLM balance from the funded testnet account.
❌ Failure case: Returns 500 if the server crashes (e.g., SDK import error), 400 if registration input is invalid, or funding fails.
📎 Note: Parses the backend response manually to avoid double-read errors. Uses random email per test run.
📦 Script added in package.json: test:register

---

