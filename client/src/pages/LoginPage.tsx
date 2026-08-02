import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiLock, FiUser, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/admin', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return toast.error('请输入账号和密码');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('登录成功');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E8E0D0', borderTopColor: '#B8860B', animation: 'spin 0.8s linear infinite' }} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-4" style={{ background: 'radial-gradient(ellipse at top, #FDF8ED 0%, #FDFBF7 60%)' }}>
      <Link to="/" style={{ position: 'absolute', top: 20, left: 20, color: '#B8860B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}><FiArrowLeft /> 返回首页</Link>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #C6A962, #B8860B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(184,134,11,0.25)' }}>
            <FiLock size={26} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#8B6914', letterSpacing: 2 }}>后台管理登录</h1>
          <p style={{ fontSize: 12, color: '#9B9B9B', marginTop: 6 }}>吉隆坡豪华水汇 · 技师管理系统</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E8E0D0', borderRadius: 18, padding: 24, boxShadow: '0 8px 32px rgba(184,134,11,0.06)' }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#6B6B6B', letterSpacing: 1, display: 'block', marginBottom: 6 }}>账号</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E8E0D0', borderRadius: 12, padding: '10px 14px', background: '#FAF8F3', marginBottom: 16 }}>
            <FiUser size={15} color="#B8860B" />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}
            />
          </div>

          <label style={{ fontSize: 11, fontWeight: 800, color: '#6B6B6B', letterSpacing: 1, display: 'block', marginBottom: 6 }}>密码</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E8E0D0', borderRadius: 12, padding: '10px 14px', background: '#FAF8F3', marginBottom: 20 }}>
            <FiLock size={15} color="#B8860B" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '13px 20px', borderRadius: 12, background: 'linear-gradient(135deg, #8B6914, #B8860B)', color: '#fff', border: 'none', fontWeight: 900, fontSize: 14, letterSpacing: 2, cursor: 'pointer', boxShadow: '0 4px 16px rgba(184,134,11,0.3)', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '登录中...' : '登 录'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#C6C6C6', marginTop: 20 }}>仅限管理员访问</p>
      </div>
    </div>
  );
}
