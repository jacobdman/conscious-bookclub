import axios from 'axios';

const ENV_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, use relative path which will be proxied by Firebase Hosting
// In development, use local emulator
const BASE_URL = ENV_IS_PRODUCTION
  ? '/api'
  : 'http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1/api';

class API {
  get = async (url, config) => {
    return await axios.get(`${BASE_URL}${url}`, config);
  };

  post = async (url, data, config) => {
    return await axios.post(`${BASE_URL}${url}`, data, config);
  };

  delete = async (url, config) => {
    return await axios.delete(`${BASE_URL}${url}`, config);
  };
}

const api = new API();
export default api;
