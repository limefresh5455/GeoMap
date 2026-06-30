import { api } from './api';
import {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ListPlansResponse,
  APIResponse,
} from './types';

export const paymentService = {
  listPlans: async (): Promise<ListPlansResponse> => {
    const response = await api.get<ListPlansResponse>('/payments/plans');
    return response.data;
  },

  createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
    const response = await api.post<CreatePaymentIntentResponse>('/payments/create-intent', data);
    return response.data;
  },

  confirmPayment: async (data: ConfirmPaymentRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/payments/confirm', data);
    return response.data;
  },
};
