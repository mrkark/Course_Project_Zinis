// frontend/src/services/socket.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
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
      });

      this.socket.on('connect', () => {
        console.log('🔌 Socket connected:', this.socket.id);
        this.reconnectAttempts = 0;
        this.emit('connected', { socketId: this.socket.id });
        resolve(this.socket);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        this.emit('disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      // Forward all events to registered listeners
      this.socket.onAny((eventName, ...args) => {
        this.emit(eventName, ...args);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Room management
  joinScanRoom(scanId) {
    this.socket?.emit('scan:join', scanId);
  }

  leaveScanRoom(scanId) {
    this.socket?.emit('scan:leave', scanId);
  }

  // Alerts subscription
  subscribeAlerts() {
    this.socket?.emit('alerts:subscribe');
  }

  unsubscribeAlerts() {
    this.socket?.emit('alerts:unsubscribe');
  }

  // Request scan events history
  requestScanEvents(scanId) {
    this.socket?.emit('scan:events:request', scanId);
  }

  // Request dashboard stats
  requestDashboardStats() {
    this.socket?.emit('dashboard:stats:request');
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
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

  // Check connection status
  isConnected() {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;