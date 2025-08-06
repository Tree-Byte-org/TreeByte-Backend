import { Keypair } from '@stellar/stellar-sdk';
import { 
  stellarClientService, 
  accountService, 
  transactionService 
} from '@/services/stellar';

export const generateKeypair = () => accountService.createKeypair();

export const loadAccount = async (publicKey: string) => {
  return stellarClientService.getAccount(publicKey);
};

export const createTransactionSkeleton = async (sourcePublicKey: string) => {
  return transactionService.createTransactionBuilder(sourcePublicKey);
};
