import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  { key: 'total', label: 'Total scans', color: 'primary' },
  { key: 'critical', label: 'Критический', color: 'danger' },
  { key: 'high', label: 'Высокий', color: 'warning' },
  { key: 'medium', label: 'Средний', color: 'warning' },
  { key: 'low', label: 'Низкий', color: 'primary' },
  { key: 'clean', label: 'Без угроз', color: 'success' },
];

export default function Dashboard() {
  const location = useLocation();
  const { stats, scans, fetchStats, fetchScans, loading: statsLoading } = useScanStore();
  const { threats, fetchThreats } = useThreatStore();
  const { isConnected } = useSocketStore();

  useEffect(() => {
    fetchStats();
    fetchThreats();
    fetchScans({ limit: 5, offset: 0 });
  }, [fetchStats, fetchThreats, fetchScans]);

  // Auto-refresh when connected and a scan completes
  useEffect(() => {
    if (!isConnected) return;
    
    const handleScanComplete = () => {
      fetchStats();
      fetchThreats();
      fetchScans({ limit: 5, offset: 0 });
    };

    window.addEventListener('scan:complete', handleScanComplete);
    return () => window.removeEventListener('scan:complete', handleScanComplete);
  }, [isConnected, fetchStats, fetchThreats, fetchScans]);

  const getVerdictCount = (verdict) => verdict === 'total' ? (stats?.total || 0) : (stats?.byVerdict?.[verdict] || 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Обзор анализа</div>
          <h1 className="page-title text-3xl font-bold">Панель управления</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Обзор результатов анализа файлов</p>
        </div>
        <Link to="/upload">
          <Button variant="primary">Загрузить файл</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key} className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {getVerdictCount(stat.key === 'total' ? 'total' : stat.key.toUpperCase())}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {location.state?.scanResult && (
        <Card className="border-primary-200 dark:border-primary-800">
          <Card.Header className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Последний результат анализа</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Результат сохранён в базе данных</p>
            </div>
            <Badge variant={location.state.scanResult.verdict?.toLowerCase() || 'info'}>
              {location.state.scanResult.verdict || 'UNKNOWN'}
            </Badge>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Файл</div>
                <div className="mt-1 font-medium text-gray-900 dark:text-white break-all">{location.state.scanResult.fileInfo?.name || location.state.scanResult.scan?.filename}</div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Оценка риска</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{location.state.scanResult.riskScore ?? 0}<span className="text-sm font-normal text-gray-500">/100</span></div>
              </div>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Идентификатор в базе данных</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">#{location.state.scanResult.scanId || '—'}</div>
              </div>
            </div>
            {location.state.scanResult.result?.behavioral && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-gray-500">Оценка поведения</span><div className="font-semibold text-gray-900 dark:text-white">{location.state.scanResult.result.behavioral.riskScore}/100</div></div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-gray-500">События</span><div className="font-semibold text-gray-900 dark:text-white">{location.state.scanResult.result.behavioral.eventCount}</div></div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-gray-500">Критический events</span><div className="font-semibold text-gray-900 dark:text-white">{location.state.scanResult.result.behavioral.criticalEvents}</div></div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"><span className="text-gray-500">Тип угрозы</span><div className="font-semibold text-gray-900 dark:text-white">{location.state.scanResult.result.behavioral.malwareType || location.state.scanResult.behavioral?.malwareType || 'Detected'}</div></div>
              </div>
            )}
            {location.state.scanResult.scanId && (
              <div className="mt-4"><Link to={`/history/${location.state.scanResult.scanId}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Открыть подробности анализа →</Link></div>
            )}
          </Card.Content>
        </Card>
      )}

      <Card>
        <Card.Header className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Последние сканирования</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Последние результаты, сохранённые в базе данных</p>
          </div>
          <Link to="/history" className="text-sm text-primary-600 hover:underline">Открыть историю</Link>
        </Card.Header>
        <Card.Content>
          {scans?.length ? (
            <div className="space-y-3">
              {scans.slice(0, 5).map((scan) => (
                <Link key={scan.id} to={`/history/${scan.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                  <div className="min-w-0"><div className="font-medium text-gray-900 dark:text-white truncate">{scan.filename}</div><div className="text-xs text-gray-500 dark:text-gray-400">{new Date(scan.createdAt).toLocaleString()}</div></div>
                  <div className="flex items-center gap-4"><span className="font-mono text-sm">{scan.riskScore}/100</span><Badge variant={scan.verdict?.toLowerCase() || 'info'}>{scan.verdict}</Badge></div>
                </Link>
              ))}
            </div>
          ) : <div className="py-8 text-center text-gray-500 dark:text-gray-400">Сохранённых сканирований пока нет.</div>}
        </Card.Content>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Вердикт Distribution</h3>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Оценка риска Trend</h3>
          </Card.Header>
          <Card.Content>
            <RiskScoreChart 
              data={(scans || []).slice().reverse().map((scan) => ({
                timestamp: scan.createdAt,
                score: Number(scan.riskScore) || 0,
                critical: 80,
                high: 50,
                medium: 30,
              }))}
              height={300}
            />
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4 text-sm">
              Risk scores from completed scans
            </p>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Активность сканирования за последние 30 дней</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Быстрые действия</h3>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-4">
            <Link to="/upload">
              <Button variant="primary">Загрузить и сканировать</Button>
            </Link>
            <Link to="/threats">
              <Button variant="secondary">Библиотека угроз</Button>
            </Link>
            <Link to="/history">
              <Button variant="secondary">Открыть историю</Button>
            </Link>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Библиотека угроз</h3>
          <Link to="/threats" className="text-sm text-primary-600 hover:underline">Показать все</Link>
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
