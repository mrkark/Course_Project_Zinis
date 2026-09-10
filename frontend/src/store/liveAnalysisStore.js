import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useLiveAnalysisStore = create(
  devtools(
    (set) => ({
      isConnected: false,
      currentScanId: null,
      events: [],
      riskScore: 0,
      verdict: 'CLEAN',
      staticResults: null,
      behavioralResults: null,
      finalResult: null,
      stage: 'idle',
      progress: 0,
      alerts: [],
      riskScoreHistory: [],
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      startAnalysis: (scanId, staticResults) => set({
        currentScanId: scanId,
        events: [],
        riskScore: 0,
        verdict: 'CLEAN',
        staticResults,
        behavioralResults: null,
        finalResult: null,
        stage: 'behavioral_emulation',
        progress: 50,
        alerts: [],
        riskScoreHistory: [{ timestamp: Date.now(), score: staticResults?.riskScore || 0 }],
      }),
      
      addEvent: (event) => set((state) => {
        const newEvents = [...state.events, { ...event, id: Date.now() + Math.random() }];
        if (newEvents.length > 500) newEvents.shift();
        return { events: newEvents };
      }),
      
      updateRiskScore: (score, verdict) => set((state) => ({
        riskScore: score,
        verdict,
        riskScoreHistory: [...state.riskScoreHistory.slice(-99), { timestamp: Date.now(), score }],
      })),
      
      addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts.slice(-49), { ...alert, id: Date.now() }],
      })),
      
      setStage: (stage, progress) => set({ stage, progress }),
      setBehavioralResults: (results) => set({ behavioralResults: results }),
      
      setFinalResult: (result) => set({
        finalResult: result,
        stage: 'complete',
        progress: 100,
        riskScore: result.riskScore,
        verdict: result.verdict,
      }),
      
      setError: (error) => set({ stage: 'error', error }),
      
      reset: () => set({
        isConnected: false,
        currentScanId: null,
        events: [],
        riskScore: 0,
        verdict: 'CLEAN',
        staticResults: null,
        behavioralResults: null,
        finalResult: null,
        stage: 'idle',
        progress: 0,
        alerts: [],
        riskScoreHistory: [],
      }),
    }),
    { name: 'live-analysis-store' }
  )
);

export default useLiveAnalysisStore;