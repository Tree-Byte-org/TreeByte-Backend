import dotenv from 'dotenv';
import { envSchema, NodeEnv } from '@/config/env-schema';
import development from './development';
import staging from './staging';
import production from './production';


dotenv.config();

const { value: envVars, error } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
  stripUnknown: false,
});

if (error) {
  const details = error.details.map(d => `- ${d.message}`).join('\n');
  // Do not log actual env values
  throw new Error(`Configuration validation error:\n${details}`);
}

export interface AppConfig {
  server: {
    port: number;
    environment: NodeEnv;
  };
  database: {
    url: string;
    key: string;
  };
  stellar: {
    network: 'testnet' | 'mainnet';
    horizonUrl: string;
    networkPassphrase: string;
    friendbotUrl?: string;
    fundingAccountSecret?: string;
  };
  external: {
    pinata: {
      apiKey?: string;
      secretKey?: string;
      gatewayUrl: string;
      gateways: string[]; // fallback gateways
    };
  };
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  mailer: {
    service?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  };
  api: {
    baseUrl?: string;
  };
}

const envName = (envVars.NODE_ENV as NodeEnv) || 'development';

const envSpecific = {
  development,
  staging,
  production,
  test: development,
}[envName];

const passphrase = envVars.NETWORK_PASSPHRASE || envVars.STELLAR_NETWORK_PASSPHRASE;

export const appConfig: AppConfig = {
  server: {
    port: Number(envVars.PORT) || 3000,
    environment: envName,
  },
  database: {
    url: envVars.SUPABASE_URL,
    key: envVars.SUPABASE_ANON_KEY,
  },
  stellar: {
    network: envVars.STELLAR_NETWORK,
    horizonUrl:
      envVars.HORIZON_URL ||
      (envVars.STELLAR_NETWORK === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org'),
    networkPassphrase:
      passphrase ||
      (envVars.STELLAR_NETWORK === 'mainnet'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015'),
    friendbotUrl:
      envVars.FRIEND_BOT_URL ||
      (envVars.STELLAR_NETWORK === 'testnet' ? 'https://friendbot.stellar.org' : undefined),
    fundingAccountSecret: envVars.STELLAR_FUNDING_ACCOUNT_SECRET,
  },
  external: {
    pinata: {
      apiKey: envVars.PINATA_API_KEY,
      secretKey: envVars.PINATA_SECRET_API_KEY || envVars.PINATA_SECRET_KEY,
      gatewayUrl: envVars.PINATA_GATEWAY_URL,
      gateways: (envVars.IPFS_GATEWAYS || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    },
  },
  security: {
    jwtSecret: envVars.JWT_SECRET,
    encryptionKey: envVars.ENCRYPTION_KEY,
  },
  mailer: {
    service: envVars.MAIL_SERVICE,
    host: envVars.MAIL_HOST,
    port: envVars.MAIL_PORT ? Number(envVars.MAIL_PORT) : undefined,
    secure: envVars.MAIL_SECURE ? envVars.MAIL_SECURE === 'true' : undefined,
    user: envVars.MAIL_USER,
    pass: envVars.MAIL_PASS,
  },
  api: {
    baseUrl: envVars.API_URL,
  },
};

// Apply environment-specific overrides (without touching sensitive defaults if not provided)
export const config: AppConfig = {
  ...appConfig,
  ...envSpecific?.overrides,
};
