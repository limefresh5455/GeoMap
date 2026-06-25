import { api } from './api';
import { ComputeRouteRequest, RouteResponse } from './types';

export const routeService = {
  computeRoute: async (data: ComputeRouteRequest): Promise<RouteResponse> => {
    const response = await api.post<RouteResponse>('/routes/compute', data);
    return response.data;
  },
};
