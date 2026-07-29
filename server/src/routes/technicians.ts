import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { emitToAll } from '../lib/socket';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const technicians = await prisma.technician.findMany({
      include: {
        media: { orderBy: { displayOrder: 'asc' } },
        timer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(technicians);
  } catch (error) {
    console.error('Get technicians error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/working-today', async (_req: Request, res: Response) => {
  try {
    const technicians = await prisma.technician.findMany({
      where: { workingToday: true },
      include: {
        media: { orderBy: { displayOrder: 'asc' } },
        timer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(technicians);
  } catch (error) {
    console.error('Get working technicians error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const technician = await prisma.technician.findUnique({
      where: { id },
      include: {
        media: { orderBy: { displayOrder: 'asc' } },
        timer: true,
      },
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    return res.json(technician);
  } catch (error) {
    console.error('Get technician error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, zone, fieldWork, status, workingToday } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const technician = await prisma.technician.create({
      data: {
        name,
        zone: zone || 'S',
        fieldWork: fieldWork ?? false,
        status: status || 'Available',
        workingToday: workingToday ?? true,
      },
      include: { media: true, timer: true },
    });

    emitToAll('technician:created', technician);
    return res.status(201).json(technician);
  } catch (error) {
    console.error('Create technician error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, zone, fieldWork, status, workingToday } = req.body;

    const existing = await prisma.technician.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const technician = await prisma.technician.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(zone !== undefined && { zone }),
        ...(fieldWork !== undefined && { fieldWork }),
        ...(status !== undefined && { status }),
        ...(workingToday !== undefined && { workingToday }),
      },
      include: { media: true, timer: true },
    });

    emitToAll('technician:updated', technician);
    return res.json(technician);
  } catch (error) {
    console.error('Update technician error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await prisma.technician.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    await prisma.technician.delete({ where: { id } });

    emitToAll('technician:deleted', { id });
    return res.json({ message: 'Technician deleted' });
  } catch (error) {
    console.error('Delete technician error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['Available', 'Busy', 'Resting', 'Off Duty'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const technician = await prisma.technician.update({
      where: { id },
      data: { status },
      include: { media: true, timer: true },
    });

    emitToAll('technician:updated', technician);
    return res.json(technician);
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/working-today', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { workingToday } = req.body;

    const technician = await prisma.technician.update({
      where: { id },
      data: { workingToday: Boolean(workingToday) },
      include: { media: true, timer: true },
    });

    emitToAll('technician:updated', technician);
    return res.json(technician);
  } catch (error) {
    console.error('Update working today error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
