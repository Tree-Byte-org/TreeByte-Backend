// Core services
export * from './stellar-client.service';
export * from './error-handler.service';
export * from './connection-manager.service';

// Domain services
export * from './account.service';
export * from './wallet.service';
export * from './transaction.service';
export * from './asset.service';
export * from './trustline.service';

// Create instances only when needed to avoid circular dependencies
export const stellarClientService = new (require('./stellar-client.service').StellarClientService)();
export const accountService = new (require('./account.service').AccountService)();
export const walletService = new (require('./wallet.service').WalletService)();
export const transactionService = new (require('./transaction.service').TransactionService)();
export const assetService = new (require('./asset.service').AssetService)();
export const trustlineService = new (require('./trustline.service').TrustlineService)();
export const connectionManager = new (require('./connection-manager.service').ConnectionManagerService)();