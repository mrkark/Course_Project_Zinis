// frontend/src/store/scanStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { scansApi } from '../services/api';

const useScanStore = create(
  devtools(
    (set, get) => ({
      // State
      scans: [],
      currentScan: null,
      stats: null,
      pagination: { limit: 50, offset: 0, total: 0 },
      filters: { verdict: '', search: '', dateFrom: '', dateTo: '' },
      loading: false,
      error: null,
      
      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      
      fetchScans: async (newFilters = {}) => {
        set({ loading: true, error: null });
        try {
          const filters = { ...get().filters, ...newFilters };
          const pagination = get().pagination;
          
          const params = {
            ...filters,
            limit: pagination.limit,
            offset: pagination.offset,
          };
          
          const result = await scansApi.list(params);
          
          set({
            scans: result.data,
            pagination: { ...pagination, total: result.pagination.total },
            filters,
            loading: false,
          });
        } catch (error) {
          set({ error: error.message || 'Failed to fetch scans', loading: false });
        }
      },
      
      fetchScanById: async (id) => {
        set({ loading: true, error: null });
        try {
          const scan = await scansApi.get(id);
          set({ currentScan: scan.data, loading: false });
          return scan.data;
        } catch (error) {
          set({ error: error.message || 'Failed to fetch scan', loading: false });
          return null;
        }
      },
      
      deleteScan: async (id) => {
        set({ loading: true, error: null });
        try {
          await scansApi.delete(id);
          set((state) => ({
            scans: state.scans.filter(s => s.id !== id),
            pagination: { ...state.pagination, total: state.pagination.total - 1 },
            loading: false,
          }));
          return true;
        } catch (error) {
          set({ error: error.message || 'Failed to delete scan', loading: false });
          return false;
        }
      },
      
      fetchStats: async () => {
        try {
          const result = await scansApi.getStats();
          set({ stats: result.data });
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        }
      },
      
      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination },
      })),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
        pagination: { ...state.pagination, offset: 0 }, // Reset to first page
      })),
      
      clearCurrentScan: () => set({ currentScan: null }),
    }),
    { name: 'scan-store' }
  )
);

export { useScanStore };