import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const api = axios.create({
  baseURL: Config.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // Use a clean axios instance for refresh to avoid interceptor loops
        const refreshResponse = await axios.post(`${Config.API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data;

        await AsyncStorage.setItem('userToken', access_token);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and potentially redirect to login
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('refreshToken');
        // You might want to trigger a navigation reset here or use an event emitter
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);