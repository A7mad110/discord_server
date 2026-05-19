import api from './api';

export const serverService = {
  getServers: () => api.get('/servers'),

  getServer: (serverId: string) => api.get(`/servers/${serverId}`),

  createServer: (data: { name: string; description?: string }) =>
    api.post('/servers', data),

  updateServer: (serverId: string, data: FormData) =>
    api.patch(`/servers/${serverId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteServer: (serverId: string) =>
    api.delete(`/servers/${serverId}`),

  joinServer: (inviteCode: string) =>
    api.post('/servers/join', { inviteCode }),

  leaveServer: (serverId: string) =>
    api.post(`/servers/${serverId}/leave`),

  createInvite: (serverId: string, data?: { expiresInHours?: number; maxUses?: number }) =>
    api.post(`/servers/${serverId}/invites`, data || {}),

  createChannel: (serverId: string, data: { name: string; type: string; category?: string; topic?: string; isPrivate?: boolean }) =>
    api.post(`/servers/${serverId}/channels`, data),

  updateChannel: (channelId: string, data: { name?: string; topic?: string; isPrivate?: boolean }) =>
    api.patch(`/servers/channels/${channelId}`, data),

  deleteChannel: (channelId: string) =>
    api.delete(`/servers/channels/${channelId}`),

  addAdmin: (serverId: string, userId: string) =>
    api.post(`/servers/${serverId}/admins`, { userId }),

  removeAdmin: (serverId: string, userId: string) =>
    api.delete(`/servers/${serverId}/admins`, { data: { userId } }),

  kickMember: (serverId: string, userId: string) =>
    api.delete(`/servers/${serverId}/members/${userId}`),
};
