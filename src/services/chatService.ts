import { api } from './api';
import { AIChatStartRequest, AIChatResponse } from './types';

export const chatService = {
  sendMessage: async (data: AIChatStartRequest): Promise<AIChatResponse> => {
    const response = await api.post<AIChatResponse>('/chat/message', data);
    return response.data;
  },
};
