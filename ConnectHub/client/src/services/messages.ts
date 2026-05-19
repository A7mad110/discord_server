import api from './api';

export const messageService = {
  getMessages: (channelId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/messages/${channelId}`, { params }),

  sendMessage: (channelId: string, data: { content: string; replyTo?: string }) =>
    api.post(`/messages/${channelId}`, data),

  editMessage: (messageId: string, content: string) =>
    api.patch(`/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),
};
