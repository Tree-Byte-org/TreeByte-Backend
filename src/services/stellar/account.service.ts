import { Keypair } from '@stellar/stellar-sdk';
import { StellarClientService } from './stellar-client.service';
import { StellarError, StellarErrorHandler } from './error-handler.service';

export interface AccountBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
}

export interface AccountInfo {
  id: string;
  sequence: string;
  balances: AccountBalance[];
  signers: Array<{
    weight: number;
    key: string;
    type: string;
  }>;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
}

export class AccountService {
  constructor(private stellarClient?: StellarClientService) {
    this.stellarClient = stellarClient || new StellarClientService();
  }

  async createKeypair(): Promise<Keypair> {
    try {
      return Keypair.random();
    } catch (error) {
      throw new StellarError('Failed to generate keypair', error as Error);
    }
  }

  async createAndFundAccount(): Promise<Keypair> {
    const keypair = await this.createKeypair();
    
    await StellarErrorHandler.withRetry(async () => {
      await this.stellarClient!.fundAccount(keypair.publicKey());
    });

    return keypair;
  }

  async fundAccount(publicKey: string): Promise<void> {
    await StellarErrorHandler.withRetry(async () => {
      await this.stellarClient!.fundAccount(publicKey);
    });
  }

  async getAccount(publicKey: string): Promise<any> {
    return await this.stellarClient!.getAccount(publicKey);
  }

  async getAccountInfo(publicKey: string): Promise<AccountInfo> {
    const account = await this.getAccount(publicKey);
    
    return {
      id: account.id,
      sequence: account.sequence,
      balances: account.balances.map((balance: any) => ({
        asset_type: balance.asset_type,
        asset_code: balance.asset_code,
        asset_issuer: balance.asset_issuer,
        balance: balance.balance,
        limit: balance.limit,
      })),
      signers: account.signers,
      thresholds: account.thresholds,
    };
  }

  async getBalances(publicKey: string): Promise<AccountBalance[]> {
    const accountInfo = await this.getAccountInfo(publicKey);
    return accountInfo.balances;
  }

  async getNativeBalance(publicKey: string): Promise<string> {
    const balances = await this.getBalances(publicKey);
    const nativeBalance = balances.find(balance => balance.asset_type === 'native');
    return nativeBalance?.balance || '0';
  }

  async getAssetBalance(publicKey: string, assetCode: string, assetIssuer: string): Promise<string> {
    const balances = await this.getBalances(publicKey);
    const assetBalance = balances.find(balance => 
      balance.asset_code === assetCode && balance.asset_issuer === assetIssuer
    );
    return assetBalance?.balance || '0';
  }

  async accountExists(publicKey: string): Promise<boolean> {
    return await this.stellarClient!.isAccountExists(publicKey);
  }

  async getSequenceNumber(publicKey: string): Promise<string> {
    const account = await this.getAccount(publicKey);
    return account.sequence;
  }

  validatePublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  validateSecretKey(secretKey: string): boolean {
    try {
      Keypair.fromSecret(secretKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  keypairFromSecret(secretKey: string): Keypair {
    try {
      return Keypair.fromSecret(secretKey);
    } catch (error) {
      throw new StellarError('Invalid secret key', error as Error, { secretKey: '[REDACTED]' });
    }
  }

  keypairFromPublicKey(publicKey: string): Keypair {
    try {
      return Keypair.fromPublicKey(publicKey);
    } catch (error) {
      throw new StellarError('Invalid public key', error as Error, { publicKey });
    }
  }

  async waitForAccount(publicKey: string, maxWaitTime = 30000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        return await this.getAccount(publicKey);
      } catch (error) {
        if (error instanceof StellarError && error.type === 'ACCOUNT_NOT_FOUND') {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }
    }

    throw new StellarError('Account creation timeout', undefined, { 
      publicKey, 
      maxWaitTime 
    });
  }
}

// Remove default instance export to avoid circular dependencies