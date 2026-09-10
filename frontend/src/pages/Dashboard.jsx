import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useScanStore from '../store/scanStore';
import useThreatStore from '../store/threatStore';
import useSocketStore from '../store/socketStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import RiskScoreChart from '../components/charts/RiskScoreChart';
import VerdictDistributionChart from '../components/charts/VerdictDistributionChart';
import ActivityChart from '../components/charts/ActivityChart';

const STAT_CARDS = [
  { key: 'total', label: 'Total Scans', icon: '📋', color: 'primary' },
  { key: 'critical', label: 'Critical', icon: '🔴', color: 'danger' },
  { key: 'high', label: 'High', icon: '🟠', color: 'warning' },
  { key: 'medium', label: 'Medium', icon: '🟡', color: 'warning' },
  { key: 'low', label: 'Low', icon: '🔵', color: 'primary' },
  { key: 'clean', label: 'Clean', icon: '🟢', color: 'success' },
];

export default function Dashboard() {
  const { stats, fetchStats, loading: statsLoading } = useScanStore();
  const { threats, fetchThreats } = useThreatStore();
  const { isConnected } = useSocketStore();

  useEffect(() => {
    fetchStats();
    fetchThreats();
  }, [fetchStats, fetchThreats]);

  // Auto-refresh when connected and a scan completes
  useEffect(() => {
    if (!isConnected) return;
    
    const handleScanComplete = () => {
      fetchStats();
      fetchThreats();
    };

    window.addEventListener('scan:complete', handleScanComplete);
    return () => window.removeEventListener('scan:complete', handleScanComplete);
  }, [isConnected, fetchStats, fetchThreats]);

  const getVerdictCount = (verdict) => stats?.byVerdict?.[verdict] || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of malware analysis activity</p>
        </div>
        <Link to="/upload">
          <Button variant="primary">📤 Upload New File</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key} className="text-center">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {getVerdictCount(stat.key === 'total' ? 'total' : stat.key.toUpperCase())}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verdict Distribution</h3>
          </Card.Header>
          <Card.Content>
            <VerdictDistributionChart 
              data={stats?.scoreDistribution || []} 
              height={300} 
            />
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Score Trend</h3>
          </Card.Header>
          <Card.Content>
            <RiskScoreChart 
              data={[]} 
              height={300} 
            />
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4 text-sm">
              Connect to Live Analysis to see real-time risk score
            </p>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanning Activity (Last 30 Days)</h3>
        </Card.Header>
        <Card.Content>
          <ActivityChart 
            data={stats?.recentActivity || []} 
            height={300} 
          />
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-4">
            <Link to="/upload">
              <Button variant="primary">📤 Upload & Scan File</Button>
            </Link>
            <Link to="/threats">
              <Button variant="secondary">📚 Threat Library</Button>
            </Link>
            <Link to="/history">
              <Button variant="secondary">📋 View History</Button>
            </Link>
            <Link to="/admin">
              <Button variant="secondary">🖥️ Server Monitor</Button>
            </Link>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Threat Library</h3>
          <Link to="/threats" className="text-sm text-primary-600 hover:underline">View All</Link>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(threats || []).slice(0, 6).map((threat) => (
              <div key={threat.type} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{threat.name}</h4>
                  <Badge variant={threat.severity.toLowerCase()}>{threat.severity}</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{threat.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(threat.characteristics || []).slice(0, 3).map((char, i) => (
                    <Badge key={i} variant="info" className="text-xs">{char}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
