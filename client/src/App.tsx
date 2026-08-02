import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { appBasePath } from './lib/basePath';

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E8E0D0', borderTopColor: '#B8860B', animation: 'spin 0.8s linear infinite' }} /></div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename={appBasePath || undefined}>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedAdmin><AdminPage /></ProtectedAdmin>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { background: '#FFFFFF', color: '#1A1A1A', border: '1px solid #E6DFD0', borderRadius: '12px' },
              success: { iconTheme: { primary: '#B8860B', secondary: '#fff' } },
              error: { iconTheme: { primary: '#991B1B', secondary: '#fff' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
