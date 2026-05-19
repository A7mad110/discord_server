import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Server as HttpServer } from 'http';
import { config } from '../config';
import { User } from '../models/User';
import { Message } from '../models/Message';

interface VoiceUser {
  userId: string;
  username: string;
}

const voiceRooms = new Map<string, VoiceUser[]>();

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token as string, config.jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));

      (socket as any).userId = user._id.toString();
      (socket as any).username = user.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = (socket as any).userId;
    const username = (socket as any).username;

    socket.join(`user:${userId}`);
    await User.findByIdAndUpdate(userId, { status: 'online' });

    const user = await User.findById(userId).populate('servers');
    if (user) {
      user.servers.forEach((server: any) => {
        socket.join(`server:${server._id}`);
      });
    }

    io.emit('presence:update', { userId, status: 'online' });

    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('message:send', async (data: { channelId: string; content: string; replyTo?: string }) => {
      try {
        const message = new Message({
          content: data.content,
          author: userId,
          channel: data.channelId,
          replyTo: data.replyTo || undefined,
        });
        await message.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('author', 'username uniqueId avatar status')
          .populate('replyTo');

        io.to(`channel:${data.channelId}`).emit('message:new', populatedMessage);
      } catch {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const message = await Message.findById(data.messageId);
        if (!message || message.author.toString() !== userId) return;

        message.content = data.content;
        message.isEdited = true;
        await message.save();

        io.to(`channel:${message.channel}`).emit('message:updated', {
          _id: message._id,
          content: message.content,
          isEdited: true,
          updatedAt: message.updatedAt,
        });
      } catch {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('message:delete', async (messageId: string) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.author.toString() !== userId) return;

        message.isDeleted = true;
        message.content = '[deleted]';
        await message.save();

        io.to(`channel:${message.channel}`).emit('message:deleted', {
          _id: message._id,
          channel: message.channel,
        });
      } catch {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('typing:start', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId, username, channelId: data.channelId, isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId, username, channelId: data.channelId, isTyping: false,
      });
    });

    // Voice: join a voice channel
    socket.on('voice:join', (data: { channelId: string }) => {
      socket.join(`voice:${data.channelId}`);

      if (!voiceRooms.has(data.channelId)) {
        voiceRooms.set(data.channelId, []);
      }

      const users = voiceRooms.get(data.channelId)!;
      const existingUsers = users.filter((u) => u.userId !== userId);

      socket.emit('voice:room-users', { users: existingUsers });

      users.push({ userId, username });
      socket.to(`voice:${data.channelId}`).emit('voice:user-joined', { userId, username });
    });

    // Voice: leave a voice channel
    socket.on('voice:leave', (data: { channelId: string }) => {
      socket.leave(`voice:${data.channelId}`);

      const users = voiceRooms.get(data.channelId);
      if (users) {
        const updated = users.filter((u) => u.userId !== userId);
        if (updated.length === 0) {
          voiceRooms.delete(data.channelId);
        } else {
          voiceRooms.set(data.channelId, updated);
        }
      }

      socket.to(`voice:${data.channelId}`).emit('voice:user-left', { userId });
    });

    // Voice: WebRTC signaling
    socket.on('voice:signal', (data: { to: string; signal: any }) => {
      io.to(`user:${data.to}`).emit('voice:signal', {
        from: userId,
        signal: data.signal,
      });
    });

    // Screen share
    socket.on('screen:start', (data: { channelId: string }) => {
      socket.to(`voice:${data.channelId}`).emit('screen:started', { userId, username });
    });

    socket.on('screen:stop', (data: { channelId: string }) => {
      socket.to(`voice:${data.channelId}`).emit('screen:stopped', { userId });
    });

    // Presence
    socket.on('presence:update', async (status: string) => {
      const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
      if (validStatuses.includes(status)) {
        await User.findByIdAndUpdate(userId, { status });
        io.emit('presence:update', { userId, status });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { status: 'invisible' });
      io.emit('presence:update', { userId, status: 'invisible' });

      voiceRooms.forEach((users, channelId) => {
        const updated = users.filter((u) => u.userId !== userId);
        if (updated.length === 0) {
          voiceRooms.delete(channelId);
        } else {
          voiceRooms.set(channelId, updated);
        }
        io.to(`voice:${channelId}`).emit('voice:user-left', { userId });
      });
    });
  });

  return io;
}
