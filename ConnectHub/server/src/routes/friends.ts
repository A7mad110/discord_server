import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriend, blockUser, unblockUser, getFriends, searchUsers,
} from '../controllers/friendController';

const router = Router();

router.use(authenticate);

router.get('/', getFriends);
router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.patch('/request/:requestId/accept', acceptFriendRequest);
router.patch('/request/:requestId/decline', declineFriendRequest);
router.delete('/:friendId', removeFriend);
router.post('/block/:userId', blockUser);
router.delete('/block/:userId', unblockUser);

export default router;
