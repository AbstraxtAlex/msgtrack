import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';

export interface Technician {
  id: number;
  name: string;
  zone: string;
  fieldWork: boolean;
  status: string;
  workingToday: boolean;
  createdAt: string;
  updatedAt: string;
  media: Media[];
  timer: Timer | null;
}

export interface Media {
  id: number;
  technicianId: number;
  type: string;
  filePath: string;
  fileName: string;
  displayOrder: number;
  createdAt: string;
}

export interface Timer {
  id: number;
  technicianId: number;
  remainingSeconds: number;
  isRunning: boolean;
  updatedAt: string;
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/technicians/working-today');
      setTechnicians(res.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);

  // Auto refresh after sync / daily cleanup / midnight
  useEffect(() => {
    let lastDay = new Date().toDateString();
    const iv = setInterval(() => {
      const now = new Date();
      const today = now.toDateString();
      if (today !== lastDay) {
        lastDay = today;
        fetchTechnicians();
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [fetchTechnicians]);

  useEffect(() => {
    if (!socket) return;

    const handleCreated = () => fetchTechnicians();
    const handleUpdated = () => fetchTechnicians();
    const handleDeleted = () => fetchTechnicians();
    const handleMediaUpdated = () => fetchTechnicians();
    const handleSyncCompleted = () => fetchTechnicians();
    const handleSyncCleaned = () => fetchTechnicians();

    // Live timer tick — update remainingSeconds without refetch
    const handleTick = (data: { technicianId: number; remainingSeconds: number; isRunning: boolean }) => {
      setTechnicians(prev =>
        prev.map(t => {
          if (t.id !== data.technicianId) return t;
          if (!t.timer) return t;
          return {
            ...t,
            timer: { ...t.timer, remainingSeconds: data.remainingSeconds, isRunning: data.isRunning },
          };
        })
      );
    };

    socket.on('technician:created', handleCreated);
    socket.on('technician:updated', handleUpdated);
    socket.on('technician:deleted', handleDeleted);
    socket.on('media:updated', handleMediaUpdated);
    socket.on('timer:tick', handleTick);
    socket.on('sync:completed', handleSyncCompleted);
    socket.on('sync:cleaned', handleSyncCleaned);

    return () => {
      socket.off('technician:created', handleCreated);
      socket.off('technician:updated', handleUpdated);
      socket.off('technician:deleted', handleDeleted);
      socket.off('media:updated', handleMediaUpdated);
      socket.off('timer:tick', handleTick);
      socket.off('sync:completed', handleSyncCompleted);
      socket.off('sync:cleaned', handleSyncCleaned);
    };
  }, [socket, fetchTechnicians]);

  return { technicians, loading, refetch: fetchTechnicians, setTechnicians };
}

export function useAdminTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/technicians');
      setTechnicians(res.data);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTechnicians(); }, [fetchTechnicians]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => fetchTechnicians();
    const handleTick = (data: { technicianId: number; remainingSeconds: number; isRunning: boolean }) => {
      setTechnicians(prev =>
        prev.map(t => {
          if (t.id !== data.technicianId) return t;
          if (!t.timer) return t;
          return {
            ...t,
            timer: { ...t.timer, remainingSeconds: data.remainingSeconds, isRunning: data.isRunning },
          };
        })
      );
    };

    socket.on('technician:created', handleUpdate);
    socket.on('technician:updated', handleUpdate);
    socket.on('technician:deleted', handleUpdate);
    socket.on('media:updated', handleUpdate);
    socket.on('timer:tick', handleTick);

    return () => {
      socket.off('technician:created', handleUpdate);
      socket.off('technician:updated', handleUpdate);
      socket.off('technician:deleted', handleUpdate);
      socket.off('media:updated', handleUpdate);
      socket.off('timer:tick', handleTick);
    };
  }, [socket, fetchTechnicians]);

  return { technicians, loading, refetch: fetchTechnicians, setTechnicians };
}
