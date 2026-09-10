// frontend/src/pages/AdminMonitor.jsx
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const SEVERITY_COLORS = {
  info: 'text-gray-600 dark:text-gray-400',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  error: 'text-danger-600 dark:text-danger-400',
  socket: 'text-purple-600 dark:text-purple-400',
};

const SEVERITY_BG = {
  info: 'bg-blue-500/20 text-blue-400',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  socket: 'bg-purple-500/20 text-purple-400',
};

export default function AdminMonitor() {
  const [logs, setLogs] = useState([]);
  const [clients, setClients] = useState(new Map());
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ connected: 0, disconnected: 0, totalEvents: 0, uptime: 0 });
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('/admin', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
    });

    socket.on('initial:state', (state) => {
      if (state.clients) {
        const clientsMap = new Map();
        state.clients.forEach(c => clientsMap.set(c.id, { ...c, connected: true }));
        setClients(clientsMap);
      }
      if (state.logs) {
        setLogs(state.logs.reverse());
      }
      if (state.uptime) {
        setStats(s => ({ ...s, uptime: state.uptime }));
      }
    });

    socket.on('log', (data) => {
      setLogs(prev => [data, ...prev].slice(0, 500));
      setStats(s => ({ ...s, totalEvents: s.totalEvents + 1 }));
    });

    socket.on('client:connected', (client) => {
      setClients(prev => new Map(prev).set(client.id, { ...client, connected: true, joinedAt: new Date(), eventCount: 0 }));
    });

    socket.on('client:disconnected', (data) => {
      setClients(prev => {
        const next = new Map(prev);
        const client = next.get(data.id);
        if (client) {
          next.set(data.id, { ...client, connected: false, disconnectedAt: new Date(), disconnectReason: data.reason });
        }
        return next;
      });
    });

    socket.on('client:info', (data) => {
      setClients(prev => {
        const next = new Map(prev);
        const client = next.get(data.id);
        if (client) {
          next.set(data.id, { ...client, ...data });
        }
        return next;
      });
    });

    socket.on('client:event', (data) => {
      setClients(prev => {
        const next = new Map(prev);
        const client = next.get(data.clientId);
        if (client) {
          next.set(data.clientId, { 
            ...client, 
            eventCount: (client.eventCount || 0) + 1,
            lastEvent: new Date(),
          });
        }
        return next;
      });
    });

    socket.on('dashboard:stats:update', ({ stats }) => {
      setStats(s => ({ ...s, ...stats }));
    });

    socket.emit('admin:getState');

    return () => {
      socket.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll) scrollToBottom();
  }, [logs.length, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
    if (socketRef.current) {
      socketRef.current.emit('admin:clearLogs');
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    let str = '';
    if (hours > 0) str += hours + 'h ';
    if (minutes > 0) str += (minutes % 60) + 'm ';
    str += (seconds % 60) + 's';
    return str;
  };

  const getSeverityClass = (level) => SEVERITY_BG[level] || SEVERITY_BG.info;
  const getSeverityTextClass = (level) => SEVERITY_COLORS[level] || SEVERITY_COLORS.info;

  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const diff = Date.now() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return seconds + 's ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Мониторинг сервера</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Журналы сервера и подключённые клиенты в реальном времени</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            Auto-scroll
          </label>
          <Button variant="ghost" size="sm" onClick={clearLogs}>Очистить журналы</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 bg-green-500/10 border-green-500/20">
          <div className="text-3xl font-bold text-green-500">{stats.connected || 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Подключённые клиенты</div>
        </div>
        <div className="card p-4 bg-red-500/10 border-red-500/20">
          <div className="text-3xl font-bold text-red-500">{stats.disconnected || 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Отключённые</div>
        </div>
        <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
          <div className="text-3xl font-bold text-yellow-500">{stats.totalEvents || 0}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Всего событий</div>
        </div>
        <div className="card p-4 bg-blue-500/10 border-blue-500/20">
          <div className="text-3xl font-bold text-blue-500">{formatUptime(stats.uptime || 0)}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Время работы сервера</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[700px] flex flex-col">
          <Card.Header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📋 Server Logs</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                Auto-scroll
              </label>
              <Button variant="ghost" size="sm" onClick={clearLogs}>Очистить журналы</Button>
            </div>
          </Card.Header>
          <Card.Content className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-thin" id="logsContainer" ref={logsEndRef}>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No logs yet...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 font-mono text-xs">
                      <div className="flex gap-2">
                        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSeverityClass(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className={`flex-1 ${getSeverityTextClass(log.level)} break-all`}>{log.message}</span>
                      </div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <div className="text-gray-500 dark:text-gray-400 ml-8 mt-1 text-[10px] font-mono">
                          {JSON.stringify(log.meta)}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card className="h-[700px] flex flex-col">
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center justify-between">
              🔌 Connected Clients
              <span className="text-sm text-gray-500 dark:text-gray-400">{clients.size}</span>
            </h3>
          </Card.Header>
          <Card.Content className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              {clients.size === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No clients connected
                </div>
              ) : (
                Array.from(clients.entries()).map(([id, client]) => (
                  <div key={id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${client.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-mono text-sm text-gray-900 dark:text-white truncate max-w-xs">{id}</span>
                        <Badge variant={client.connected ? 'success' : 'danger'} className="text-xs">
                          {client.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono flex flex-wrap gap-4">
                        <span title={client.userAgent} className="truncate max-w-[200px]">{client.userAgent?.slice(0, 80)}...</span>
                        <span>События: {client.eventCount || 0}</span>
                        <span>Подключён: {client.joinedAt ? formatTimeAgo(client.joinedAt) : 'Unknown'}</span>
                        <span>IP-адрес: {client.ip}</span>
                        {client.disconnectedAt && <span className="text-red-500">Отключён: {formatTimeAgo(client.disconnectedAt)}</span>}
                        {client.disconnectReason && <span className="text-red-500">Причина: {client.disconnectReason}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  if (!date) return 'Unknown';
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return seconds + 's ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function formatUptime(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  let str = '';
  if (hours > 0) str += hours + 'h ';
  if (minutes > 0) str += (minutes % 60) + 'm ';
  str += (seconds % 60) + 's';
  return str;
}