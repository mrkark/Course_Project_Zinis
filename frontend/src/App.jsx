import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import ThreatLibrary from './pages/ThreatLibrary';
import History from './pages/History';
import ScanDetails from './pages/ScanDetails';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="threats" element={<ThreatLibrary />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<ScanDetails />} />
      </Route>
    </Routes>
  );
}

export default App;