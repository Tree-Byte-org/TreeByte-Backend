import { 
  Horizon, 
  Transaction
} from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { StellarError } from './error-handler.service';

export interface StellarConfig {
  horizonUrl: string;
  networkPassphrase: string;
  friendbotUrl?: string;
}

export class StellarClientService {
  private server: Horizon.Server;
  private networkPassphrase: string;
  private friendbotUrl?: string;

  constructor(config?: StellarConfig) {
    const stellarConfig = config || {
      horizonUrl: STELLAR_CONFIG.horizonURL,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
      friendbotUrl: STELLAR_CONFIG.friendbotURL,
    };

    this.server = new Horizon.Server(stellarConfig.horizonUrl);
    this.networkPassphrase = stellarConfig.networkPassphrase;
    this.friendbotUrl = stellarConfig.friendbotUrl;
  }

  async getAccount(publicKey: string): Promise<any> {
    try {
      return await this.server.loadAccount(publicKey);
    } catch (error) {
      throw new StellarError('Failed to load account', error as Error, { publicKey });
    }
  }

  async submitTransaction(transaction: Transaction): Promise<any> {
    try {
      return await this.server.submitTransaction(transaction);
    } catch (error) {
      throw new StellarError('Transaction submission failed', error as Error, { 
        hash: transaction.hash().toString('hex') 
      });
    }
  }

  async fetchBaseFee(): Promise<number> {
    try {
      return await this.server.fetchBaseFee();
    } catch (error) {
      throw new StellarError('Failed to fetch base fee', error as Error);
    }
  }

  async getTransactions(publicKey: string, limit = 10): Promise<any> {
    try {
      return await this.server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();
    } catch (error) {
      throw new StellarError('Failed to fetch transactions', error as Error, { publicKey });
    }
  }

  async getPayments(publicKey: string, limit = 10): Promise<any> {
    try {
      return await this.server
        .payments()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();
    } catch (error) {
      throw new StellarError('Failed to fetch payments', error as Error, { publicKey });
    }
  }

  async fundAccount(publicKey: string): Promise<void> {
    if (!this.friendbotUrl) {
      throw new StellarError('Friendbot URL not configured for account funding');
    }

    try {
      const response = await fetch(`${this.friendbotUrl}?addr=${publicKey}`);
      if (!response.ok) {
        throw new Error(`Friendbot request failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new StellarError('Account funding failed', error as Error, { publicKey });
    }
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getServer(): Horizon.Server {
    return this.server;
  }

  async isAccountExists(publicKey: string): Promise<boolean> {
    try {
      await this.getAccount(publicKey);
      return true;
    } catch (error) {
      if (error instanceof StellarError && error.originalError?.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }
}

// Remove default instance export to avoid circular dependencies