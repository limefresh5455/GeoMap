import { api } from './api';
import {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  ConfirmPaymentRequest,
  ListPlansResponse,
  APIResponse,
  PaymentHistoryResponse,
} from './types';

export const paymentService = {
  listPlans: async (): Promise<ListPlansResponse> => {
    const response = await api.get<ListPlansResponse>('/payments/packages');
    return response.data;
  },

  createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
    const response = await api.post<CreatePaymentIntentResponse>('/payments/create-intent', data);
    console.log(response?.data,"REsponse======================")
    return response.data;
  },

  confirmPayment: async (data: ConfirmPaymentRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/payments/confirm', data);
    return response.data;
  },

  getPaymentHistory: async (): Promise<PaymentHistoryResponse> => {
    const response = await api.get<PaymentHistoryResponse>('/payments/history');
    return response.data;
  },
};
