import { api } from './api';
import { ComparePlacesRequest, ComparePlacesResponse } from './types';

export const comparisonService = {
  compare: async (data: ComparePlacesRequest): Promise<ComparePlacesResponse> => {
    const response = await api.post<ComparePlacesResponse>('/compare', data);
    return response.data;
  },

  compareBatch: async (ids: string[]): Promise<ComparePlacesResponse> => {
    const response = await api.get<ComparePlacesResponse>('/compare/batch', {
      params: { ids: ids.join(',') },
    });
    return response.data;
  },
};
