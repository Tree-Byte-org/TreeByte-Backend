import express from 'express';
import db from '@/lib/db/db';
import { generateStellarWallet } from '@/services/wallet-service';
import { walletService, accountService } from '@/services/stellar';
import { RecoveryService } from '@/services/recovery.service';
import { MailerService } from '../services/mailer.service';

const recoveryService = new RecoveryService(new MailerService());

// ✅ Create wallet (invisible or external)
export const createWallet = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email, publicKey, passphrase } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: existing, error: existingError } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error(existingError);
      return res.status(500).json({ error: 'Error checking existing wallet' });
    }

    if (existing) {
      return res.status(409).json({ error: 'Wallet already exists for this email' });
    }

    // 🔗 External wallet
    if (publicKey) {
      if (!accountService.validatePublicKey(publicKey)) {
        return res.status(400).json({ error: 'Invalid publicKey format' });
      }

      const { error: insertError } = await db.from('users').insert([
        {
          email,
          public_key: publicKey,
          secret_key_enc: null,
          auth_method: 'external',
        },
      ]);

      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ error: 'Error inserting external wallet' });
      }

      return res.status(201).json({ publicKey, source: 'external' });
    }

    // 🔐 Invisible wallet
    if (!passphrase || passphrase.length < 8) {
      return res.status(400).json({ error: 'Passphrase is required and must be at least 8 characters' });
    }

    const { publicKey: newPublicKey, encryptedSecret } = generateStellarWallet(passphrase);

    const { error: insertGeneratedError } = await db.from('users').insert([
      {
        email,
        public_key: newPublicKey,
        secret_key_enc: encryptedSecret,
        auth_method: 'invisible',
      },
    ]);

    if (insertGeneratedError) {
      console.error(insertGeneratedError);
      return res.status(500).json({ error: 'Error inserting generated wallet' });
    }

    return res.status(201).json({ publicKey: newPublicKey, source: 'generated' });
  } catch (error) {
    console.error('Wallet creation failed', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 🔐 Export encrypted secret key
export const exportEncryptedKeyHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const backup = await recoveryService.exportEncryptedKey(email);
    return res.status(200).json({ backup });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

// 📧 Send encrypted key to email
export const sendEncryptedKeyHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await recoveryService.sendEncryptedKeyByEmail(email);
    return res.status(200).json({ message: 'Backup sent successfully.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const recoverWalletHandler = async (req: express.Request, res: express.Response) => {
  try {
    const { email, passphrase } = req.body;

    if (!email || !passphrase) {
      return res.status(400).json({ error: 'Email and passphrase are required' });
    }

    const publicKey = await recoveryService.recoverWallet(email, passphrase);

    return res.status(200).json({ publicKey });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

