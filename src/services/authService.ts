import { api } from './api';
import {
  SignupRequest,
  SignupResponse,
  VerifyOTPRequest,
  TokenResponse,
  LoginRequest,
  UserResponse,
  APIResponse,
  VerificationStatusResponse,
  ResendOTPRequest,
} from './types';

export const authService = {
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await api.post<SignupResponse>('/auth/signup', data);
    return response.data;
  },

  verifyOtp: async (data: VerifyOTPRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/verify-otp', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await api.get<any>('/auth/me');
    // Handle both wrapped and unwrapped response
    return response.data?.data || response.data;
  },

  resendOtp: async (data: ResendOTPRequest): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/auth/resend-otp', data);
    return response.data;
  },

  getVerificationStatus: async (email: string): Promise<VerificationStatusResponse> => {
    const response = await api.get<VerificationStatusResponse>('/auth/verification-status', {
      params: { email },
    });
    return response.data;
  },

  logout: async (refreshToken?: string): Promise<APIResponse> => {
    const response = await api.post<APIResponse>('/auth/logout', { refresh_token: refreshToken });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};
