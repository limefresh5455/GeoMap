import { api } from './api';
import {
  GPSUpdateRequest,
  ManualUpdateRequest,
  APIResponse,
} from './types';

export const locationService = {
  getMe: async (): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/me');
    return response.data;
  },

  updateGps: async (data: GPSUpdateRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/locations/gps', data);
    return response.data;
  },

  updateManual: async (data: ManualUpdateRequest): Promise<APIResponse> => {
    const response = await api.put<APIResponse>('/locations/manual', data);
    return response.data;
  },

  getHistory: async (page: number = 1, pageSize: number = 20): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/history', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getLatest: async (): Promise<APIResponse> => {
    const response = await api.get<APIResponse>('/locations/latest');
    return response.data;
  },

  deleteCurrent: async (): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>('/locations/current');
    return response.data;
  },
};
