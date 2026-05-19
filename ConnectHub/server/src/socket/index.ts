import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Server as HttpServer } from 'http';
import { config } from '../config';
import { User } from '../models/User';
import { Message } from '../models/Message';

interface AuthenticatedSocket {
  userId?: string;
  username?: string;
}

export function setupSocket(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, config.jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

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

    console.log(`User connected: ${username} (${userId})`);

    // Join user's personal room for DMs and notifications
    socket.join(`user:${userId}`);

    // Update user status to online
    await User.findByIdAndUpdate(userId, { status: 'online' });

    // Join all server rooms
    const user = await User.findById(userId).populate('servers');
    if (user) {
      user.servers.forEach((server: any) => {
        socket.join(`server:${server._id}`);
      });
    }

    // Emit presence update
    io.emit('presence:update', { userId, status: 'online' });

    // Join a channel
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    // Leave a channel
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Send message
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
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
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
      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
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
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId,
        username,
        channelId: data.channelId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('typing:update', {
        userId,
        username,
        channelId: data.channelId,
        isTyping: false,
      });
    });

    // Voice channel events
    socket.on('voice:join', (data: { channelId: string }) => {
      socket.join(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-joined', {
        userId,
        username,
      });
    });

    socket.on('voice:leave', (data: { channelId: string }) => {
      socket.leave(`voice:${data.channelId}`);
      socket.to(`voice:${data.channelId}`).emit('voice:user-left', {
        userId,
      });
    });

    socket.on('voice:signal', (data: { to: string; signal: any }) => {
      io.to(`user:${data.to}`).emit('voice:signal', {
        from: userId,
        signal: data.signal,
      });
    });

    // Screen share events
    socket.on('screen:start', (data: { channelId: string }) => {
      socket.to(`voice:${data.channelId}`).emit('screen:started', {
        userId,
        username,
      });
    });

    socket.on('screen:stop', (data: { channelId: string }) => {
      socket.to(`voice:${data.channelId}`).emit('screen:stopped', {
        userId,
      });
    });

    // Presence update
    socket.on('presence:update', async (status: string) => {
      const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
      if (validStatuses.includes(status)) {
        await User.findByIdAndUpdate(userId, { status });
        io.emit('presence:update', { userId, status });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${username} (${userId})`);
      await User.findByIdAndUpdate(userId, { status: 'invisible' });
      io.emit('presence:update', { userId, status: 'invisible' });
    });
  });

  return io;
}
