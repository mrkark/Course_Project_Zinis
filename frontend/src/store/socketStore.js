import { create } from 'zustand';
import { socketService } from '../services/socket';

const useSocketStore = create((set) => ({
  isConnected: false,
  connectionError: null,
  initSocket: () => {
    const offConnect = socketService.on('connected', () => set({ isConnected: true, connectionError: null }));
    const offDisconnect = socketService.on('disconnected', () => set({ isConnected: false }));
    const offError = socketService.on('connectionError', (e) => set({ connectionError: e?.message || 'Connection error' }));
    return () => { offConnect(); offDisconnect(); offError(); };
  },
  connect: () => socketService.connect().catch((e) => set({ connectionError: e.message, isConnected: false })),
  disconnect: () => { socketService.disconnect(); set({ isConnected: false }); },
}));
export { useSocketStore };
export default useSocketStore;
