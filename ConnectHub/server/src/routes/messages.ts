import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getMessages, sendMessage, editMessage, deleteMessage,
} from '../controllers/messageController';

const router = Router();

router.use(authenticate);

router.get('/:channelId', getMessages);
router.post('/:channelId', sendMessage);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);

export default router;
