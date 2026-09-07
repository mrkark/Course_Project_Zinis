// frontend/src/pages/LiveAnalysis.jsx
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { socketService } from '../services/socket';
import { useLiveAnalysisStore } from '../store/liveAnalysisStore';
import { useScanStore } from '../store/scanStore';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import RiskScoreChart from '../components/charts/RiskScoreChart';

const SEVERITY_COLORS = {
  INFO: 'text-gray-600 dark:text-gray-400',
  WARNING: 'text-warning-600 dark:text-warning-400',
  CRITICAL: 'text-danger-600 dark:text-danger-400',
};

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
  scan: '🔍',
};

export default function LiveAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scanIdFromUrl = searchParams.get('scanId');
  
  const {
    isConnected,
    currentScanId,
    events,
    riskScore,
    verdict,
    staticResults,
    stage,
    progress,
    alerts,
    riskScoreHistory,
    startAnalysis,
    addEvent,
    updateRiskScore,
    addAlert,
    setStage,
    setBehavioralResults,
    setFinalResult,
    setError,
    reset,
  } = useLiveAnalysisStore();
  
  const { fetchScanById } = useScanStore();
  const [mounted, setMounted] = useState(false);
  const eventsEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    setMounted(true);
    
    const connectSocket = async () => {
      try {
        await socketService.connect();
        socketService.subscribeAlerts();
      } catch (error) {
        console.error('Socket connection failed:', error);
        setError('Failed to connect to real-time server');
      }
    };
    
    connectSocket();
    
    // Set up event listeners
    const unsubscribeEvent = socketService.on('analysis:event', (data) => {
      addEvent(data);
      // Update risk score based on event severity
      const severityScores = { INFO: 1, WARNING: 3, CRITICAL: 8 };
      const newScore = Math.min(100, riskScore + (severityScores[data.severity] || 1));
      const newVerdict = calculateVerdict(newScore);
      updateRiskScore(newScore, newVerdict);
    });
    
    const unsubscribeComplete = socketService.on('analysis:complete', (data) => {
      setBehavioralResults(data);
      // Fetch final scan result from API
      if (data.scanId) {
        fetchScanById(data.scanId).then(scan => {
          if (scan) {
            setFinalResult({
              riskScore: scan.riskScore,
              verdict: scan.verdict,
              static: { riskScore: scan.analysisDetails?.static?.detection?.riskScore || 0 },
              behavioral: { riskScore: scan.analysisDetails?.behavioral?.detection?.riskScore || 0 },
            });
          }
        });
      }
    });
    
    const unsubscribeAlert = socketService.on('detector:alert', (data) => {
      addAlert(data);
    });
    
    const unsubscribeProgress = socketService.on('scan:progress', (data) => {
      setStage(data.stage, data.progress);
    });
    
    const unsubscribeScanComplete = socketService.on('scan:complete', (data) => {
      setFinalResult(data);
    });
    
    const unsubscribeScanError = socketService.on('scan:error', (data) => {
      setError(data.error);
    });
    
    const unsubscribeConnected = socketService.on('connected', () => {
      // Join scan room if we have a scan ID
      const scanId = currentScanId || scanIdFromUrl;
      if (scanId) {
        socketService.joinScanRoom(scanId);
        socketService.requestScanEvents(scanId);
      }
    });
    
    return () => {
      unsubscribeEvent();
      unsubscribeComplete();
      unsubscribeAlert();
      unsubscribeProgress();
      unsubscribeScanComplete();
      unsubscribeScanError();
      unsubscribeConnected();
      socketService.unsubscribeAlerts();
      // Don't disconnect - keep for other pages
    };
  }, [currentScanId, scanIdFromUrl, addEvent, updateRiskScore, addAlert, setStage, setBehavioralResults, setFinalResult, setError, fetchScanById, riskScore]);

  // Auto-scroll to bottom of events
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [events.length]);

  // Handle scan ID from URL
  useEffect(() => {
    if (scanIdFromUrl && scanIdFromUrl !== currentScanId) {
      // Load existing scan
      fetchScanById(parseInt(scanIdFromUrl)).then(scan => {
        if (scan) {
          startAnalysis(scanIdFromUrl, scan.analysisDetails?.static || {});
        }
      });
    }
  }, [scanIdFromUrl, currentScanId, fetchScanById, startAnalysis]);

  const calculateVerdict = (score) => {
    if (score >= 80) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'CLEAN';
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString();
  };

  const getEventIcon = (type) => EVENT_TYPE_ICONS[type] || '📌';

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!currentScanId && !scanIdFromUrl) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Analysis</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time behavioral emulation monitoring</p>
        </div>
        
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">📡</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Analysis</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Upload a file from the <Button variant="primary" asChild>
              <a href="/upload">Upload & Scan</a>
            </Button> page to start live analysis.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Analysis</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Scan ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{currentScanId || scanIdFromUrl}</code>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400' 
            : 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success-500' : 'bg-danger-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <Badge variant={verdict.toLowerCase()} className="text-lg px-4 py-2">
            {verdict}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      {stage !== 'idle' && stage !== 'complete' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {stage === 'static_analysis' ? 'Static Analysis' : 'Behavioral Emulation'}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Risk Score & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Risk Score Card */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Score</h3>
              <Badge variant={verdict.toLowerCase()}>{verdict}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">{riskScore}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">/ 100</div>
              </div>
              <RiskScoreChart 
                data={riskScoreHistory.map((h, i) => ({ 
                  timestamp: h.timestamp, 
                  score: h.score,
                  critical: 80,
                  high: 50,
                  medium: 30,
                }))} 
                height={200} 
              />
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-danger-500">🚨</span>
                  Alerts ({alerts.length})
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {alerts.slice().reverse().map((alert) => (
                    <div key={alert.id} className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant={alert.verdict.toLowerCase()}>{alert.verdict}</Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-danger-700 dark:text-danger-300 mt-1">
                        Risk Score: {alert.riskScore} (Static: {alert.staticScore}, Behavioral: {alert.behavioralScore})
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Static Results Summary */}
          {staticResults && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Static Analysis Summary</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Findings</span>
                    <span className="font-medium">{staticResults.findings?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Static Risk Score</span>
                    <span className="font-medium">{staticResults.riskScore || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Categories</span>
                    <span className="font-medium">
                      {(staticResults.categories || []).join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">File Type</span>
                    <span className="font-medium">{staticResults.fileInfo?.fileType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">SHA256</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {staticResults.fileInfo?.sha256 || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Event Log */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Log</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{events.length} events</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  // Clear events locally (not from server)
                }}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {events.slice().reverse().map((event) => {
                    const severityClass = event.severity === 'CRITICAL'
                      ? 'border-danger-500 bg-danger-50/50 dark:bg-danger-900/10'
                      : event.severity === 'WARNING'
                        ? 'border-warning-500 bg-warning-50/50 dark:bg-warning-900/10'
                        : 'border-gray-400';
                    
                    return (
                      <div 
                        key={event.id} 
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-l-4 ${severityClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{getEventIcon(event.eventType)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant={event.severity.toLowerCase()}>{event.severity}</Badge>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {formatTime(event.timestamp)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-mono">{event.message}</p>
                            {event.stage && (
                              <span className="text-xs text-primary-600 dark:text-primary-400 mt-1 inline-block">
                                Stage: {event.stage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={eventsEndRef} />
                </div>
                {events.length === 0 && (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Waiting for events...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final Result */}
      {stage === 'complete' && (
        <Card className="border-2 border-success-500 bg-success-50 dark:bg-success-900/10">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-success-500">✅</span>
              Analysis Complete
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-4xl font-bold text-success-600 dark:text-success-400">{riskScore}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Final Risk Score</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Badge variant={verdict.toLowerCase()} className="text-lg px-6 py-3">{verdict}</Badge>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                <Button variant="primary" asChild onClick={() => navigate(`/history/${currentScanId || scanIdFromUrl}`)}>
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}