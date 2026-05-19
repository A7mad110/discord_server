import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadServerIcon } from '../middleware/upload';
import {
  createServer, getServers, getServer, updateServer, deleteServer,
  joinServer, leaveServer, createInvite, addChannel, updateChannel,
  deleteChannel, addAdmin, removeAdmin, kickMember,
} from '../controllers/serverController';

const router = Router();

router.use(authenticate);

router.get('/', getServers);
router.post('/', createServer);
router.get('/:serverId', getServer);
router.patch('/:serverId', uploadServerIcon, updateServer);
router.delete('/:serverId', deleteServer);

router.post('/join', joinServer);
router.post('/:serverId/leave', leaveServer);

router.post('/:serverId/invites', createInvite);

router.post('/:serverId/channels', addChannel);
router.patch('/channels/:channelId', updateChannel);
router.delete('/channels/:channelId', deleteChannel);

router.post('/:serverId/admins', addAdmin);
router.delete('/:serverId/admins', removeAdmin);
router.delete('/:serverId/members/:userId', kickMember);

export default router;
