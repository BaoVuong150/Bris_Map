import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MapDashboard from './pages/MapDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/useAuthStore';

function App() {
  const { isInitializing, silentAuth } = useAuthStore();

  useEffect(() => {
    silentAuth();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/map" 
          element={
            <ProtectedRoute>
              <MapDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
