import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';
import { emitToAll } from '../lib/socket';

interface RemoteTechnician {
  id: number;
  chan: string;
  emp_code: string;
  timer_status: string;
  timer_end_at: number;
  is_signed_in: number;
  is_field_work: number;
  field_work_status: string;
  media: { id: number; post_id: number; file_path: string; file_type: string }[];
}

const serverRoot = path.join(__dirname, '..', '..');

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;
let lastSyncAt: Date | null = null;
let lastSyncCount = 0;
let lastCleanupDate: string | null = null;

export function getSyncStatus() {
  return {
    isRunning: syncInterval !== null,
    isSyncing,
    lastSyncAt,
    lastCleanupDate,
    technicianCount: lastSyncCount,
    syncUrl: process.env.SYNC_URL || 'https://tt.021.lol',
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '30'),
  };
}

export async function syncNow(): Promise<{ success: boolean; count: number; error?: string }> {
  if (isSyncing) return { success: false, count: 0, error: 'Sync already in progress' };

  isSyncing = true;
  try {
    const baseUrl = process.env.SYNC_URL || 'https://tt.021.lol';
    const technicians = await fetchAndParse(baseUrl);
    if (!technicians) return { success: false, count: 0, error: 'Failed to fetch or parse remote data' };

    const today = new Date().toISOString().slice(0, 10);
    if (lastCleanupDate !== today) {
      console.log(`Daily cleanup: ${today}`);

      const allMedia = await prisma.media.findMany();
      for (const m of allMedia) {
        const fullPath = path.join(serverRoot, m.filePath);
        try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
      }
      await prisma.media.deleteMany();

      const deletedTechs = await prisma.technician.deleteMany({ where: { externalId: { not: null } } });
      console.log(`Daily cleanup: deleted ${deletedTechs.count} stale technicians`);

      const deletedTimers = await prisma.timer.deleteMany({
        where: { technician: { externalId: { not: null } } }
      });
      console.log(`Daily cleanup: deleted ${deletedTimers.count} stale timers`);

      lastCleanupDate = today;
      emitToAll('sync:cleaned', { date: today, deletedTechs: deletedTechs.count });
    }

    let count = 0;
    const seenExternalIds = new Set<number>();

    for (const remote of technicians) {
      seenExternalIds.add(remote.id);

      const zone = mapZone(remote.chan);
      const status = mapStatus(remote.timer_status, remote.timer_end_at);
      const workingToday = remote.is_signed_in === 1;
      const fieldWork = remote.is_field_work === 1;

      let timerRunning = false;
      let remainingSeconds = 0;
      if (remote.timer_status === '服务中' && remote.timer_end_at > Math.floor(Date.now() / 1000)) {
        timerRunning = true;
        remainingSeconds = remote.timer_end_at - Math.floor(Date.now() / 1000);
      }

      const existing = await prisma.technician.findUnique({ where: { externalId: remote.id } });

      let tech;
      if (existing) {
        tech = await prisma.technician.update({
          where: { id: existing.id },
          data: {
            name: remote.emp_code,
            zone,
            fieldWork,
            status,
            workingToday,
            syncedAt: new Date(),
          },
        });

        if (timerRunning) {
          await prisma.timer.upsert({
            where: { technicianId: tech.id },
            create: { technicianId: tech.id, remainingSeconds, isRunning: true },
            update: { remainingSeconds, isRunning: true },
          });
        } else {
          await prisma.timer.upsert({
            where: { technicianId: tech.id },
            create: { technicianId: tech.id, remainingSeconds: 0, isRunning: false },
            update: { remainingSeconds: 0, isRunning: false },
          });
        }
      } else {
        tech = await prisma.technician.create({
          data: {
            name: remote.emp_code,
            zone,
            fieldWork,
            status,
            workingToday,
            externalId: remote.id,
            syncedAt: new Date(),
          },
        });

        await prisma.timer.create({
          data: { technicianId: tech.id, remainingSeconds, isRunning: timerRunning },
        });
      }

      if (remote.media && remote.media.length > 0) {
        await syncMedia(tech.id, remote, baseUrl);
      }

      count++;
    }

    const syncedTechs = await prisma.technician.findMany({
      where: { externalId: { not: null } },
      include: { media: true, timer: true },
    });

    for (const tech of syncedTechs) {
      if (!seenExternalIds.has(tech.externalId!)) {
        await prisma.technician.update({
          where: { id: tech.id },
          data: { workingToday: false, status: 'Off Duty', syncedAt: new Date() },
        });
        await prisma.timer.upsert({
          where: { technicianId: tech.id },
          create: { technicianId: tech.id, remainingSeconds: 0, isRunning: false },
          update: { remainingSeconds: 0, isRunning: false },
        });
        const updatedTech = await prisma.technician.findUnique({
          where: { id: tech.id },
          include: { media: true, timer: true },
        });
        emitToAll('technician:updated', updatedTech);
      }
    }

    const allTechs = await prisma.technician.findMany({
      include: { media: true, timer: true },
      orderBy: { createdAt: 'desc' },
    });
    emitToAll('sync:completed', { count, total: allTechs.length });

    lastSyncAt = new Date();
    lastSyncCount = count;
    return { success: true, count };
  } catch (error: any) {
    console.error('Sync error:', error.message);
    return { success: false, count: 0, error: error.message };
  } finally {
    isSyncing = false;
  }
}

