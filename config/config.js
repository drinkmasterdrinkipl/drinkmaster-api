require('dotenv').config();

module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:19006', 'http://localhost:8081', 'exp://192.168.*.*:8081'],
    credentials: true
  }
};
