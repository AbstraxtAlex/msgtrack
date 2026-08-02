import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUsers, FiCamera, FiClock, FiPlay, FiPause, FiPlus, FiTrash2, FiCheckCircle, FiRefreshCw, FiZap, FiWifi, FiWifiOff, FiArrowLeft, FiLogOut, FiSearch } from 'react-icons/fi';
import api from '../lib/api';
import { withBasePath } from '../lib/basePath';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface Tech {
  id: number; name: string; zone: string; fieldWork: boolean; status: string; workingToday: boolean; externalId: number | null;
  media: { id: number; type: string; filePath: string; fileName: string }[];
  timer: { id: number; remainingSeconds: number; isRunning: boolean } | null;
}

function fmt(s: number) {
  const clamped = Math.max(0, s);
  return `${String(Math.floor(clamped/3600)).padStart(2,'0')}:${String(Math.floor((clamped%3600)/60)).padStart(2,'0')}:${String(clamped%60).padStart(2,'0')}`;
}

const ZONES = ['A', 'S', 'T', 'M'];
const TIMER_OPTIONS = [
  { minutes: 60, label: '60分钟' },
  { minutes: 90, label: '90分钟' },
  { minutes: 240, label: '4小时' },
  { minutes: 480, label: '8小时' },
];

const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ padding: '10px 20px', borderRadius: 12, background: bg, color, border: 'none', fontWeight: 800 as const, fontSize: 12, cursor: 'pointer' });

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 36px',
  borderRadius: 10,
  border: '1px solid #E8E0D0',
  background: '#FFFFFF',
  color: '#1A1A1A',
  fontSize: 12,
  fontWeight: 700,
  outline: 'none',
  boxSizing: 'border-box',
};

function SearchBox({ value, onChange, placeholder = '搜索技师编号，如 T987 / S817' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#B8860B' }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={searchInputStyle} />
    </div>
  );
}

function matchesTechSearch(t: Tech, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return t.name.toLowerCase().includes(q);
}

