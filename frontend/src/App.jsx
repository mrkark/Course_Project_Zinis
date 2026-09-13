import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ThreatLibrary from './pages/ThreatLibrary';
import History from './pages/History';
import ScanDetails from './pages/ScanDetails';
import Auth from './pages/Auth';
import Sandbox from './pages/Sandbox';
import useAuthStore from './store/authStore';

function Protected({ children }) { const token = useAuthStore((s) => s.token); return token ? children : <Navigate to="/login" replace />; }

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/" element={<Protected><MainLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="threats" element={<ThreatLibrary />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<ScanDetails />} />
      </Route>
    </Routes>
  );
}

export default App;