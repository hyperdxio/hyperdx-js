const axios = require('axios'); // WARNING: axios v1 might break due to esm module import

const axiosInstance = axios.create();

module.exports = axiosInstance;
