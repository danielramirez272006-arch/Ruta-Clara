import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export function getEnvConfig() {
  const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();

  return {
    port: Number(process.env.PORT || 3001),
    db: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || 'ruta_clara',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    },
    allowedOrigins,
    deepseek: {
      apiKey: deepseekKey,
      model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
      baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').trim().replace(/\/$/, '')
    },
    anthropic: {
      apiKey: anthropicKey,
      model: (process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest').trim()
    }
  };
}
