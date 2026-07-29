import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
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
    </BrowserRouter>
  );
}
