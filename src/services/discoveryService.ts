import { api } from './api';
import {
  TextSearchRequest,
  TextSearchResponse,
  NearbyDiscoveryRequest,
  NearbyDiscoveryResponse,
  AutocompleteResponse,
} from './types';

export const discoveryService = {
  textSearch: async (data: TextSearchRequest): Promise<TextSearchResponse> => {
    const response = await api.post<TextSearchResponse>('/discovery/search', data);
    return response.data;
  },

  nearbySearch: async (data: NearbyDiscoveryRequest): Promise<NearbyDiscoveryResponse> => {
    const response = await api.post<NearbyDiscoveryResponse>('/discovery/nearby', data);
    return response.data;
  },

  autocomplete: async (input: string, latitude?: number, longitude?: number): Promise<AutocompleteResponse> => {
    const response = await api.get<AutocompleteResponse>('/discovery/autocomplete', {
      params: { input, latitude, longitude },
    });
    return response.data;
  },
};
