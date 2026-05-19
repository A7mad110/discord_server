export interface User {
  _id: string;
  username: string;
  email: string;
  uniqueId: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  isEmailVerified: boolean;
  friends: string[];
  servers: string[];
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'ar' | 'de' | 'tr';
  notifications: {
    desktop: boolean;
    sound: boolean;
    mentionsOnly: boolean;
  };
}

export interface Server {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  owner: string;
  admins: string[];
  members: User[];
  channels: Channel[];
  categories: Category[];
  roles: Role[];
  inviteLinks: InviteLink[];
  createdAt: string;
}

export interface Channel {
  _id: string;
  name: string;
  type: 'text' | 'voice';
  category?: string;
  server: string;
  topic?: string;
  position: number;
  isPrivate: boolean;
  allowedRoles: string[];
  allowedUsers: string[];
}

export interface Category {
  name: string;
  position: number;
}

export interface Role {
  name: string;
  color: string;
  permissions: string[];
  position: number;
}

export interface InviteLink {
  code: string;
  createdBy: string;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
}

export interface Message {
  _id: string;
  content: string;
  author: User;
  channel: string;
  server?: string;
  replyTo?: Message;
  mentions: string[];
  attachments: Attachment[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface FriendRequest {
  _id: string;
  from: User;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Notification {
  _id: string;
  user: string;
  type: 'friend_request' | 'friend_accepted' | 'message' | 'mention' | 'server_invite' | 'call';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface VoiceState {
  userId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}
