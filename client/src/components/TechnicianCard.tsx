import { Technician } from '../hooks/useTechnicians';
import { FiImage } from 'react-icons/fi';

interface Props {
  technician: Technician;
  index: number;
  onClick: () => void;
}

function getStatusInfo(status: string, remainingSeconds: number, isRunning: boolean, fieldWork: boolean) {
  const prefix = fieldWork ? '外勤 · ' : '';
  if (status === 'Busy' && isRunning && remainingSeconds > 0) {
    const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (remainingSeconds % 60).toString().padStart(2, '0');
    return { text: `${prefix}服务中 | ${h}:${m}:${s}`, className: 'bg-busy' };
  }
  if (status === 'Available') return { text: `${prefix}出勤中`, className: 'bg-free' };
  if (status === 'Busy') return { text: `${prefix}服务中`, className: 'bg-busy' };
  if (status === 'Resting') return { text: `${prefix}休息中`, className: 'bg-rest' };
  return { text: '未出勤', className: 'bg-off' };
}

export default function TechnicianCard({ technician, index, onClick }: Props) {
  const coverMedia = technician.media.find(m => m.type === 'photo') || technician.media[0];
  const isVideo = coverMedia?.type === 'video';
  const timer = technician.timer;
  const remaining = timer?.remainingSeconds || 0;
  const isRunning = timer?.isRunning || false;

  const statusInfo = getStatusInfo(technician.status, remaining, isRunning, technician.fieldWork);

  return (
    <div
      className="post-item card-luxury rounded-2xl overflow-hidden cursor-pointer relative"
      onClick={onClick}
    >
      <div className="relative w-full overflow-hidden bg-[#F5F3EE]">
        {coverMedia ? (
          isVideo ? (
            <div className="relative">
              <video src={coverMedia.filePath + '#t=0.1'} preload="metadata" playsInline muted className="cover-aspect" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 bg-white/70 backdrop-blur-sm rounded-full border border-[#E6DFD0] flex items-center justify-center pl-1 shadow-md">
                  <span className="text-[#8B6914] text-sm">▶</span>
                </div>
              </div>
            </div>
          ) : (
            <img src={coverMedia.filePath} loading="lazy" className="cover-aspect" alt="" />
          )
        ) : (
          <div className="cover-aspect bg-[#F5F3EE] flex items-center justify-center">
            <FiImage className="text-[#D4C5A9] text-4xl" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="bg-white/80 backdrop-blur-sm border border-[#E6DFD0] px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
            <span className="text-[#8B6914] text-[11px] font-black tracking-widest">{technician.name}</span>
            <span className="w-px h-3 bg-[#E6DFD0]" />
            <span className="text-[#9B9B9B] text-[9px] font-bold">{technician.zone}区</span>
          </div>
          {technician.fieldWork && (
            <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 px-2 py-1.5 rounded-xl shadow-sm">
              <span className="text-blue-600 text-[9px] font-black tracking-wider">可外出</span>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <div className={`w-full text-center py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm transition-all duration-300 ${statusInfo.className}`}>
            {statusInfo.text}
          </div>
        </div>
      </div>
    </div>
  );
}
