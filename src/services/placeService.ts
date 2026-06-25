import { api } from './api';
import {
  PlaceDetailsResponse,
  PlaceQuestionRequest,
  PlaceQuestionResponse,
  ListPlaceQASessionsResponse,
  GetPlaceQASessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
  SavePlaceRequest,
  SavePlaceActionResponse,
  ListSavedPlacesResponse,
  UpdateSavedPlaceRequest,
  LogVisitRequest,
  LogVisitActionResponse,
  ListVisitsResponse,
  UpdateVisitRequest,
  DeleteVisitResponse,
  VisitStatsResponse,
  APIResponse,
} from './types';

export const placeService = {
  // Details
  getDetails: async (placeId: string): Promise<PlaceDetailsResponse> => {
    const response = await api.get<PlaceDetailsResponse>(`/places/${placeId}/details`);
    return response.data;
  },

  // Q&A
  askQuestion: async (placeId: string, data: PlaceQuestionRequest): Promise<PlaceQuestionResponse> => {
    const response = await api.post<PlaceQuestionResponse>(`/places/${placeId}/question`, data);
    return response.data;
  },

  listSessions: async (page: number = 1, pageSize: number = 10, placeId?: string, search?: string, sort: string = 'last_message'): Promise<ListPlaceQASessionsResponse> => {
    const response = await api.get<ListPlaceQASessionsResponse>('/places/qa/sessions', {
      params: { page, page_size: pageSize, place_id: placeId, search, sort },
    });
    return response.data;
  },

  getSession: async (sessionId: string, page: number = 1, pageSize: number = 10): Promise<GetPlaceQASessionResponse> => {
    const response = await api.get<GetPlaceQASessionResponse>(`/places/qa/sessions/${sessionId}`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  updateSession: async (sessionId: string, data: UpdateSessionRequest): Promise<UpdateSessionResponse> => {
    const response = await api.patch<UpdateSessionResponse>(`/places/qa/sessions/${sessionId}`, data);
    return response.data;
  },

  deleteSessions: async (sessionIds: string[]): Promise<APIResponse> => {
    const response = await api.delete<APIResponse>('/places/qa/sessions', {
      data: { session_ids: sessionIds }
    });
    return response.data;
  },

  // Saved Places
  savePlace: async (placeId: string, data: SavePlaceRequest = {}): Promise<SavePlaceActionResponse> => {
    const response = await api.post<SavePlaceActionResponse>(`/places/${placeId}/save`, data);
    return response.data;
  },

  unsavePlace: async (savedId: number): Promise<SavePlaceActionResponse> => {
    const response = await api.delete<SavePlaceActionResponse>(`/places/saved/${savedId}`);
    return response.data;
  },

  listSaved: async (page: number = 1, pageSize: number = 20, tag?: string, search?: string): Promise<ListSavedPlacesResponse> => {
    const response = await api.get<ListSavedPlacesResponse>('/places/saved', {
      params: { page, page_size: pageSize, tag, search },
    });
    return response.data;
  },

  updateSaved: async (savedId: number, data: UpdateSavedPlaceRequest): Promise<SavedPlaceResponse> => {
    const response = await api.patch<SavedPlaceResponse>(`/places/saved/${savedId}`, data);
    return response.data;
  },

  getSavedNearby: async (lat?: number, lon?: number, radiusKm: number = 2, filterBy: string = 'place'): Promise<ListSavedPlacesResponse> => {
    const response = await api.get<ListSavedPlacesResponse>('/places/saved/nearby', {
      params: { lat, lon, radius_km: radiusKm, filter_by: filterBy },
    });
    return response.data;
  },

  // Visits
  logVisit: async (placeId: string, data: LogVisitRequest): Promise<LogVisitActionResponse> => {
    const response = await api.post<LogVisitActionResponse>(`/places/${placeId}/visit`, data);
    return response.data;
  },

  listVisits: async (page: number = 1, pageSize: number = 20, placeId?: string): Promise<ListVisitsResponse> => {
    const response = await api.get<ListVisitsResponse>('/visits', {
      params: { page, page_size: pageSize, place_id: placeId },
    });
    return response.data;
  },

  updateVisit: async (visitId: number, data: UpdateVisitRequest): Promise<VisitLogResponse> => {
    const response = await api.patch<VisitLogResponse>(`/visits/${visitId}`, data);
    return response.data;
  },

  deleteVisit: async (visitId: number): Promise<DeleteVisitResponse> => {
    const response = await api.delete<DeleteVisitResponse>(`/visits/${visitId}`);
    return response.data;
  },

  getVisitStats: async (): Promise<VisitStatsResponse> => {
    const response = await api.get<VisitStatsResponse>('/visits/stats');
    return response.data;
  },
};
