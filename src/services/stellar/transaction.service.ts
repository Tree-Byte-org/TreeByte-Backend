import { 
  TransactionBuilder, 
  Transaction, 
  Keypair, 
  Operation,
  Asset,
  Memo
} from '@stellar/stellar-sdk';
import { StellarClientService } from './stellar-client.service';
import { AccountService } from './account.service';
import { StellarError, StellarErrorHandler } from './error-handler.service';

export interface PaymentOperation {
  destination: string;
  asset: Asset;
  amount: string;
}

export interface TransactionOptions {
  fee?: string;
  memo?: string;
  timeBounds?: {
    minTime?: number;
    maxTime?: number;
  };
}

export interface TransactionResult {
  hash: string;
  status: 'success' | 'failed';
  response: any;
}

export interface TransactionHistory {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  fee_charged: string;
  successful: boolean;
  operation_count: number;
  memo?: string;
}

export interface PaymentRecord {
  id: string;
  transaction_hash: string;
  created_at: string;
  source_account: string;
  to: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  amount: string;
}

export class TransactionService {
  constructor(
    private stellarClient?: StellarClientService,
    private accountService?: AccountService
  ) {
    this.stellarClient = stellarClient || new StellarClientService();
    this.accountService = accountService || new AccountService();
  }

  async createTransactionBuilder(sourcePublicKey: string, options?: TransactionOptions): Promise<TransactionBuilder> {
    const account = await this.accountService!.getAccount(sourcePublicKey);
    const baseFee = await this.stellarClient!.fetchBaseFee();
    
    const fee = options?.fee || String(baseFee);
    
    const builder = new TransactionBuilder(account, {
      fee,
      networkPassphrase: this.stellarClient!.getNetworkPassphrase(),
      timebounds: options?.timeBounds,
    });

    if (options?.memo) {
      builder.addMemo(Memo.text(options.memo));
    }

    return builder;
  }

  async sendPayment(
    sourceKeypair: Keypair,
    payment: PaymentOperation,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    try {
      const builder = await this.createTransactionBuilder(sourceKeypair.publicKey(), options);
      
      builder.addOperation(Operation.payment({
        destination: payment.destination,
        asset: payment.asset,
        amount: payment.amount,
      }));

      const transaction = builder.setTimeout(30).build();
      transaction.sign(sourceKeypair);

      const response = await StellarErrorHandler.withRetry(async () => {
        return await this.stellarClient!.submitTransaction(transaction);
      });

      return {
        hash: transaction.hash().toString('hex'),
        status: response.successful ? 'success' : 'failed',
        response,
      };
    } catch (error) {
      throw new StellarError('Payment transaction failed', error as Error, {
        source: sourceKeypair.publicKey(),
        destination: payment.destination,
        amount: payment.amount,
      });
    }
  }

  async sendNativePayment(
    sourceKeypair: Keypair,
    destination: string,
    amount: string,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    return this.sendPayment(
      sourceKeypair,
      {
        destination,
        asset: Asset.native(),
        amount,
      },
      options
    );
  }

  async createTrustline(
    sourceKeypair: Keypair,
    asset: Asset,
    limit?: string,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    try {
      const builder = await this.createTransactionBuilder(sourceKeypair.publicKey(), options);
      
      builder.addOperation(Operation.changeTrust({
        asset,
        limit,
      }));

      const transaction = builder.setTimeout(30).build();
      transaction.sign(sourceKeypair);

      const response = await StellarErrorHandler.withRetry(async () => {
        return await this.stellarClient!.submitTransaction(transaction);
      });

      return {
        hash: transaction.hash().toString('hex'),
        status: response.successful ? 'success' : 'failed',
        response,
      };
    } catch (error) {
      throw new StellarError('Trustline creation failed', error as Error, {
        source: sourceKeypair.publicKey(),
        assetCode: asset.code,
        assetIssuer: asset.issuer,
        limit,
      });
    }
  }

  async removeTrustline(
    sourceKeypair: Keypair,
    asset: Asset,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    return this.createTrustline(sourceKeypair, asset, '0', options);
  }

  async getTransactionHistory(publicKey: string, limit = 10): Promise<TransactionHistory[]> {
    const response = await this.stellarClient!.getTransactions(publicKey, limit);
    
    return response.records.map((record: any) => ({
      id: record.id,
      hash: record.hash,
      created_at: record.created_at,
      source_account: record.source_account,
      fee_charged: record.fee_charged,
      successful: record.successful,
      operation_count: record.operation_count,
      memo: record.memo,
    }));
  }

  async getPaymentHistory(publicKey: string, limit = 10): Promise<PaymentRecord[]> {
    const response = await this.stellarClient!.getPayments(publicKey, limit);
    
    return response.records.map((record: any) => ({
      id: record.id,
      transaction_hash: record.transaction_hash,
      created_at: record.created_at,
      source_account: record.source_account,
      to: record.to,
      asset_type: record.asset_type,
      asset_code: record.asset_code,
      asset_issuer: record.asset_issuer,
      amount: record.amount,
    }));
  }

  async getTransaction(hash: string): Promise<any> {
    try {
      return await this.stellarClient!.getServer().transactions().transaction(hash).call();
    } catch (error) {
      throw new StellarError('Failed to fetch transaction', error as Error, { hash });
    }
  }

  async waitForTransaction(hash: string, timeout = 30000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeout) {
      try {
        return await this.getTransaction(hash);
      } catch (error) {
        if (error instanceof StellarError && error.originalError?.message.includes('404')) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }
    }

    throw new StellarError('Transaction confirmation timeout', undefined, { hash, timeout });
  }

  calculateFee(operationCount: number): string {
    const baseFeeStroops = 100; // 100 stroops per operation
    return String(baseFeeStroops * operationCount);
  }

  async estimateTransactionFee(sourcePublicKey: string, operations: number = 1): Promise<string> {
    try {
      const baseFee = await this.stellarClient!.fetchBaseFee();
      return String(baseFee * operations);
    } catch (error) {
      return this.calculateFee(operations);
    }
  }

  buildTransaction(sourceAccount: any, operations: any[], options?: TransactionOptions): Transaction {
    const builder = new TransactionBuilder(sourceAccount, {
      fee: options?.fee || '100',
      networkPassphrase: this.stellarClient!.getNetworkPassphrase(),
      timebounds: options?.timeBounds,
    });

    operations.forEach(op => builder.addOperation(op));

    if (options?.memo) {
      builder.addMemo(Memo.text(options.memo));
    }

    return builder.setTimeout(30).build();
  }

  async signAndSubmit(transaction: Transaction, signers: Keypair[]): Promise<TransactionResult> {
    try {
      signers.forEach(signer => transaction.sign(signer));

      const response = await StellarErrorHandler.withRetry(async () => {
        return await this.stellarClient!.submitTransaction(transaction);
      });

      return {
        hash: transaction.hash().toString('hex'),
        status: response.successful ? 'success' : 'failed',
        response,
      };
    } catch (error) {
      throw new StellarError('Transaction submission failed', error as Error, {
        hash: transaction.hash().toString('hex'),
        signers: signers.map(s => s.publicKey()),
      });
    }
  }
}

// Remove default instance export to avoid circular dependencies