import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { threatsApi } from '../services/api';

const useThreatStore = create(
  devtools(
    (set) => ({
      threats: [],
      loading: false,
      error: null,
      
      fetchThreats: async () => {
        set({ loading: true, error: null });
        try {
          const result = await threatsApi.list();
          set({ threats: result.data, loading: false });
        } catch (error) {
          set({ error: error.message || 'Failed to fetch threats', loading: false });
        }
      },
    }),
    { name: 'threat-store' }
  )
);

export default useThreatStore;