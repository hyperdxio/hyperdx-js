const https = require('https');

const axios = require('axios');

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 30000,
});

module.exports = axiosInstance;
