import { Router } from 'express';
import { createTask, getTasks, updateTask, deleteTask, getAuditLogs } from '../controllers/taskController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.get('/', getTasks);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.get('/:id/audit-logs', getAuditLogs);

export default router;
