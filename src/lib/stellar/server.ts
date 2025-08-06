import { stellarClientService } from '@/services/stellar';

export const stellarServer = stellarClientService.getServer();

export const loadAccount = async (publicKey: string) => {
  return stellarClientService.getAccount(publicKey);
};

export const fetchBaseFee = async () => {
  return stellarClientService.fetchBaseFee();
};
