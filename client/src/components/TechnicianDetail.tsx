import { Technician } from '../hooks/useTechnicians';
import { withBasePath } from '../lib/basePath';
import { FiX, FiStar } from 'react-icons/fi';

interface Props {
  technician: Technician | null;
  onClose: () => void;
}

function getStatusInfo(status: string, remainingSeconds: number, isRunning: boolean, fieldWork: boolean) {
  const prefix = fieldWork ? '外勤 · ' : '';
  if (status === 'Busy' && isRunning && remainingSeconds > 0) {
    const h = Math.floor(remainingSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((remainingSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (remainingSeconds % 60).toString().padStart(2, '0');
    return { text: `${prefix}服务中 | ${h}:${m}:${s}`, className: 'bg-busy' };
  }
  if (status === 'Available') return { text: `${prefix}空闲可约`, className: 'bg-free' };
  if (status === 'Busy') return { text: `${prefix}服务中`, className: 'bg-busy' };
  if (status === 'Resting') return { text: `${prefix}休息中`, className: 'bg-rest' };
  return { text: '未出勤', className: 'bg-off' };
}

const WHATSAPP_MSG = encodeURIComponent('您好，我想预约服务');
const WHATSAPP_PHONE = '60143155632';
const TELEGRAM_USER = 'nhlg09';

export default function TechnicianDetail({ technician, onClose }: Props) {
  if (!technician) return null;

  const remaining = technician.timer?.remainingSeconds || 0;
  const isRunning = technician.timer?.isRunning || false;
  const statusInfo = getStatusInfo(technician.status, remaining, isRunning, technician.fieldWork);

  return (
    <>
      <div className="fixed inset-0 bg-[#FDFBF7] overflow-y-auto z-50">
        <div className="sticky top-0 z-50 p-4 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E6DFD0] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all border border-[#E6DFD0] bg-white hover:bg-[#FDF8ED] text-[#8B6914]"
          >
            返回列表
          </button>
          <div className="flex items-center gap-2">
            <FiStar className="w-3 h-3 text-[#B8860B]" />
            <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[10px] text-[#8B6914] font-bold uppercase tracking-widest">技师档案</span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 pb-28">
          <div style={{ fontFamily: "'Playfair Display', serif" }} className={`w-full py-4 rounded-2xl text-center text-xs font-black tracking-widest uppercase shadow-sm mb-6 ${statusInfo.className}`}>
            {statusInfo.text}
          </div>

          <div className="text-center mb-6">
            <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-bold text-[#1A1A1A] tracking-wider">{technician.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-[#8B6914] text-xs font-bold">{technician.zone}区</span>
              {technician.fieldWork && (
                <span className="text-blue-600 text-xs font-bold px-2 py-0.5 bg-blue-50 rounded-full border border-blue-200">可外出</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {technician.media.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#F5F3EE] border border-[#E6DFD0] flex items-center justify-center mx-auto mb-4">
                  <FiStar className="w-6 h-6 text-[#C6A962]/40" />
                </div>
                <p className="text-[#9B9B9B] text-sm">暂无媒体</p>
              </div>
            )}
            {technician.media.map((m) =>
              m.type === 'video' ? (
                <div key={m.id} className="rounded-2xl overflow-hidden luxury-border luxury-glow">
                  <video src={withBasePath(m.filePath)} preload="metadata" playsInline loop controls className="w-full bg-[#F5F3EE]" />
                </div>
              ) : (
                <div key={m.id} className="rounded-2xl overflow-hidden luxury-border luxury-glow">
                  <img src={withBasePath(m.filePath)} loading="lazy" className="w-full" alt="" />
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom contact bar — OUTSIDE the panel to avoid transform/overflow issues */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#FDFBF7]/95 backdrop-blur-md border-t border-[#E6DFD0] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <a
            href={`https://wa.me/${WHATSAPP_PHONE}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp客服
          </a>
          <a
            href={`https://t.me/${TELEGRAM_USER}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0088cc, #005f8c)', boxShadow: '0 4px 16px rgba(0,136,204,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Telegram客服
          </a>
        </div>
      </div>
    </>
  );
}
