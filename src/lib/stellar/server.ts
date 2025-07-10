import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';

export const stellarServer = new Horizon.Server(STELLAR_CONFIG.horizonURL);

export const loadAccount = async (publicKey: string) => {
  return stellarServer.loadAccount(publicKey);
};

export const fetchBaseFee = async () => {
  return stellarServer.fetchBaseFee();
};
