import { Asset, Keypair } from '@stellar/stellar-sdk';
import { TransactionService } from './transaction.service';
import { AccountService } from './account.service';
import { AssetService } from './asset.service';
import { StellarError, StellarErrorHandler } from './error-handler.service';

export interface TrustlineInfo {
  asset_code: string;
  asset_issuer: string;
  asset_type: string;
  balance: string;
  limit: string;
  is_authorized: boolean;
  is_authorized_to_maintain_liabilities: boolean;
  is_clawback_enabled: boolean;
}

export interface CreateTrustlineParams {
  sourceKeypair: Keypair;
  asset: Asset;
  limit?: string;
  memo?: string;
}

export interface TrustlineStatus {
  exists: boolean;
  balance: string;
  limit?: string;
  authorized: boolean;
}

export class TrustlineService {
  constructor(
    private transactionService?: TransactionService,
    private accountService?: AccountService,
    private assetService?: AssetService
  ) {
    this.transactionService = transactionService || new TransactionService();
    this.accountService = accountService || new AccountService();
    this.assetService = assetService || new AssetService();
  }

  async createTrustline(params: CreateTrustlineParams) {
    const { sourceKeypair, asset, limit, memo } = params;

    if (asset.isNative()) {
      throw new StellarError('Cannot create trustline for native XLM asset');
    }

    const exists = await this.checkTrustline(sourceKeypair.publicKey(), asset);
    if (exists) {
      throw new StellarError('Trustline already exists', undefined, {
        publicKey: sourceKeypair.publicKey(),
        assetCode: asset.getCode(),
        assetIssuer: asset.getIssuer(),
      });
    }

    return await this.transactionService.createTrustline(
      sourceKeypair,
      asset,
      limit,
      { memo }
    );
  }

  async removeTrustline(sourceKeypair: Keypair, asset: Asset, memo?: string) {
    if (asset.isNative()) {
      throw new StellarError('Cannot remove trustline for native XLM asset');
    }

    const balance = await this.assetService.getAssetBalance(
      sourceKeypair.publicKey(),
      asset
    );
    
    if (parseFloat(balance) > 0) {
      throw new StellarError('Cannot remove trustline with positive balance', undefined, {
        balance,
        assetCode: asset.getCode(),
        assetIssuer: asset.getIssuer(),
      });
    }

    return await this.transactionService.removeTrustline(
      sourceKeypair,
      asset,
      { memo }
    );
  }

