import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useScanStore from '../store/scanStore';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import RiskScoreChart from '../components/charts/RiskScoreChart';

const EVENT_TYPE_ICONS = {
  file_access: '📄',
  file_modification: '✏️',
  file_creation: '➕',
  file_rename: '🔄',
  directory_scan: '📁',
  file_enumeration: '📋',
  process_spawn: '⚙️',
  crypto_operation: '🔐',
  network_connection: '🌐',
  network_dns: '🔍',
  c2_command: '🎮',
  command_execution: '💻',
  data_exfiltration: '📤',
  keystroke_capture: '⌨️',
  clipboard_access: '📋',
  hook_install: '🪝',
  persistence: '🔒',
  exploit_attempt: '💥',
  payload_delivery: '📦',
  remote_execution: '🖥️',
  service_enumeration: '🔧',
  ad_injection: '📢',
  traffic_redirection: '🔀',
  data_collection: '📊',
  system_modification: '⚙️',
  credential_theft: '🔑',
  ransom_note: '📝',
};

const SEVERITY_COLORS = {
  INFO: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
  WARNING: 'border-warning-500 bg-warning-50 dark:bg-warning-900/20',
  CRITICAL: 'border-danger-500 bg-danger-50 dark:bg-danger-900/20',
};

export default function ScanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentScan, fetchScanById, loading, deleteScan } = useScanStore();
  const scanId = parseInt(id, 10);

  useEffect(() => {
    if (scanId) {
      fetchScanById(scanId);
    }
  }, [scanId, fetchScanById]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this scan record?')) return;
    const success = await deleteScan(scanId);
    if (success) {
      navigate('/history');
    } else {
      alert('Failed to delete scan');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !currentScan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!currentScan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Сканирование не найдено</h2>
        <Button variant="primary" onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </div>
    );
  }

  const scan = currentScan;
  const details = scan.analysisDetails || {};
  const staticDetails = details.static || {};
  const behavioralDetails = details.behavioral || {};
  const combinedDetails = details.combined || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Подробности сканирования</h1>
          <p className="text-gray-500 dark:text-gray-400">Идентификатор: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{scan.id}</code></p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={scan.verdict.toLowerCase()} className="text-lg px-4 py-2">{scan.verdict}</Badge>
          <Button variant="danger" onClick={handleDelete}>Удалить</Button>
          <Button variant="secondary" onClick={() => navigate('/history')}>
            Back to History
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{scan.riskScore}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Оценка риска</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatFileSize(scan.fileSize)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Файл Size</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{scan.fileType}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Файл Type</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatDate(scan.createdAt).split(',')[0]}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Дата сканирования</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Файл Information</h3>
            </Card.Header>
            <Card.Content>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Имя файла</dt>
                  <dd className="font-mono truncate max-w-[200px] text-right">{scan.filename}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">SHA-256</dt>
                  <dd className="font-mono text-xs truncate max-w-[200px] text-right">{scan.fileHash}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Размер</dt>
                  <dd className="font-medium">{formatFileSize(scan.fileSize)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Тип</dt>
                  <dd className="font-medium">{scan.fileType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">MIME-тип</dt>
                  <dd className="font-medium text-xs truncate max-w-[200px] text-right">{scan.mimeType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Время сканирования</dt>
                  <dd className="font-medium">{formatDate(scan.createdAt)}</dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          {staticDetails.findings && staticDetails.findings.length > 0 && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Результаты статического анализа ({staticDetails.findings.length})</h3>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {staticDetails.findings.map((finding, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{finding.category}</span>
                        <Badge variant="info">{finding.score} pts</Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{finding.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 font-mono mt-1">
                        Pattern: {finding.pattern}
                      </p>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Оценка риска Progression</h3>
            </Card.Header>
            <Card.Content>
              <RiskScoreChart 
                data={combinedDetails.riskScoreHistory?.map(h => ({ 
                  timestamp: h.timestamp, 
                  score: h.score,
                  critical: 80,
                  high: 50,
                  medium: 30,
                })) || []} 
                height={250} 
              />
            </Card.Content>
          </Card>

          {behavioralDetails.events && behavioralDetails.events.length > 0 && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">События поведенческого анализа ({behavioralDetails.events.length})</h3>
              </Card.Header>
              <Card.Content className="p-0">
                <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-gray-200 dark:divide-gray-700">
                  {behavioralDetails.events.map((event, i) => (
                    <div 
                      key={i} 
                      className={`p-4 ${SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.INFO}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">{EVENT_TYPE_ICONS[event.eventType] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={event.severity.toLowerCase()}>{event.severity}</Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">{event.message}</p>
                          {event.metadata?.stage && (
                            <span className="text-xs text-primary-600 dark:text-primary-400 mt-1 inline-block">
                              Stage: {event.metadata.stage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {(staticDetails.detection || behavioralDetails.detection) && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Результаты обнаружения</h3>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {staticDetails.detection && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Статический анализ</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Оценка риска</dt>
                          <dd className="font-bold">{staticDetails.detection.riskScore}/100</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Вердикт</dt>
                          <dd className="font-bold">
                            <Badge variant={staticDetails.detection.verdict.toLowerCase()}>
                              {staticDetails.detection.verdict}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Находки</dt>
                          <dd className="font-medium">{staticDetails.detection.staticFindings}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Категории</dt>
                          <dd className="font-medium text-xs truncate max-w-[150px]">
                            {(staticDetails.detection.categories || []).join(', ') || 'None'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                  {behavioralDetails.detection && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Поведенческий анализ</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Оценка риска</dt>
                          <dd className="font-bold">{behavioralDetails.detection.riskScore}/100</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Вердикт</dt>
                          <dd className="font-bold">
                            <Badge variant={behavioralDetails.detection.verdict.toLowerCase()}>
                              {behavioralDetails.detection.verdict}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Всего событий</dt>
                          <dd className="font-medium">{behavioralDetails.detection.eventCount}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Критический Events</dt>
                          <dd className="font-medium text-danger-600 dark:text-danger-400">
                            {behavioralDetails.detection.criticalEvents}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Сетевые события</dt>
                          <dd className="font-medium">{behavioralDetails.detection.networkEvents}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Сработавшие правила</dt>
                          <dd className="font-medium">{behavioralDetails.detection.triggeredRules?.length || 0}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
