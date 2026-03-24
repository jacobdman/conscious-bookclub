import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { getAppOrigin } from 'utils/appOrigin';

const ENV_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production browser: relative /api (Firebase Hosting rewrite).
// In production native (Capacitor): absolute URL — relative /api would resolve to capacitor://localhost/api.
// In development: local Functions emulator.
const DEV_API_HOST = process.env.REACT_APP_API_HOST || 'localhost';

const getBaseUrl = () => {
  if (!ENV_IS_PRODUCTION) {
    return `http://${DEV_API_HOST}:5001/conscious-bookclub-87073-9eb71/us-central1/api`;
  }
  if (Capacitor.isNativePlatform()) {
    return `${getAppOrigin()}/api`;
  }
  return '/api';
};

class API {
  get = async (url, config) => {
    return await axios.get(`${getBaseUrl()}${url}`, config);
  };

  post = async (url, data, config) => {
    return await axios.post(`${getBaseUrl()}${url}`, data, config);
  };

  delete = async (url, config) => {
    return await axios.delete(`${getBaseUrl()}${url}`, config);
  };
}

const api = new API();
export default api;
