import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getSyncStatus, startSync, stopSync, syncNow } from '../services/syncService';

const router = Router();

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = getSyncStatus();
    return res.json(status);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/start', authMiddleware, async (_req: Request, res: Response) => {
  try {
    startSync();
    return res.json({ message: 'Sync started', ...getSyncStatus() });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stop', authMiddleware, async (_req: Request, res: Response) => {
  try {
    stopSync();
    return res.json({ message: 'Sync stopped', ...getSyncStatus() });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/manual', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await syncNow();
    return res.json({ ...result, ...getSyncStatus() });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
