import { v4 as uuidv4 } from 'uuid';

export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${timestamp}${random}`;
}

export function generateInviteCode(): string {
  return uuidv4().replace(/-/g, '').substring(0, 8);
}

export function generateToken(): string {
  return uuidv4() + uuidv4();
}
