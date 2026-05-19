import { Response } from 'express';
import { Server, Channel } from '../models/Server';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateInviteCode } from '../utils/generateId';

export const createServer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    const server = new Server({
      name,
      description,
      owner: req.userId,
      admins: [req.userId],
      members: [req.userId],
      roles: [
        { name: '@everyone', color: '#99aab5', permissions: ['read', 'write', 'voice'], position: 0 },
        { name: 'Admin', color: '#ff0000', permissions: ['all'], position: 1 },
      ],
    });

    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      server: server._id,
      position: 0,
    });

    const voiceChannel = new Channel({
      name: 'Voice Chat',
      type: 'voice',
      server: server._id,
      position: 1,
    });

    await generalChannel.save();
    await voiceChannel.save();

    server.channels = [generalChannel._id as any, voiceChannel._id as any];
    await server.save();

    await User.findByIdAndUpdate(req.userId, { $push: { servers: server._id } });

    res.status(201).json({ server });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create server' });
  }
};

export const getServers = async (req: AuthRequest, res: Response) => {
  try {
    const servers = await Server.find({ members: req.userId })
      .select('name icon description owner members');
    res.json({ servers });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get servers' });
  }
};

export const getServer = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId)
      .populate('members', 'username uniqueId avatar status')
      .populate('channels')
      .populate('owner', 'username uniqueId avatar');

    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (!server.members.some((m) => m._id.toString() === req.userId)) {
      return res.status(403).json({ message: 'Not a member of this server' });
    }

    res.json({ server });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get server' });
  }
};

export const updateServer = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const isOwner = server.owner.toString() === req.userId;
    const isAdmin = server.admins.some((a) => a.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description } = req.body;
    if (name) server.name = name;
    if (description !== undefined) server.description = description;
    if (req.file) server.icon = `/uploads/${req.file.filename}`;

    await server.save();
    res.json({ server });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update server' });
  }
};

export const deleteServer = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (server.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the server owner can delete the server' });
    }

    await Channel.deleteMany({ _id: { $in: server.channels } });
    await User.updateMany(
      { servers: server._id },
      { $pull: { servers: server._id } }
    );
    await Server.findByIdAndDelete(server._id);

    res.json({ message: 'Server deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete server' });
  }
};

export const joinServer = async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;

    const server = await Server.findOne({
      'inviteLinks.code': inviteCode,
      'inviteLinks.isActive': true,
    });

    if (!server) {
      return res.status(404).json({ message: 'Invalid or expired invite link' });
    }

    const invite = server.inviteLinks.find((l) => l.code === inviteCode);
    if (invite) {
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        invite.isActive = false;
        await server.save();
        return res.status(400).json({ message: 'Invite link has expired' });
      }
      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        invite.isActive = false;
        await server.save();
        return res.status(400).json({ message: 'Invite link has reached max uses' });
      }
    }

    if (server.members.some((m) => m.toString() === req.userId)) {
      return res.status(400).json({ message: 'Already a member of this server' });
    }

    if (invite) invite.useCount++;
    server.members.push(req.userId as any);
    await server.save();

    await User.findByIdAndUpdate(req.userId, { $push: { servers: server._id } });

    res.json({ server });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to join server' });
  }
};

export const leaveServer = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (server.owner.toString() === req.userId) {
      return res.status(400).json({ message: 'Owner cannot leave server. Transfer ownership or delete.' });
    }

    server.members = server.members.filter((m) => m.toString() !== req.userId);
    server.admins = server.admins.filter((a) => a.toString() !== req.userId);
    await server.save();

    await User.findByIdAndUpdate(req.userId, { $pull: { servers: server._id } });

    res.json({ message: 'Left server' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to leave server' });
  }
};

export const createInvite = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const { expiresInHours, maxUses } = req.body;
    const code = generateInviteCode();

    server.inviteLinks.push({
      code,
      createdBy: req.userId as any,
      expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : undefined,
      maxUses: maxUses || undefined,
      useCount: 0,
      isActive: true,
    });

    await server.save();

    res.json({ inviteCode: code });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create invite' });
  }
};

export const addChannel = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const isOwner = server.owner.toString() === req.userId;
    const isAdmin = server.admins.some((a) => a.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, type, category, topic, isPrivate } = req.body;

    const position = server.channels.length;

    const channel = new Channel({
      name,
      type,
      server: server._id,
      category,
      topic,
      position,
      isPrivate: isPrivate || false,
    });

    await channel.save();
    server.channels.push(channel._id as any);
    await server.save();

    res.status(201).json({ channel });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create channel' });
  }
};

export const updateChannel = async (req: AuthRequest, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    if (!server) return res.status(404).json({ message: 'Server not found' });

    const isOwner = server.owner.toString() === req.userId;
    const isAdmin = server.admins.some((a) => a.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, topic, isPrivate } = req.body;
    if (name) channel.name = name;
    if (topic !== undefined) channel.topic = topic;
    if (isPrivate !== undefined) channel.isPrivate = isPrivate;

    await channel.save();
    res.json({ channel });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update channel' });
  }
};

export const deleteChannel = async (req: AuthRequest, res: Response) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const server = await Server.findById(channel.server);
    if (!server) return res.status(404).json({ message: 'Server not found' });

    const isOwner = server.owner.toString() === req.userId;
    const isAdmin = server.admins.some((a) => a.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    server.channels = server.channels.filter((c) => c.toString() !== req.params.channelId);
    await server.save();
    await Channel.findByIdAndDelete(channel._id);

    res.json({ message: 'Channel deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete channel' });
  }
};

export const addAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (server.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the owner can add admins' });
    }

    const { userId } = req.body;
    if (!server.admins.some((a) => a.toString() === userId)) {
      server.admins.push(userId);
      await server.save();
    }

    res.json({ message: 'Admin added' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to add admin' });
  }
};

export const removeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    if (server.owner.toString() !== req.userId) {
      return res.status(403).json({ message: 'Only the owner can remove admins' });
    }

    const { userId } = req.body;
    server.admins = server.admins.filter((a) => a.toString() !== userId);
    await server.save();

    res.json({ message: 'Admin removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to remove admin' });
  }
};

export const kickMember = async (req: AuthRequest, res: Response) => {
  try {
    const server = await Server.findById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const isOwner = server.owner.toString() === req.userId;
    const isAdmin = server.admins.some((a) => a.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId } = req.params;
    server.members = server.members.filter((m) => m.toString() !== userId);
    await server.save();

    await User.findByIdAndUpdate(userId, { $pull: { servers: server._id } });

    res.json({ message: 'Member kicked' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to kick member' });
  }
};
