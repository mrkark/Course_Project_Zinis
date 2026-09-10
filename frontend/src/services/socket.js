import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isOnline = false;
  }

  connect() {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    return new Promise((resolve, reject) => {
      this.socket = io('/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('🔌 Socket connected:', this.socket.id);
        this.isOnline = true;
        this.reconnectAttempts = 0;
        
        // Send client info to server
        this.socket.emit('client:info', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timestamp: new Date().toISOString(),
        });

        this.emit('connected', { socketId: this.socket.id, online: true });
        this.emit('online', true);
        resolve(this.socket);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.isOnline = false;
        this.emit('disconnected', { reason });
        this.emit('online', false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
        this.reconnectAttempts++;
        this.emit('connectionError', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('maxRetriesReached');
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      // Reconnection events
      this.socket.on('reconnect_attempt', (attempt) => {
        this.emit('reconnecting', { attempt });
      });

      this.socket.on('reconnect', (attempt) => {
        this.isOnline = true;
        this.emit('reconnected', { attempt });
        // Re-send client info after reconnect
        this.socket.emit('client:info', {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timestamp: new Date().toISOString(),
        });
      });

      this.socket.onAny((eventName, ...args) => {
        this.emit(eventName, ...args);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isOnline = false;
    }
  }

  // Client info reporting
  sendClientInfo(info = {}) {
    this.socket?.emit('client:info', {
      ...info,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
    });
  }

  // Report custom events from client
  reportEvent(eventType, data = {}) {
    this.socket?.emit('client:event', {
      eventType,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  joinScanRoom(scanId) {
    this.socket?.emit('scan:join', scanId);
  }

  leaveScanRoom(scanId) {
    this.socket?.emit('scan:leave', scanId);
  }

  subscribeAlerts() {
    this.socket?.emit('alerts:subscribe');
  }

  unsubscribeAlerts() {
    this.socket?.emit('alerts:unsubscribe');
  }

  requestScanEvents(scanId) {
    this.socket?.emit('scan:events:request', scanId);
  }

  requestDashboardStats() {
    this.socket?.emit('dashboard:stats:request');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in socket listener for ${event}:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }

  isOnline() {
    return this.isOnline;
  }
}

export const socketService = new SocketService();
export default socketService;