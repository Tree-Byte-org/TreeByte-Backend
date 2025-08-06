import { Keypair } from '@stellar/stellar-sdk';
import { encrypt, decrypt } from '@/utils/encryption';
import { AccountService } from './account.service';
import { StellarError } from './error-handler.service';

export interface StellarWallet {
  publicKey: string;
  encryptedSecret: string;
}

export interface WalletCreationResult extends StellarWallet {
  funded: boolean;
}

export interface DecryptedWallet {
  publicKey: string;
  secretKey: string;
  keypair: Keypair;
}

export class WalletService {
  constructor(private accountService?: AccountService) {
    this.accountService = accountService || new AccountService();
  }

  generateWallet(passphrase: string): StellarWallet {
    try {
      const keypair = Keypair.random();
      const publicKey = keypair.publicKey();
      const secretKey = keypair.secret();

      const encryptedSecret = encrypt(secretKey, passphrase);

      return {
        publicKey,
        encryptedSecret,
      };
    } catch (error) {
      throw new StellarError('Failed to generate wallet', error as Error);
    }
  }

  async createAndFundWallet(passphrase: string): Promise<WalletCreationResult> {
    const wallet = this.generateWallet(passphrase);
    
    try {
      await this.accountService!.fundAccount(wallet.publicKey);
      
      await this.accountService!.waitForAccount(wallet.publicKey);
      
      return {
        ...wallet,
        funded: true,
      };
    } catch (error) {
      return {
        ...wallet,
        funded: false,
      };
    }
  }

  decryptWallet(encryptedSecret: string, passphrase: string): DecryptedWallet {
    try {
      const secretKey = decrypt(encryptedSecret, passphrase);
      const keypair = Keypair.fromSecret(secretKey);
      const publicKey = keypair.publicKey();

      return {
        publicKey,
        secretKey,
        keypair,
      };
    } catch (error) {
      throw new StellarError('Failed to decrypt wallet', error as Error, {
        reason: 'Invalid passphrase or corrupted encrypted data'
      });
    }
  }

  validateWallet(publicKey: string, encryptedSecret: string, passphrase: string): boolean {
    try {
      const decrypted = this.decryptWallet(encryptedSecret, passphrase);
      return decrypted.publicKey === publicKey;
    } catch (error) {
      return false;
    }
  }

  reencryptWallet(encryptedSecret: string, oldPassphrase: string, newPassphrase: string): string {
    try {
      const secretKey = decrypt(encryptedSecret, oldPassphrase);
      return encrypt(secretKey, newPassphrase);
    } catch (error) {
      throw new StellarError('Failed to re-encrypt wallet', error as Error, {
        reason: 'Invalid old passphrase'
      });
    }
  }

  createWalletFromSecret(secretKey: string, passphrase: string): StellarWallet {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const publicKey = keypair.publicKey();
      const encryptedSecret = encrypt(secretKey, passphrase);

      return {
        publicKey,
        encryptedSecret,
      };
    } catch (error) {
      throw new StellarError('Failed to create wallet from secret', error as Error);
    }
  }

  async importWallet(secretKey: string, passphrase: string): Promise<StellarWallet> {
    if (!this.accountService!.validateSecretKey(secretKey)) {
      throw new StellarError('Invalid secret key format');
    }

    const wallet = this.createWalletFromSecret(secretKey, passphrase);
    
    const exists = await this.accountService!.accountExists(wallet.publicKey);
    if (!exists) {
      throw new StellarError('Account does not exist on the network', undefined, {
        publicKey: wallet.publicKey
      });
    }

    return wallet;
  }

  validateWalletFormat(wallet: StellarWallet): boolean {
    return (
      typeof wallet.publicKey === 'string' &&
      typeof wallet.encryptedSecret === 'string' &&
      wallet.publicKey.startsWith('G') &&
      wallet.publicKey.length === 56 &&
      wallet.encryptedSecret.length > 0
    );
  }

  async getWalletInfo(publicKey: string) {
    const exists = await this.accountService!.accountExists(publicKey);
    
    if (!exists) {
      return {
        exists: false,
        balances: [],
        nativeBalance: '0'
      };
    }

    const balances = await this.accountService!.getBalances(publicKey);
    const nativeBalance = await this.accountService!.getNativeBalance(publicKey);

    return {
      exists: true,
      balances,
      nativeBalance
    };
  }

  generateMnemonic(): string[] {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
    ];
    
    const mnemonic: string[] = [];
    for (let i = 0; i < 12; i++) {
      mnemonic.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return mnemonic;
  }

  generateRecoveryPhrase(): { phrase: string; words: string[] } {
    const words = this.generateMnemonic();
    return {
      phrase: words.join(' '),
      words
    };
  }
}

// Remove default instance export to avoid circular dependencies