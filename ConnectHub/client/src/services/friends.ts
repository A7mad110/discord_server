import api from './api';

export const friendService = {
  getFriends: () => api.get('/friends'),

  searchUsers: (query: string) => api.get(`/friends/search?query=${query}`),

  sendRequest: (usernameOrId: string) =>
    api.post('/friends/request', { usernameOrId }),

  acceptRequest: (requestId: string) =>
    api.patch(`/friends/request/${requestId}/accept`),

  declineRequest: (requestId: string) =>
    api.patch(`/friends/request/${requestId}/decline`),

  removeFriend: (friendId: string) =>
    api.delete(`/friends/${friendId}`),

  blockUser: (userId: string) =>
    api.post(`/friends/block/${userId}`),

  unblockUser: (userId: string) =>
    api.delete(`/friends/block/${userId}`),
};
