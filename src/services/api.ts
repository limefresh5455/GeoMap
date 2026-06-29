import axios from 'axios';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reset } from '../navigation/NavigationService';

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
    const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthRoute) {
      if (!originalRequest._retry) {
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
          // If refresh fails, clear tokens and redirect to login
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('refreshToken');
          reset('Login');
          return Promise.reject(refreshError);
        }
      } else {
        // If already retried, clear tokens and redirect to login
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('refreshToken');
        reset('Login');
      }
    }

    return Promise.reject(error);
  }
);