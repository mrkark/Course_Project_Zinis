import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketService } from '../services/socket';

const useSocketStore = create(
  devtools(
    (set, get) => ({
      isConnected: false,
      isOnline: false,
      connectionError: null,
      lastScanResult: null,
      
      setConnected: (connected) => set({ isConnected: connected }),
      setOnline: (online) => set({ isOnline: online }),
      setConnectionError: (error) => set({ connectionError: error }),
      
      initSocket: () => {
        const unsubscribeConnected = socketService.on('connected', () => {
          set({ isConnected: true, isOnline: true, connectionError: null });
        });
        
        const unsubscribeDisconnected = socketService.on('disconnected', (data) => {
          set({ isConnected: false, isOnline: false });
        });
        
        const unsubscribeOnline = socketService.on('online', (online) => {
          set({ isOnline: online });
        });
        
        const unsubscribeConnectionError = socketService.on('connectionError', (error) => {
          set({ connectionError: error.message });
        });
        
        const unsubscribeMaxRetries = socketService.on('maxRetriesReached', () => {
          set({ isConnected: false, isOnline: false, connectionError: 'Max retries reached' });
        });

        const unsubscribeScanComplete = socketService.on('scan:complete', (result) => {
          set({ lastScanResult: result });
          window.dispatchEvent(new CustomEvent('scan:complete', { detail: result }));
        });
        
        // Return cleanup function
        return () => {
          unsubscribeConnected();
          unsubscribeDisconnected();
          unsubscribeOnline();
          unsubscribeConnectionError();
          unsubscribeMaxRetries();
          unsubscribeScanComplete();
        };
      },
      
      connect: async () => {
        try {
          await socketService.connect();
        } catch (error) {
          set({ connectionError: error.message });
        }
      },
      
      disconnect: () => {
        socketService.disconnect();
        set({ isConnected: false, isOnline: false });
      },
    }),
    { name: 'socket-store' }
  )
);

export default useSocketStore;