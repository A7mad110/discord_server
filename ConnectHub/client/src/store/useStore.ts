import { create } from 'zustand';
import { User, Server, Channel, Message, VoiceState } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  servers: Server[];
  activeServer: Server | null;
  activeChannel: Channel | null;
  messages: Message[];
  friends: User[];
  pendingRequests: any[];
  voiceStates: VoiceState[];
  isMuted: boolean;
  isDeafened: boolean;
  selectedDmUser: User | null;
  showSettings: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setServers: (servers: Server[]) => void;
  setActiveServer: (server: Server | null) => void;
  setActiveChannel: (channel: Channel | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, data: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setFriends: (friends: User[]) => void;
  setPendingRequests: (requests: any[]) => void;
  setVoiceStates: (states: VoiceState[]) => void;
  updateVoiceState: (userId: string, data: Partial<VoiceState>) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setSelectedDmUser: (user: User | null) => void;
  setShowSettings: (show: boolean) => void;
  addServer: (server: Server) => void;
  removeServer: (serverId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: JSON.parse(localStorage.getItem('connecthub_user') || 'null'),
  token: localStorage.getItem('connecthub_token'),
  servers: [],
  activeServer: null,
  activeChannel: null,
  messages: [],
  friends: [],
  pendingRequests: [],
  voiceStates: [],
  isMuted: false,
  isDeafened: false,
  selectedDmUser: null,
  showSettings: false,

  setUser: (user) => {
    localStorage.setItem('connecthub_user', JSON.stringify(user));
    set({ user });
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('connecthub_token', token);
    } else {
      localStorage.removeItem('connecthub_token');
    }
    set({ token });
  },

  setServers: (servers) => set({ servers }),
  setActiveServer: (server) => set({ activeServer: server, activeChannel: null, messages: [] }),
  setActiveChannel: (channel) => set({ activeChannel: channel, messages: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (messageId, data) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, ...data } : m
      ),
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    })),
  setFriends: (friends) => set({ friends }),
  setPendingRequests: (requests) => set({ pendingRequests: requests }),
  setVoiceStates: (states) => set({ voiceStates: states }),
  updateVoiceState: (userId, data) =>
    set((state) => ({
      voiceStates: state.voiceStates.map((v) =>
        v.userId === userId ? { ...v, ...data } : v
      ),
    })),
  setMuted: (muted) => set({ isMuted: muted }),
  setDeafened: (deafened) => set({ isDeafened: deafened }),
  setSelectedDmUser: (user) => set({ selectedDmUser: user }),
  setShowSettings: (show) => set({ showSettings: show }),
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
  removeServer: (serverId) =>
    set((state) => ({
      servers: state.servers.filter((s) => s._id !== serverId),
    })),
}));
