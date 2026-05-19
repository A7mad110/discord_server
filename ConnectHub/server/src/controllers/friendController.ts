import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { usernameOrId } = req.body;

    const targetUser = await User.findOne({
      $or: [{ username: usernameOrId }, { uniqueId: usernameOrId }],
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    if (targetUser.blockedUsers.includes(req.userId as any)) {
      return res.status(403).json({ message: 'Cannot send friend request to this user' });
    }

    const existingRequest = targetUser.friendRequests.find(
      (r) => r.from.toString() === req.userId && r.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    const alreadyFriends = targetUser.friends.includes(req.userId as any);
    if (alreadyFriends) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    targetUser.friendRequests.push({
      from: req.userId as any,
      status: 'pending',
      createdAt: new Date(),
    });
    await targetUser.save();

    const currentUser = await User.findById(req.userId);
    const pendingOutgoing = currentUser?.friendRequests.find(
      (r) => r.from.toString() === targetUser._id.toString() && r.status === 'pending'
    );

    if (pendingOutgoing) {
      pendingOutgoing.status = 'accepted';
      currentUser!.friends.push(targetUser._id as any);
      targetUser.friends.push(req.userId as any);
      await currentUser!.save();
      await targetUser.save();
      return res.json({ message: 'Friend request accepted (mutual)', user: targetUser });
    }

    res.json({ message: 'Friend request sent' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to send friend request' });
  }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const request = (user.friendRequests as any).id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = 'accepted';
    user.friends.push(request.from);

    const fromUser = await User.findById(request.from);
    if (fromUser) {
      fromUser.friends.push(user._id as any);
      await fromUser.save();
    }

    await user.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to accept friend request' });
  }
};

export const declineFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const request = (user.friendRequests as any).id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = 'declined';
    await user.save();

    res.json({ message: 'Friend request declined' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to decline friend request' });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const user = await User.findById(req.userId);
    const friend = await User.findById(friendId);

    if (user) {
      user.friends = user.friends.filter((f) => f.toString() !== friendId);
      await user.save();
    }

    if (friend) {
      friend.friends = friend.friends.filter((f) => f.toString() !== req.userId);
      await friend.save();
    }

    res.json({ message: 'Friend removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to remove friend' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.blockedUsers.includes(userId as any)) {
      user.blockedUsers.push(userId as any);
    }

    user.friends = user.friends.filter((f) => f.toString() !== userId);

    const blockedUser = await User.findById(userId);
    if (blockedUser) {
      blockedUser.friends = blockedUser.friends.filter((f) => f.toString() !== req.userId);
      await blockedUser.save();
    }

    await user.save();

    res.json({ message: 'User blocked' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to block user' });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.blockedUsers = user.blockedUsers.filter((f) => f.toString() !== userId);
    await user.save();

    res.json({ message: 'User unblocked' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to unblock user' });
  }
};

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username uniqueId avatar status')
      .populate({
        path: 'friendRequests.from',
        select: 'username uniqueId avatar status',
      });

    const friends = user?.friends || [];
    const pendingRequests = user?.friendRequests.filter((r) => r.status === 'pending') || [];
    const blockedUsers = await User.find({ _id: { $in: user?.blockedUsers || [] } })
      .select('username uniqueId avatar');

    res.json({ friends, pendingRequests, blockedUsers });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to get friends' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;

    const users = await User.find({
      $or: [
        { username: { $regex: query as string, $options: 'i' } },
        { uniqueId: { $regex: query as string, $options: 'i' } },
      ],
      _id: { $ne: req.userId },
    })
      .select('username uniqueId avatar status')
      .limit(20);

    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Search failed' });
  }
};
