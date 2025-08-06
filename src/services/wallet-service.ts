import { walletService } from '@/services/stellar';

export function generateStellarWallet(passphrase: string) {
  return walletService.generateWallet(passphrase);
}
