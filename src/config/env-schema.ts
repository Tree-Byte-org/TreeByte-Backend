import Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // Database (Supabase)
  SUPABASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  SUPABASE_ANON_KEY: Joi.string().min(10).required(),

  // Stellar
  STELLAR_NETWORK: Joi.string().valid('testnet', 'mainnet').default('testnet'),
  HORIZON_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  FRIEND_BOT_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  NETWORK_PASSPHRASE: Joi.string().optional(),
  STELLAR_NETWORK_PASSPHRASE: Joi.string().optional(),
  STELLAR_FUNDING_ACCOUNT_SECRET: Joi.string().optional(),

  // External Services: Pinata/IPFS
  PINATA_API_KEY: Joi.string().optional(),
  PINATA_SECRET_API_KEY: Joi.string().optional(),
  PINATA_SECRET_KEY: Joi.string().optional(), // legacy name
  PINATA_GATEWAY_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('https://gateway.pinata.cloud'),
  IPFS_GATEWAYS: Joi.string().optional(), // comma-separated list

  // Security (required in staging/production; dev gets safe defaults)
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().min(32).required(),
    otherwise: Joi.string()
      .min(32)
      .default('dev-insecure-jwt-secret-please-change-32+chars'),
  }),
  ENCRYPTION_KEY: Joi.when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.string().min(32).required(),
    otherwise: Joi.string()
      .min(32)
      .default('dev-insecure-encryption-key-change-32+chars'),
  }),

  // Mailer
  MAIL_SERVICE: Joi.string().optional(),
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().port().optional(),
  MAIL_SECURE: Joi.string().valid('true', 'false').optional(),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASS: Joi.string().optional(),

  // API base (useful for tests)
  API_URL: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
}).unknown();

export type NodeEnv = 'development' | 'staging' | 'production' | 'test';