export default function AdminPage() {
  const { socket, connected } = useSocket();
  const { logout } = useAuth();
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dashboard' | 'technicians' | 'media'>('dashboard');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const tickVersionRef = useRef(0);

  const fetchTechs = useCallback(async () => { try { const r = await api.get('/technicians'); setTechs(r.data); tickVersionRef.current++; } catch {} finally { setLoading(false); } }, []);
  const fetchSync = useCallback(async () => { try { const r = await api.get('/sync/status'); setSyncStatus(r.data); } catch {} }, []);

  useEffect(() => { fetchTechs(); fetchSync(); const iv = setInterval(fetchSync, 15000); return () => clearInterval(iv); }, [fetchTechs, fetchSync]);

  // Auto refresh at midnight (00:00) — detects day change and refetches
  useEffect(() => {
    let lastDay = new Date().toDateString();
    const iv = setInterval(() => {
      const now = new Date();
      const today = now.toDateString();
      if (today !== lastDay) {
        lastDay = today;
        fetchTechs();
        fetchSync();
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [fetchTechs, fetchSync]);

  // Client-side countdown fallback — decrements running timers locally every second
  useEffect(() => {
    const iv = setInterval(() => {
      setTechs(prev => {
        let changed = false;
        const next = prev.map(t => {
          if (!t.timer || !t.timer.isRunning || t.timer.remainingSeconds <= 0) return t;
          const newRem = t.timer.remainingSeconds - 1;
          changed = true;
          return { ...t, timer: { ...t.timer, remainingSeconds: newRem } };
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Socket: live updates from server (overrides client-side countdown when available)
  useEffect(() => {
    if (!socket) return;
    const refresh = () => { fetchTechs(); };
    const handleTick = (d: { technicianId: number; remainingSeconds: number; isRunning: boolean }) => {
      setTechs(prev => prev.map(t => {
        if (t.id !== d.technicianId) return t;
        return { ...t, timer: t.timer ? { ...t.timer, remainingSeconds: d.remainingSeconds, isRunning: d.isRunning } : { id: 0, remainingSeconds: d.remainingSeconds, isRunning: d.isRunning } };
      }));
    };
    socket.on('technician:created', refresh); socket.on('technician:updated', refresh);
    socket.on('technician:deleted', refresh); socket.on('timer:tick', handleTick);
    socket.on('sync:completed', refresh); socket.on('sync:cleaned', refresh);
    return () => { socket.off('technician:created', refresh); socket.off('technician:updated', refresh); socket.off('technician:deleted', refresh); socket.off('timer:tick', handleTick); socket.off('sync:completed', refresh); socket.off('sync:cleaned', refresh); };
  }, [socket, fetchTechs]);

  const timerAction = async (id: number, action: string, minutes?: number) => {
    try { if (action === 'start') await api.post(`/timer/${id}/start`, { minutes }); else if (action === 'add-time') await api.post(`/timer/${id}/add-time`, { minutes }); else await api.post(`/timer/${id}/${action}`); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '操作失败'); }
  };

  const refresh = () => { fetchTechs(); };

  const handleLogout = async () => {
    await logout();
    window.location.href = withBasePath('/login');
  };

  return (
    <>
      <header style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)', padding: '14px 24px', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: '#C6A962', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}><FiArrowLeft /> 返回首页</Link>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: '#C6A962', letterSpacing: 2 }}>后台管理</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: connected ? '#4ADE80' : '#F87171' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#4ADE80' : '#F87171' }} />
            {connected ? '实时连接' : '离线模式'}
          </span>
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([['dashboard','仪表盘',<FiZap/>],['technicians','技师管理',<FiUsers/>],['media','相册管理',<FiCamera/>]] as const).map(([k,l,i]) => (
              <button key={k} onClick={() => setTab(k)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 1, background: tab === k ? 'rgba(184,134,11,0.15)' : 'transparent', color: tab === k ? '#B8860B' : '#9B9B9B', border: tab === k ? '1px solid #C6A962' : 'none' }}>{i} {l}</button>
            ))}
          </nav>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}><FiLogOut size={12} /> 退出</button>
        </div>
      </header>
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '16px 12px' }}>
        {tab === 'dashboard' && <Dashboard syncStatus={syncStatus} fetchSync={fetchSync} techs={techs} timerAction={timerAction} refresh={refresh} />}
        {tab === 'technicians' && <TechnicianTab techs={techs} loading={loading} refresh={refresh} timerAction={timerAction} />}
        {tab === 'media' && <MediaTab techs={techs} refresh={refresh} />}
      </main>
    </>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E0D0', boxShadow: '0 2px 12px rgba(184,134,11,0.04)', ...style }}>{children}</div>;
}

function TimerInline({ t, timerAction }: { t: Tech; timerAction: (id: number, action: string, m?: number) => void }) {
  const rem = t.timer?.remainingSeconds || 0;
  const run = t.timer?.isRunning || false;

  if (rem > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontVariant: 'tabular-nums', fontSize: 13, fontWeight: 900, color: '#8B6914', background: '#FDF8ED', padding: '5px 10px', borderRadius: 8, border: '1px solid #C6A962', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <FiClock size={12} />{fmt(rem)}
          {run && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A', animation: 'pulse 1.5s ease-in-out infinite' }} />}
        </span>
        {run ? (
          <button onClick={() => timerAction(t.id, 'pause')} style={{ ...btn('#D97706'), padding: '6px 10px', fontSize: 10 }} title="暂停"><FiPause size={11} /></button>
        ) : (
          <button onClick={() => timerAction(t.id, 'resume')} style={{ ...btn('#059669'), padding: '6px 10px', fontSize: 10 }} title="继续"><FiPlay size={11} /></button>
        )}
        <button onClick={() => timerAction(t.id, 'finish')} style={{ ...btn('#1D4ED8'), padding: '6px 10px', fontSize: 10 }} title="结束"><FiCheckCircle size={11} /></button>
        {TIMER_OPTIONS.map(option => (
          <button key={option.minutes} onClick={() => timerAction(t.id, 'add-time', option.minutes)} style={{ ...btn('#F5F3EE'), color: '#8B6914', padding: '6px 8px', fontSize: 10, border: '1px solid #E8E0D0' }}>+{option.label}</button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {TIMER_OPTIONS.map(option => (
        <button key={option.minutes} onClick={() => timerAction(t.id, 'start', option.minutes)} style={{ ...btn('#F0FDF4'), color: '#166534', padding: '5px 10px', fontSize: 11, border: '1px solid #BBF7D0' }}>{option.label}</button>
      ))}
    </div>
  );
}

function Dashboard({ techs, syncStatus, fetchSync, timerAction, refresh }: { techs: Tech[]; syncStatus: any; fetchSync: () => void; timerAction: (id: number, action: string, m?: number) => void; refresh: () => void }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const handleSync = async (action: 'start' | 'stop' | 'manual') => { try { const r = await api.post(`/sync/${action}`); toast.success(r.data.message); fetchSync(); } catch (e: any) { toast.error(e?.response?.data?.error || '操作失败'); } };

  const workingToday = techs.filter(t => t.workingToday).length;
  const busy = techs.filter(t => t.status === 'Busy' && t.timer && t.timer.isRunning && t.timer.remainingSeconds > 0).length;
  const available = techs.filter(t => t.status === 'Available').length;
  const resting = techs.filter(t => t.status === 'Resting').length;

  const statCards = [
    { label: '今日出勤', value: workingToday, color: '#991B1B', bg: '#FEF2F2', icon: <FiUsers size={20} /> },
    { label: '服务中', value: busy, color: '#DC2626', bg: '#FEF2F2', icon: <FiClock size={20} /> },
    { label: '空闲中', value: available, color: '#166534', bg: '#F0FDF4', icon: <FiCheckCircle size={20} /> },
    { label: '休息中', value: resting, color: '#92400E', bg: '#FFFBEB', icon: <FiPause size={20} /> },
  ];

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'available', label: '空闲中' },
    { key: 'busy', label: '服务中' },
    { key: 'resting', label: '休息中' },
    { key: 'off', label: '未出勤' },
  ];

  const filtered = useMemo(() => {
    let list = [...techs];
    if (filter === 'available') list = list.filter(t => t.status === 'Available');
    else if (filter === 'busy') list = list.filter(t => t.status === 'Busy' && t.timer && t.timer.isRunning && t.timer.remainingSeconds > 0);
    else if (filter === 'resting') list = list.filter(t => t.status === 'Resting');
    else if (filter === 'off') list = list.filter(t => !t.workingToday);

    return list.filter(t => matchesTechSearch(t, search));
  }, [techs, filter, search]);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="stats-grid">
        {statCards.map(s => (
          <Card key={s.label} style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: 1 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#8B6914', marginBottom: 16, letterSpacing: 1 }}>同步控制</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: '#FAF8F3', borderRadius: 12, border: '1px solid #E8E0D0', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: syncStatus?.isRunning ? '#166534' : '#9B9B9B' }}>
            {syncStatus?.isRunning ? <FiWifi size={16} color="#166534" /> : <FiWifiOff size={16} color="#9B9B9B" />}
            {syncStatus?.isRunning ? '运行中' : '已停止'}
          </span>
          {syncStatus?.lastSyncTime && <span style={{ fontSize: 11, color: '#9B9B9B' }}>上次同步: {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}</span>}
          {syncStatus?.techCount !== undefined && <span style={{ fontSize: 11, color: '#9B9B9B' }}>同步技师: {syncStatus.techCount}人</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => handleSync('start')} style={{ ...btn('#059669'), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11 }}><FiPlay size={13} /> 启动</button>
          <button onClick={() => handleSync('stop')} style={{ ...btn('#DC2626'), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11 }}><FiPause size={13} /> 停止</button>
          <button onClick={() => handleSync('manual')} style={{ ...btn('#B8860B'), display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 11 }}><FiRefreshCw size={13} /> 立即同步</button>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: '1px solid #E8E0D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#8B6914', letterSpacing: 1 }}>技师列表 ({filtered.length}/{techs.length})</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr)', gap: 10 }}>
            <SearchBox value={search} onChange={setSearch} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: 'none', background: filter === f.key ? '#8B6914' : '#F5F3EE', color: filter === f.key ? '#fff' : '#6B6B6B', transition: 'all 0.15s' }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {filtered.map(t => (
            <div key={t.id} style={{ padding: '12px', background: '#FAF8F3', borderRadius: 12, border: '1px solid #E8E0D0', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.timer && t.timer.remainingSeconds > 0 ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #C6A962, #B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 14, color: '#1A1A1A', letterSpacing: 1 }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6914', background: '#FDF8ED', padding: '1px 8px', borderRadius: 6, border: '1px solid #E8DCC0' }}>{t.zone}区</span>
                      {t.fieldWork && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 8px', borderRadius: 6 }}>可外出</span>}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 8, background: t.workingToday ? 'rgba(22,101,52,0.12)' : '#F5F3EE', color: t.workingToday ? '#166534' : '#9B9B9B', border: t.workingToday ? '1px solid #BBF7D0' : '1px solid #E8E0D0', flexShrink: 0, marginLeft: 8 }}>
                  {t.workingToday ? '出勤中' : '未出勤'}
                </span>
              </div>
              <TimerInline t={t} timerAction={timerAction} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TechnicianTab({ techs, loading, refresh, timerAction }: { techs: Tech[]; loading: boolean; refresh: () => void; timerAction: (id: number, action: string, m?: number) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newZone, setNewZone] = useState('A');
  const [newFieldWork, setNewFieldWork] = useState(false);
  const [search, setSearch] = useState('');
  const filteredTechs = useMemo(() => techs.filter(t => matchesTechSearch(t, search)), [techs, search]);

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('请输入姓名');
    try { await api.post('/technicians', { name: newName.trim(), zone: newZone, fieldWork: newFieldWork, workingToday: true }); toast.success('创建成功'); setShowCreate(false); setNewName(''); setNewZone('A'); setNewFieldWork(false); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '创建失败'); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定删除 ${name}？`)) return;
    try { await api.delete(`/technicians/${id}`); toast.success('已删除'); refresh(); } catch { toast.error('删除失败'); }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, color: '#1A1A1A', letterSpacing: 1 }}>技师管理 ({filteredTechs.length}/{techs.length})</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, background: '#8B6914', color: '#fff', border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}><FiPlus /> 新建技师</button>
      </div>
      <SearchBox value={search} onChange={setSearch} />
      {showCreate && (
        <Card style={{ padding: 16 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="技师姓名" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E8E0D0', background: '#FAF8F3', fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 10, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {ZONES.map(z => <button key={z} onClick={() => setNewZone(z)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer', background: newZone === z ? '#8B6914' : '#F5F3EE', color: newZone === z ? '#fff' : '#9B9B9B' }}>{z}区</button>)}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#1A1A1A', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={newFieldWork} onChange={e => setNewFieldWork(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#B8860B' }} /> 可外出
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCreate(false)} style={{ padding: '8px 20px', borderRadius: 10, background: '#F5F3EE', border: '1px solid #E8E0D0', color: '#9B9B9B', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>取消</button>
            <button onClick={handleCreate} style={{ padding: '8px 20px', borderRadius: 10, background: '#8B6914', border: 'none', color: '#fff', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>创建</button>
          </div>
        </Card>
      )}
      {loading ? <p style={{ color: '#9B9B9B', textAlign: 'center', padding: 40 }}>加载中...</p> : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredTechs.map(t => (
            <Card key={t.id} style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #C6A962, #B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{t.name.charAt(0)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: '#1A1A1A', letterSpacing: 1 }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6914' }}>{t.zone}区</span>
                      {t.fieldWork && <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB' }}>可外出</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: t.workingToday ? '#166534' : '#9B9B9B' }}>{t.workingToday ? '出勤中' : '未出勤'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9B9B' }}>{t.media.length}媒体</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(t.id, t.name)} style={{ ...btn('#FEF2F2'), color: '#991B1B', padding: 6, border: '1px solid #FECACA', flexShrink: 0, marginLeft: 8 }}><FiTrash2 size={13} /></button>
              </div>
              <TimerInline t={t} timerAction={timerAction} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaTab({ techs, refresh }: { techs: Tech[]; refresh: () => void }) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const filteredTechs = useMemo(() => techs.filter(t => matchesTechSearch(t, search)), [techs, search]);
  const handleUpload = async (techId: number) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return; setUploading(techId);
      const fd = new FormData(); fd.append('file', file);
      try { await api.post(`/media/${techId}/${file.type.startsWith('video/') ? 'videos' : 'photos'}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('上传成功'); refresh(); }
      catch (e: any) { toast.error(e?.response?.data?.error || '上传失败'); } finally { setUploading(null); }
    }; input.click();
  };
  const handleDeleteMedia = async (id: number) => { if (!confirm('确定删除？')) return; try { await api.delete(`/media/${id}`); toast.success('已删除'); refresh(); } catch { toast.error('删除失败'); } };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', letterSpacing: 1 }}>相册管理 ({filteredTechs.length}/{techs.length})</h2>
      <SearchBox value={search} onChange={setSearch} />
      {filteredTechs.map(t => (
        <Card key={t.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div><span style={{ fontWeight: 800, fontSize: 14, color: '#1A1A1A' }}>{t.name}</span><span style={{ fontSize: 11, color: '#9B9B9B', marginLeft: 8 }}>{t.zone}区 · {t.media.length}个文件</span></div>
            <button onClick={() => handleUpload(t.id)} disabled={uploading === t.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderRadius: 10, background: uploading === t.id ? '#D4C5A9' : '#8B6914', color: '#fff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}><FiCamera /> {uploading === t.id ? '...' : '上传'}</button>
          </div>
          {t.media.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {t.media.map(m => (
              <div key={m.id} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid #E8E0D0' }}>
                {m.type === 'photo' ? <img src={withBasePath(`/uploads/${m.filePath.replace(/^.*?uploads\//, '')}`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#F5F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6914', fontSize: 20 }}>{'>'}</div>}
                <button onClick={() => handleDeleteMedia(m.id)} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 6, background: 'rgba(153,27,27,0.85)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}><FiTrash2 /></button>
              </div>
            ))}
          </div>}
        </Card>
      ))}
    </div>
  );
}
