require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  seed: {
    superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@clinicy.local',
    superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe123!',
  },
  cancellationCutoffHours: Number(process.env.CANCELLATION_CUTOFF_HOURS || 2),
  ticketSlaHours: Number(process.env.TICKET_SLA_HOURS || 48),
  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'http://localhost:5173',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:4000',
};
