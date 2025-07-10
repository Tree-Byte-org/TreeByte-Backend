import { Keypair } from '@stellar/stellar-sdk';
import { encrypt } from '@/utils/encryption';

export function generateStellarWallet(passphrase: string) {
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  const encryptedSecret = encrypt(secretKey, passphrase);

  return {
    publicKey,
    encryptedSecret,
  };
}
