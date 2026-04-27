require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://cap_user:cap_password@localhost:5432/community_aid',
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  
  nlp: {
    serviceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:5001',
  },
  
  twilio: {
    sid: process.env.TWILIO_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phone: process.env.TWILIO_PHONE,
  },
  
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
  },
};
