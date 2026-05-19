import { Response } from 'express';
import { Message } from '../models/Message';
import { Channel } from '../models/Server';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const query: any = { channel: channelId, isDeleted: false };
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }

    const messages = await Message.find(query)
      .populate('author', 'username uniqueId avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10));

    res.json({ messages: messages.reverse() });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get messages' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const { content, replyTo } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const mentions = content.match(/@(\w+)/g)?.map((m: string) => m.slice(1)) || [];

    const message = new Message({
      content,
      author: req.userId,
      channel: channelId,
      server: channel.server,
      replyTo: replyTo || undefined,
      mentions,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username uniqueId avatar')
      .populate('replyTo');

    res.status(201).json({ message: populatedMessage });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to send message' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to edit message' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.author.toString() !== req.userId) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    message.isDeleted = true;
    message.content = '[deleted]';
    await message.save();

    res.json({ message: 'Message deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete message' });
  }
};
