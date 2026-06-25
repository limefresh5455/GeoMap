import { api } from './api';
import { 
  ComparePlacesRequest, 
  ComparePlacesResponse, 
  CompareBasicResponse, 
  CompareRecommendResponse 
} from './types';

export const comparisonService = {
  compare: async (data: ComparePlacesRequest): Promise<ComparePlacesResponse> => {
    const response = await api.post<ComparePlacesResponse>('/compare', data);
    return response.data;
  },

  compareBasic: async (data: ComparePlacesRequest): Promise<CompareBasicResponse> => {
    const response = await api.post<CompareBasicResponse>('/compare/basic', data);
    return response.data;
  },

  compareRecommend: async (data: ComparePlacesRequest): Promise<CompareRecommendResponse> => {
    const response = await api.post<CompareRecommendResponse>('/compare/recommend', data);
    return response.data;
  },

  compareBatch: async (ids: string[]): Promise<ComparePlacesResponse> => {
    const response = await api.get<ComparePlacesResponse>('/compare/batch', {
      params: { ids: ids.join(',') },
    });
    return response.data;
  },
};
