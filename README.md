🌱 TreeByte Backend – The Engine Behind Reforestation Powered by Web3

This is the backend for **TreeByte**, a platform that transforms your digital footprint into real-world reforestation 🌳. It manages API routes, wallet logic, NFT issuance, metadata generation, and prepares future integrations with Stellar blockchain and IPFS.

---

🧰 Tech Stack

- Node.js + Express
- TypeScript
- Stellar SDK (Testnet-ready)
- Dotenv for environment configuration
- Module-alias for cleaner imports

---

📦 How to clone and run locally

Clone the repository:

```bash
git clone https://github.com/Tree-Byte-org/TreeByte-Backend.git
cd TreeByte-Backend
```

## 🔐 Environment Setup

1. Duplicate the `.env.example` file and rename it to `.env`
2. Add your Supabase credentials:

```env
# ================================
# SERVER CONFIGURATION
# ================================
PORT=4000

# ================================
# SUPABASE CONFIGURATION
# ================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ================================
# EMAIL CONFIGURATION
# ================================
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_email_password_or_app_password

# ================================
# PINATA (IPFS)
# ================================
PINATA_API_KEY=pinata_api_key
PINATA_SECRET_API_KEY=pinata_secret_api_key
PINATA_JWT=pinata_jwt

# ================================
# SOROBAN CONFIGURATION
# ================================
STELLAR_NETWORK=testnet
CONTRACT_DEPLOYER=
PROJECT_TOKEN_WASM_PATH=contracts/target/wasm32-unknown-unknown/release/project_token.wasm
```

> You can find these keys in your Supabase [dashboard](https://supabase.com/dashboard), under **Project Settings → API**.

---

## 🧪 Database Setup with Supabase

### 1. Create a Supabase Project

- Go to [https://supabase.com](https://supabase.com)
- Create a new project
- Save the project ref and password

### 2. Link Your Supabase Project

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

You’ll be asked to enter your database password.

---

### 3. Apply Migrations

Once linked, push your SQL migrations:

```bash
npx supabase db push
```

This will create all tables defined in `supabase/migrations/` in your Supabase project.

---

## 🚀 Run the Backend

### Development Mode

```bash
npm install
npm run dev
```

### Production Mode

```bash
npm run start
```

---

📬 Contact & Collaborations

Want to contribute, collaborate, or learn more?

📩 [treebyte.web3@gmail.com](mailto:treebyte.web3@gmail.com)
🐦 @GoTreeByte ([https://twitter.com/GoTreeByte](https://twitter.com/GoTreeByte))