async function fetchAndParse(baseUrl: string): Promise<RemoteTechnician[] | null> {
  try {
    const results: RemoteTechnician[] = [];
    let page = 1;
    let hasMore = true;
    const seen = new Set<number>();

    while (hasMore) {
      const res = await fetch(`${baseUrl}/?chan=ALL&page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) break;

      const html = await res.text();
      const $ = cheerio.load(html);
      let pageCount = 0;

      $('[onclick]').each((_: number, el: any) => {
        const onclick = $(el).attr('onclick');
        if (!onclick || !onclick.includes('showDetail(')) return;

        const match = onclick.match(/showDetail\((\{.*\})\)/);
        if (!match) return;

        try {
          const decoded = match[1]
            .replace(/"/g, '"')
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/'/g, "'")
            .replace(/\\\//g, '/');

          const data = JSON.parse(decoded) as RemoteTechnician;
          if (data.emp_code && data.chan && !seen.has(data.id)) {
            seen.add(data.id);
            results.push(data);
            pageCount++;
          }
        } catch {}
      });

      if (pageCount === 0) hasMore = false;
      else page++;
    }

    return results;
  } catch (error: any) {
    console.error('Fetch error:', error.message);
    return null;
  }
}

async function syncMedia(techId: number, remote: RemoteTechnician, baseUrl: string) {
  const syncedDir = path.join(serverRoot, 'uploads', 'synced');
  if (!fs.existsSync(syncedDir)) fs.mkdirSync(syncedDir, { recursive: true });

  const existingMedia = await prisma.media.findMany({ where: { technicianId: techId } });
  const existingPaths = new Set(existingMedia.map((m: { fileName: string }) => m.fileName));

  for (let i = 0; i < remote.media.length; i++) {
    const m = remote.media[i];
    const remotePath = m.file_path.replace(/\\\//g, '/');
    const fileName = `${remote.emp_code}_${path.basename(remotePath)}`;

    if (existingPaths.has(fileName)) continue;

    try {
      const fileUrl = `${baseUrl}/${remotePath}`;
      const response = await fetch(fileUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      const localPath = path.join(syncedDir, fileName);
      fs.writeFileSync(localPath, buffer);

      const type = m.file_type === 'video' ? 'video' : 'photo';
      await prisma.media.create({
        data: {
          technicianId: techId,
          type,
          filePath: `/uploads/synced/${fileName}`,
          fileName,
          displayOrder: i,
        },
      });
    } catch {}
  }
}

function mapZone(chan: string): string {
  const zoneMap: Record<string, string> = { A: 'A', S: 'S', T: 'T', M: 'M', FIELD: 'S' };
  return zoneMap[chan] || 'S';
}

function mapStatus(timerStatus: string, timerEndAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  if (timerStatus === '服务中' && timerEndAt > now) return 'Busy';
  if (timerStatus === '排房中') return 'Busy';
  return 'Available';
}

export function startSync() {
  if (syncInterval) return;
  const interval = parseInt(process.env.SYNC_INTERVAL || '30') * 1000;
  console.log(`Starting sync service (interval: ${interval / 1000}s)`);
  syncNow();
  syncInterval = setInterval(syncNow, interval);
}

export function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('Sync service stopped');
  }
}