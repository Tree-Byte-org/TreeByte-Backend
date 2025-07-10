# Wallet-to-Email Mapping – Technical Documentation

## Overview

In the current implementation of TreeByte, the mapping between wallet and email is handled **off-chain**, fully managed through backend services and stored in a **Supabase (PostgreSQL)** database.

This document explains:
- How wallets are linked to emails.
- The available wallet creation modes.
- The risks of centralization and privacy.
- The purpose of this mapping within recovery flows.

---

## Identity Mapping Flow

### 1. 📩 Email-Based Wallet Registration

When a user creates a wallet, their email is required:

- If a **publicKey** is provided:
  - It is treated as an external wallet (e.g., from Freighter).
  - The wallet is saved with `auth_method: "freighter"`.
  - No secret is stored.

- If a **passphrase** is provided:
  - An invisible wallet is generated.
  - The `secretKey` is encrypted using the passphrase.
  - The encrypted secret and publicKey are stored.
  - `auth_method: "invisible"`.

This mapping is stored in the `users` table:

```sql
users (
  email TEXT PRIMARY KEY,
  public_key TEXT,
  secret_key_enc TEXT,
  auth_method TEXT
)