  async checkTrustline(publicKey: string, asset: Asset): Promise<boolean> {
    if (asset.isNative()) {
      return true; // XLM trustline always exists
    }

    const balances = await this.accountService.getBalances(publicKey);
    
    return balances.some(balance => {
      if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
        return (
          balance.asset_code === asset.getCode() &&
          balance.asset_issuer === asset.getIssuer()
        );
      }
      return false;
    });
  }

  async getTrustlineInfo(publicKey: string, asset: Asset): Promise<TrustlineInfo | null> {
    if (asset.isNative()) {
      const balance = await this.accountService.getNativeBalance(publicKey);
      return {
        asset_code: 'XLM',
        asset_issuer: '',
        asset_type: 'native',
        balance,
        limit: '922337203685.4775807', // Max XLM limit
        is_authorized: true,
        is_authorized_to_maintain_liabilities: true,
        is_clawback_enabled: false,
      };
    }

    const balances = await this.accountService.getBalances(publicKey);
    const trustline = balances.find(balance => 
      balance.asset_code === asset.getCode() && 
      balance.asset_issuer === asset.getIssuer()
    );

    if (!trustline) {
      return null;
    }

    return {
      asset_code: trustline.asset_code || '',
      asset_issuer: trustline.asset_issuer || '',
      asset_type: trustline.asset_type,
      balance: trustline.balance,
      limit: trustline.limit || '0',
      is_authorized: true, // TODO: Get from account flags
      is_authorized_to_maintain_liabilities: true, // TODO: Get from account flags
      is_clawback_enabled: false, // TODO: Get from asset flags
    };
  }

  async getTrustlineStatus(publicKey: string, asset: Asset): Promise<TrustlineStatus> {
    const trustlineInfo = await this.getTrustlineInfo(publicKey, asset);
    
    if (!trustlineInfo) {
      return {
        exists: false,
        balance: '0',
        authorized: false,
      };
    }

    return {
      exists: true,
      balance: trustlineInfo.balance,
      limit: trustlineInfo.limit,
      authorized: trustlineInfo.is_authorized,
    };
  }

  async getAllTrustlines(publicKey: string): Promise<TrustlineInfo[]> {
    const balances = await this.accountService.getBalances(publicKey);
    
    return balances.map(balance => ({
      asset_code: balance.asset_type === 'native' ? 'XLM' : balance.asset_code || '',
      asset_issuer: balance.asset_issuer || '',
      asset_type: balance.asset_type,
      balance: balance.balance,
      limit: balance.limit || (balance.asset_type === 'native' ? '922337203685.4775807' : '0'),
      is_authorized: true, // TODO: Get from account flags
      is_authorized_to_maintain_liabilities: true, // TODO: Get from account flags
      is_clawback_enabled: false, // TODO: Get from asset flags
    }));
  }

  async updateTrustlineLimit(sourceKeypair: Keypair, asset: Asset, newLimit: string, memo?: string) {
    if (asset.isNative()) {
      throw new StellarError('Cannot update limit for native XLM asset');
    }

    const exists = await this.checkTrustline(sourceKeypair.publicKey(), asset);
    if (!exists) {
      throw new StellarError('Trustline does not exist', undefined, {
        publicKey: sourceKeypair.publicKey(),
        assetCode: asset.getCode(),
        assetIssuer: asset.getIssuer(),
      });
    }

    return await this.transactionService.createTrustline(
      sourceKeypair,
      asset,
      newLimit,
      { memo }
    );
  }

  async createMultipleTrustlines(
    sourceKeypair: Keypair,
    assets: Array<{ asset: Asset; limit?: string }>,
    memo?: string
  ) {
    if (assets.length === 0) {
      throw new StellarError('No assets specified for trustline creation');
    }

    if (assets.length > 100) {
      throw new StellarError('Too many trustlines in single transaction', undefined, {
        count: assets.length,
        max: 100
      });
    }

    try {
      const builder = await this.transactionService.createTransactionBuilder(
        sourceKeypair.publicKey(),
        { memo }
      );

      for (const { asset, limit } of assets) {
        if (asset.isNative()) {
          continue; // Skip native asset
        }

        const exists = await this.checkTrustline(sourceKeypair.publicKey(), asset);
        if (exists) {
          continue; // Skip existing trustlines
        }

        builder.addOperation({
          type: 'changeTrust',
          asset,
          limit,
        } as any);
      }

      const transaction = builder.setTimeout(30).build();
      
      return await this.transactionService.signAndSubmit(transaction, [sourceKeypair]);
    } catch (error) {
      throw new StellarError('Multiple trustline creation failed', error as Error, {
        assetCount: assets.length,
        source: sourceKeypair.publicKey(),
      });
    }
  }

  async waitForTrustline(publicKey: string, asset: Asset, timeout = 30000): Promise<boolean> {
    return await StellarErrorHandler.withRetry(async () => {
      const startTime = Date.now();
      const pollInterval = 2000; // 2 seconds

      while (Date.now() - startTime < timeout) {
        const exists = await this.checkTrustline(publicKey, asset);
        if (exists) {
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      throw new StellarError('Trustline confirmation timeout', undefined, { 
        publicKey, 
        assetCode: asset.getCode(),
        assetIssuer: asset.getIssuer(),
        timeout 
      });
    });
  }

  validateTrustlineLimit(limit: string): boolean {
    const numLimit = parseFloat(limit);
    return !isNaN(numLimit) && numLimit >= 0 && numLimit <= 922337203685.4775807;
  }

  async canReceiveAsset(publicKey: string, asset: Asset, amount: string): Promise<boolean> {
    const trustlineInfo = await this.getTrustlineInfo(publicKey, asset);
    
    if (!trustlineInfo) {
      return false;
    }

    if (!trustlineInfo.is_authorized) {
      return false;
    }

    if (asset.isNative()) {
      return true; // XLM has no practical limit
    }

    const currentBalance = parseFloat(trustlineInfo.balance);
    const transferAmount = parseFloat(amount);
    const limit = parseFloat(trustlineInfo.limit);

    return (currentBalance + transferAmount) <= limit;
  }
}

// Remove default instance export to avoid circular dependencies