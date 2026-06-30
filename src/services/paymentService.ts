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
    // Mocking response to avoid API call
    return {
      success: true,
      data: [
        {
          id: 'basic',
          name: 'Basic',
          credits: 10,
          price: 5,
          currency: 'USD',
          description: 'Perfect for casual explorers',
        },
        {
          id: 'pro',
          name: 'Pro',
          credits: 50,
          price: 20,
          currency: 'USD',
          description: 'Best for frequent travelers',
        },
        {
          id: 'premium',
          name: 'Premium',
          credits: 150,
          price: 50,
          currency: 'USD',
          description: 'Ultimate power for power users',
        },
      ],
    };
  },

  createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> => {
    // Mocking response to avoid API call
    return {
      success: true,
      data: {
        client_secret: 'mock_secret',
        payment_intent_id: 'mock_pi_' + Math.random().toString(36).substring(7),
      },
    };
  },

  confirmPayment: async (data: ConfirmPaymentRequest): Promise<APIResponse> => {
    // Mocking response to avoid API call
    return {
      success: true,
      message: 'Payment confirmed successfully',
    };
  },
};
