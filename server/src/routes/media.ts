import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { emitToAll } from '../lib/socket';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const photosDir = path.join(uploadDir, 'photos');
const videosDir = path.join(uploadDir, 'videos');

[photosDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, videosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /mp4|webm|ogg|mov/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = /video/.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

router.get('/:technicianId', async (req: Request, res: Response) => {
  try {
    const technicianId = parseInt(req.params.technicianId);
    const media = await prisma.media.findMany({
      where: { technicianId },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json(media);
  } catch (error) {
    console.error('Get media error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:technicianId/photos', authMiddleware, (req: Request, res: Response) => {
  uploadPhoto.array('photos', 20)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const technicianId = parseInt(req.params.technicianId);
      const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const existingCount = await prisma.media.count({
        where: { technicianId, type: 'photo' },
      });

      const mediaRecords = await Promise.all(
        files.map((file, index) =>
          prisma.media.create({
            data: {
              technicianId,
              type: 'photo',
              filePath: `/uploads/photos/${file.filename}`,
              fileName: file.originalname,
              displayOrder: existingCount + index,
            },
          })
        )
      );

      emitToAll('media:updated', { technicianId });
      return res.status(201).json(mediaRecords);
    } catch (error) {
      console.error('Upload photos error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.post('/:technicianId/videos', authMiddleware, (req: Request, res: Response) => {
  uploadVideo.array('videos', 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const technicianId = parseInt(req.params.technicianId);
      const technician = await prisma.technician.findUnique({ where: { id: technicianId } });
      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const existingCount = await prisma.media.count({
        where: { technicianId, type: 'video' },
      });

      const mediaRecords = await Promise.all(
        files.map((file, index) =>
          prisma.media.create({
            data: {
              technicianId,
              type: 'video',
              filePath: `/uploads/videos/${file.filename}`,
              fileName: file.originalname,
              displayOrder: existingCount + index,
            },
          })
        )
      );

      emitToAll('media:updated', { technicianId });
      return res.status(201).json(mediaRecords);
    } catch (error) {
      console.error('Upload videos error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const media = await prisma.media.findUnique({ where: { id } });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = path.join(process.cwd(), media.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.media.delete({ where: { id } });

    emitToAll('media:updated', { technicianId: media.technicianId });
    return res.json({ message: 'Media deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/order', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    await Promise.all(
      items.map((item: { id: number; displayOrder: number }) =>
        prisma.media.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    return res.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Update order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
