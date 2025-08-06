import { Keypair, Asset } from '@stellar/stellar-sdk';
import { encrypt } from '@/utils/encryption';
import { checkTrustline } from '@/services/stellar/check-trustline';
import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';

const server = new Horizon.Server(STELLAR_CONFIG.horizonURL);
const USDC_TEST_ISSUER = 'GA5ZSE7FRLNSJ45BPSF2F7DWQUHQIFU6UKX6DS7SHPCKBBZB2DFW6EX'; // emisor de USDC en testnet o ejemplo
const ASSET_CODE = 'USDC';
const PASSPHRASE = 'test-passphrase';

function generateStellarWallet(passphrase: string) {
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const secretKey = keypair.secret();

  const encryptedSecret = encrypt(secretKey, passphrase);

  return {
    publicKey,
    encryptedSecret,
    rawSecret: secretKey, // solo para debugging
  };
}

async function fundTestnetWallet(publicKey: string) {
  const url = `${STELLAR_CONFIG.friendbotURL}?addr=${publicKey}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Friendbot failed: ${response.statusText}`);
    console.log(`✅ Wallet funded: ${publicKey}`);
    return response;
  } catch (err: any) {
    console.error('❌ Error funding wallet in testnet:', err.response?.data || err.message);
    throw err;
  }
}

(async () => {
  try {
    // Paso 1: Generar wallet
    console.log('🔐 Generating wallet...');
    const { publicKey, encryptedSecret, rawSecret } = generateStellarWallet(PASSPHRASE);
    console.log('→ Public Key:', publicKey);
    console.log('→ Raw Secret:', rawSecret);
    console.log('→ Encrypted Secret:', encryptedSecret);

    // Paso 2: Fondear en testnet
    console.log('💰 Funding wallet on testnet...');
    await fundTestnetWallet(publicKey);

    // Wait a bit for account to be created
    console.log('⏳ Waiting for account creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Paso 3: Verificar si tiene trustline a USDC usando el servicio refactorizado
    const hasTrustline = await checkTrustline({
      userPublicKey: publicKey,
      assetCode: ASSET_CODE,
      issuerPublicKey: USDC_TEST_ISSUER,
    });
    
    console.log(`🔍 Trustline to ${ASSET_CODE}:`, hasTrustline ? '✅ YES' : '❌ NO');

    // Paso 4: Obtener información de la cuenta usando el server directo
    console.log('🔍 Account information:');
    const account = await server.loadAccount(publicKey);
    console.log(`→ Account ID: ${account.id}`);
    console.log(`→ Sequence: ${account.sequence}`);
    
    console.log(`📋 Found ${account.balances.length} balances:`);
    account.balances.forEach((balance: any, index: number) => {
      const assetName = balance.asset_type === 'native' ? 'XLM' : balance.asset_code;
      console.log(`${index + 1}. ${assetName} - Balance: ${balance.balance}`);
    });

    console.log('\n✅ Trustline test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
