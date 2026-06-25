import { api } from './api';
import { WeatherRequest, WeatherForecastResponse, AirQualityResponse } from './types';

export const weatherService = {
  getForecast: async (data?: WeatherRequest): Promise<WeatherForecastResponse> => {
    const response = await api.post<WeatherForecastResponse>('/weather/forecast', data || {});
    return response.data;
  },

  getAirQuality: async (data?: WeatherRequest): Promise<AirQualityResponse> => {
    const response = await api.post<AirQualityResponse>('/weather/air-quality', data || {});
    return response.data;
  },
};
