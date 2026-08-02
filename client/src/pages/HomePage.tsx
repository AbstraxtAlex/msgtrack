import { useState } from 'react';
import { useTechnicians, Technician } from '../hooks/useTechnicians';
import TechnicianCard from '../components/TechnicianCard';
import TechnicianDetail from '../components/TechnicianDetail';
import { FiLoader, FiStar, FiSearch } from 'react-icons/fi';

const WHATSAPP_MSG = encodeURIComponent('您好，我想预约服务');
const TELEGRAM_USER = 'nhlg09';
const TELEGRAM_MSG = encodeURIComponent('您好，我想预约服务');

export default function HomePage() {
  const { technicians, loading } = useTechnicians();
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filters = [
    { key: 'ALL', label: '首页' },
    { key: 'A', label: 'A区' },
    { key: 'S', label: 'S区' },
    { key: 'T', label: 'T区' },
    { key: 'M', label: 'M区' },
    { key: 'FIELD', label: '可外出' },
  ];

  const filtered = technicians.filter(t => {
    const query = search.trim().toLowerCase();
    if (query && !t.name.toLowerCase().includes(query)) return false;
    if (filter === 'ALL') return true;
    if (filter === 'FIELD') return t.fieldWork;
    return t.zone === filter;
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <div className="relative overflow-hidden bg-gradient-to-b from-[#FDF8ED] via-white to-[#FDFBF7] border-b border-[#E6DFD0]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(184,134,11,0.04),transparent_70%)]" />
        <div className="relative max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C6A962]/40" />
            <FiStar className="w-4 h-4 text-[#B8860B]" />
            <FiStar className="w-5 h-5 text-[#C6A962]" />
            <FiStar className="w-4 h-4 text-[#B8860B]" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C6A962]/40" />
          </div>
          <h1 className="font-serif text-center text-2xl sm:text-3xl font-bold tracking-[0.08em] mb-2" style={{ color: '#8B6914' }}>
            吉隆坡豪华水汇
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C6A962]/40" />
            <div className="overflow-hidden" style={{ maxWidth: 320 }}>
              <div className="marquee-track">
                <span className="gold-shimmer text-lg md:text-xl font-extrabold tracking-[0.25em]" style={{ textShadow: '0 2px 8px rgba(184,134,11,0.3)' }}>
                  进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;
                </span>
                <span className="gold-shimmer text-lg md:text-xl font-extrabold tracking-[0.25em]" style={{ textShadow: '0 2px 8px rgba(184,134,11,0.3)' }}>
                  进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;进店报龙王&nbsp;&nbsp;·&nbsp;&nbsp;
                </span>
              </div>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C6A962]/40" />
          </div>
        </div>
      </div>

      <nav className="sticky top-0 z-30 py-3 px-3 glass">
        <div className="max-w-2xl mx-auto w-full">
          <div className="relative mb-2">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8860B]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索技师编号，如 T987 / S817"
              className="w-full rounded-xl border border-[#E6DFD0] bg-white px-9 py-2.5 text-xs font-bold text-[#1A1A1A] outline-none placeholder:text-[#B8A88A]"
            />
          </div>
          <div className="flex gap-1.5 w-full overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 min-w-0 flex justify-center items-center py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all duration-300 whitespace-nowrap ${
                filter === f.key ? 'filter-active-gold' : 'filter-inactive'
              }`}
            >
              {f.label}
            </button>
          ))}
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto min-h-screen px-3 mt-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FiLoader className="w-8 h-8 text-[#B8860B] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#F5F3EE] border border-[#E6DFD0] flex items-center justify-center mx-auto mb-4">
              <FiStar className="w-6 h-6 text-[#C6A962]/40" />
            </div>
            <p className="text-[#9B9B9B] text-sm">暂无出勤技师</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
            {filtered.map((tech, idx) => (
              <TechnicianCard key={tech.id} technician={tech} index={idx} onClick={() => setSelectedTech(tech)} />
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-0 right-0 z-40 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 pointer-events-none">
        <a
          href={`https://wa.me/60143155632?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold text-white transition-all active:scale-95 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            boxShadow: '0 4px 16px rgba(37,211,102,0.3)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp客服
        </a>

        <a
          href={`https://t.me/${TELEGRAM_USER}?text=${TELEGRAM_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold text-white transition-all active:scale-95 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #0088cc, #005f8c)',
            boxShadow: '0 4px 16px rgba(0,136,204,0.3)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Telegram客服
        </a>
      </div>

      <TechnicianDetail technician={selectedTech} onClose={() => setSelectedTech(null)} />
    </div>
  );
}
