import { Asset, Keypair } from '@stellar/stellar-sdk';
import { TransactionService } from './transaction.service';
import { AccountService } from './account.service';
import { StellarError } from './error-handler.service';

export interface AssetInfo {
  code: string;
  issuer: string;
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  balance?: string;
  limit?: string;
  flags?: {
    auth_required?: boolean;
    auth_revocable?: boolean;
    auth_immutable?: boolean;
  };
}

export interface AssetMetadata {
  name?: string;
  description?: string;
  image?: string;
  conditions?: string;
}

export interface CreateAssetParams {
  code: string;
  issuerKeypair: Keypair;
  distributorKeypair?: Keypair;
  limit?: string;
  metadata?: AssetMetadata;
}

export interface AssetTransferParams {
  sourceKeypair: Keypair;
  destination: string;
  asset: Asset;
  amount: string;
  memo?: string;
}

export class AssetService {
  constructor(
    private transactionService?: TransactionService,
    private accountService?: AccountService
  ) {
    this.transactionService = transactionService || new TransactionService();
    this.accountService = accountService || new AccountService();
  }

  createAsset(code: string, issuer: string): Asset {
    try {
      if (code === 'XLM' || !issuer) {
        return Asset.native();
      }
      return new Asset(code, issuer);
    } catch (error) {
      throw new StellarError('Failed to create asset', error as Error, { code, issuer });
    }
  }

  validateAssetCode(code: string): boolean {
    if (!code) return false;
    if (code === 'XLM') return true;
    
    const alphanumRegex = /^[A-Za-z0-9]{1,12}$/;
    return alphanumRegex.test(code) && code.length >= 1 && code.length <= 12;
  }

  getAssetType(asset: Asset): 'native' | 'credit_alphanum4' | 'credit_alphanum12' {
    if (asset.isNative()) {
      return 'native';
    }
    
    const codeLength = asset.getCode().length;
    return codeLength <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
  }

  async createCustomAsset(params: CreateAssetParams) {
    const { code, issuerKeypair, distributorKeypair, limit, metadata } = params;

    if (!this.validateAssetCode(code)) {
      throw new StellarError('Invalid asset code', undefined, { code });
    }

    try {
      const asset = new Asset(code, issuerKeypair.publicKey());
      
      const result = {
        asset,
        code,
        issuer: issuerKeypair.publicKey(),
        type: this.getAssetType(asset),
        metadata,
      };

      if (distributorKeypair) {
        const trustlineResult = await this.transactionService.createTrustline(
          distributorKeypair,
          asset,
          limit
        );

        return {
          ...result,
          distributorPublicKey: distributorKeypair.publicKey(),
          trustlineHash: trustlineResult.hash,
          trustlineStatus: trustlineResult.status,
        };
      }

      return result;
    } catch (error) {
      throw new StellarError('Failed to create custom asset', error as Error, { code, issuer: issuerKeypair.publicKey() });
    }
  }

  async transferAsset(params: AssetTransferParams) {
    const { sourceKeypair, destination, asset, amount, memo } = params;

    return await this.transactionService.sendPayment(
      sourceKeypair,
      { destination, asset, amount },
      { memo }
    );
  }

  async transferNative(sourceKeypair: Keypair, destination: string, amount: string, memo?: string) {
    return await this.transactionService.sendNativePayment(
      sourceKeypair,
      destination,
      amount,
      { memo }
    );
  }

  async getAccountAssets(publicKey: string): Promise<AssetInfo[]> {
    const balances = await this.accountService.getBalances(publicKey);
    
    return balances.map(balance => ({
      code: balance.asset_type === 'native' ? 'XLM' : balance.asset_code || 'UNKNOWN',
      issuer: balance.asset_issuer || '',
      type: balance.asset_type as 'native' | 'credit_alphanum4' | 'credit_alphanum12',
      balance: balance.balance,
      limit: balance.limit,
    }));
  }

  async getAssetBalance(publicKey: string, asset: Asset): Promise<string> {
    if (asset.isNative()) {
      return await this.accountService.getNativeBalance(publicKey);
    }
    
    return await this.accountService.getAssetBalance(
      publicKey,
      asset.getCode(),
      asset.getIssuer()
    );
  }

  async hasAsset(publicKey: string, asset: Asset): Promise<boolean> {
    try {
      const balance = await this.getAssetBalance(publicKey, asset);
      return parseFloat(balance) >= 0;
    } catch (error) {
      return false;
    }
  }

  parseAssetString(assetString: string): Asset {
    try {
      if (assetString === 'native' || assetString === 'XLM') {
        return Asset.native();
      }

      const [code, issuer] = assetString.split(':');
      if (!code || !issuer) {
        throw new Error('Invalid asset format. Expected format: CODE:ISSUER');
      }

      return new Asset(code, issuer);
    } catch (error) {
      throw new StellarError('Failed to parse asset string', error as Error, { assetString });
    }
  }

  assetToString(asset: Asset): string {
    if (asset.isNative()) {
      return 'XLM';
    }
    return `${asset.getCode()}:${asset.getIssuer()}`;
  }

  compareAssets(asset1: Asset, asset2: Asset): boolean {
    return asset1.equals(asset2);
  }

  async estimateTransferCost(asset: Asset, operationCount: number = 1): Promise<string> {
    return await this.transactionService.estimateTransactionFee('', operationCount);
  }

  async bulkTransfer(
    sourceKeypair: Keypair,
    transfers: Array<{
      destination: string;
      asset: Asset;
      amount: string;
    }>,
    memo?: string
  ) {
    if (transfers.length === 0) {
      throw new StellarError('No transfers specified');
    }

    if (transfers.length > 100) {
      throw new StellarError('Too many transfers in single transaction', undefined, {
        count: transfers.length,
        max: 100
      });
    }

    try {
      const builder = await this.transactionService.createTransactionBuilder(
        sourceKeypair.publicKey(),
        { memo }
      );

      transfers.forEach(transfer => {
        builder.addOperation({
          type: 'payment',
          destination: transfer.destination,
          asset: transfer.asset,
          amount: transfer.amount,
        } as any);
      });

      const transaction = builder.setTimeout(30).build();
      
      return await this.transactionService.signAndSubmit(transaction, [sourceKeypair]);
    } catch (error) {
      throw new StellarError('Bulk transfer failed', error as Error, {
        transferCount: transfers.length,
        source: sourceKeypair.publicKey(),
      });
    }
  }

  validateAmount(amount: string): boolean {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 9223372036854775807;
  }

  formatAmount(amount: string, decimals: number = 7): string {
    const numAmount = parseFloat(amount);
    return numAmount.toFixed(decimals).replace(/\.?0+$/, '');
  }
}

// Remove default instance export to avoid circular dependencies