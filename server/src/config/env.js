import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string(),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('bezpay'),

  MONNIFY_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  MONNIFY_API_KEY: z.string().min(1),
  MONNIFY_SECRET_KEY: z.string().min(1),
  MONNIFY_CONTRACT_CODE: z.string().min(1),
  MONNIFY_WALLET_ACCOUNT_NUMBER: z.string().min(1),
  MONNIFY_VALIDATE_PATH: z.string().default('/api/v1/disbursements/account/validate'),

  INFLOW_FEE_BPS: z.coerce.number().int().min(0).max(1000).default(150),
  INFLOW_FEE_CAP_NGN: z.coerce.number().min(0).default(2000),
  BEZPAY_FEE_FLAT_NGN: z.coerce.number().min(0).default(100),
  BEZPAY_FEE_BPS: z.coerce.number().int().min(0).default(0),

  MIN_AMOUNT_NGN: z.coerce.number().default(100),
  MAX_AMOUNT_NGN: z.coerce.number().default(5000000),
  TX_EXPIRY_MINUTES: z.coerce.number().default(40),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const i of parsed.error.issues) console.error(` - ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const MONNIFY_BASE_URL =
  env.MONNIFY_ENV === 'live' ? 'https://api.monnify.com' : 'https://sandbox.monnify.com';
