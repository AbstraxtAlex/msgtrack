import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { emitToAll } from '../lib/socket';

const router = Router();

router.get('/:technicianId', async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const timer = await prisma.timer.findUnique({ where: { technicianId } });
    return res.json(timer || { remainingSeconds: 0, isRunning: false });
  } catch (error) {
    console.error('Get timer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const { minutes } = req.body;
    const seconds = (minutes || 60) * 60;

    const existing = await prisma.timer.findUnique({ where: { technicianId } });

    let timer;
    if (existing) {
      timer = await prisma.timer.update({
        where: { technicianId },
        data: { remainingSeconds: seconds, isRunning: true },
      });
    } else {
      timer = await prisma.timer.create({
        data: { technicianId, remainingSeconds: seconds, isRunning: true },
      });
    }

    await prisma.technician.update({
      where: { id: technicianId },
      data: { status: 'Busy' },
    });

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { media: true, timer: true },
    });

    emitToAll('technician:updated', technician);
    emitToAll('timer:updated', { technicianId, timer });
    return res.json(timer);
  } catch (error) {
    console.error('Start timer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/pause', authMiddleware, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);

    const timer = await prisma.timer.update({
      where: { technicianId },
      data: { isRunning: false },
    });

    emitToAll('timer:updated', { technicianId, timer });
    return res.json(timer);
  } catch (error) {
    console.error('Pause timer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/resume', authMiddleware, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);

    const timer = await prisma.timer.update({
      where: { technicianId },
      data: { isRunning: true },
    });

    emitToAll('timer:updated', { technicianId, timer });
    return res.json(timer);
  } catch (error) {
    console.error('Resume timer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/add-time', authMiddleware, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const { minutes } = req.body;

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Valid minutes value is required' });
    }

    const additionalSeconds = minutes * 60;

    const timer = await prisma.timer.update({
      where: { technicianId },
      data: { remainingSeconds: { increment: additionalSeconds } },
    });

    emitToAll('timer:updated', { technicianId, timer });
    return res.json(timer);
  } catch (error) {
    console.error('Add time error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/finish', authMiddleware, async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);

    await prisma.timer.update({
      where: { technicianId },
      data: { remainingSeconds: 0, isRunning: false },
    });

    await prisma.technician.update({
      where: { id: technicianId },
      data: { status: 'Available' },
    });

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { media: true, timer: true },
    });

    emitToAll('technician:updated', technician);
    return res.json(technician);
  } catch (error) {
    console.error('Finish timer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
