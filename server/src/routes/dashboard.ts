import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/stats', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const totalTechnicians = await prisma.technician.count();
    const workingToday = await prisma.technician.count({ where: { workingToday: true } });
    const available = await prisma.technician.count({ where: { status: 'Available' } });
    const busy = await prisma.technician.count({ where: { status: 'Busy' } });
    const resting = await prisma.technician.count({ where: { status: 'Resting' } });
    const offDuty = await prisma.technician.count({ where: { status: 'Off Duty' } });

    return res.json({
      workingTodayTechnicians: workingToday,
      busyTechnicians: busy,
      availableTechnicians: available,
      restingTechnicians: resting,
      totalTechnicians,
      offDuty,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
