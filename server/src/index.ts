import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './lib/prisma';
import { setSocketIO, emitToAll } from './lib/socket';
import { seedAdmin } from './seed';

import authRoutes from './routes/auth';
import technicianRoutes from './routes/technicians';
import mediaRoutes from './routes/media';
import timerRoutes from './routes/timer';
import dashboardRoutes from './routes/dashboard';
import syncRoutes from './routes/sync';
import { startSync } from './services/syncService';

function normalizeBasePath(value?: string) {
  if (!value || value === '/') return '';
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);
const app = express();
const server = createServer(app);

const io = new Server(server, {
  path: `${BASE_PATH}/socket.io`,
  cors: {
    origin: true,
    credentials: true,
  },
});

setSocketIO(io);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(`${BASE_PATH}/uploads`, express.static(path.join(__dirname, '..', 'uploads')));
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'static', 'robots.txt'));
});

app.use(`${BASE_PATH}/api/auth`, authRoutes);
app.use(`${BASE_PATH}/api/technicians`, technicianRoutes);
app.use(`${BASE_PATH}/api/media`, mediaRoutes);
app.use(`${BASE_PATH}/api/timer`, timerRoutes);
app.use(`${BASE_PATH}/api/dashboard`, dashboardRoutes);
app.use(`${BASE_PATH}/api/sync`, syncRoutes);

const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (BASE_PATH) {
  app.get(BASE_PATH, (_req, res) => {
    res.redirect(301, `${BASE_PATH}/`);
  });
  app.use(BASE_PATH, express.static(clientDistPath));
  app.get(`${BASE_PATH}/*`, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Server-side timer tick every second
setInterval(async () => {
  try {
    const runningTimers = await prisma.timer.findMany({
      where: { isRunning: true, remainingSeconds: { gt: 0 } },
    });

    for (const timer of runningTimers) {
      const newRemaining = timer.remainingSeconds - 1;

      if (newRemaining <= 0) {
        // Timer finished → set Available
        await prisma.timer.update({
          where: { id: timer.id },
          data: { remainingSeconds: 0, isRunning: false },
        });
        await prisma.technician.update({
          where: { id: timer.technicianId },
          data: { status: 'Available' },
        });

        const tech = await prisma.technician.findUnique({
          where: { id: timer.technicianId },
          include: { media: true, timer: true },
        });
        emitToAll('technician:updated', tech);
      } else {
        // Decrement
        await prisma.timer.update({
          where: { id: timer.id },
          data: { remainingSeconds: newRemaining },
        });
        emitToAll('timer:tick', {
          technicianId: timer.technicianId,
          remainingSeconds: newRemaining,
          isRunning: true,
        });
      }
    }
  } catch (error) {
    console.error('Timer tick error:', error);
  }
}, 1000);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await seedAdmin();
    if (process.env.SYNC_ENABLED === 'true') {
      startSync();
    }
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}${BASE_PATH || ''}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
