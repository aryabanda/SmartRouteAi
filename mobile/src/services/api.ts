import axios from 'axios';

export const searchAPI = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  headers: {
    Accept: 'application/json',
    'User-Agent': 'SmartRouteAI/1.0',
  },
});