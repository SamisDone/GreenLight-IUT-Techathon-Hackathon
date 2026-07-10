import { create } from 'zustand';
import { fk } from '../lib/robot/fk';
import type { Vec3 } from '../lib/pipeline/types';

export type Mode = 'idle' | 'joint' | 'ik' | 'voice' | 'agent';

export type LogEntry = {
  source: string;
  kind: string;
  result: 'ALLOW' | 'REJECT';
  reason?: string;
  timestamp: number;
};

export type PinDigitResult = {
  digit: string;
  keyId: string;
  errorMm: number;
  pass: boolean;
};

export type PinState = {
  active: boolean;
  pin: string;
  currentDigitIndex: number;
  activeKeyId: string | null;
  results: PinDigitResult[];
  phase: 'running' | 'complete' | 'failed';
  failReason?: string;
};

interface RobotState {
  joints: number[];
  tcp: Vec3;
  mode: Mode;
  safetyFlag: boolean;
  logs: LogEntry[];
  motionQueue: number[][];
  isMoving: boolean;
  pinState: PinState | null;

  // Joint / motion
  setJoints: (j: number[]) => void;
  setMode: (m: Mode) => void;
  addLog: (entry: LogEntry) => void;

  // Motion queue
  enqueueMotion: (joints: number[]) => void;
  completeMotion: () => void;
  setIsMoving: (v: boolean) => void;
  clearQueue: () => void;

  // PIN
  setPinState: (ps: PinState | null) => void;
  updatePinState: (patch: Partial<PinState>) => void;
  addPinResult: (result: PinDigitResult) => void;
}

const HOME = [0, 0, 0, 0, 0, 0, 0];
const homeTcp = fk(HOME).tcp;

export const useRobotStore = create<RobotState>((set) => ({
  joints: [...HOME],
  tcp: homeTcp,
  mode: 'idle',
  safetyFlag: false,
  logs: [],
  motionQueue: [],
  isMoving: false,
  pinState: null,

  setJoints: (j) => set({ joints: [...j], tcp: fk(j).tcp }),
  setMode: (m) => set({ mode: m }),
  addLog: (entry) => set((s) => ({ logs: [...s.logs.slice(-199), entry] })),

  enqueueMotion: (joints) => set((s) => ({
    motionQueue: [...s.motionQueue, [...joints]],
    isMoving: true,
  })),

  completeMotion: () => set((s) => {
    const next = s.motionQueue.slice(1);
    return { motionQueue: next, isMoving: next.length > 0 };
  }),

  setIsMoving: (v) => set({ isMoving: v }),

  clearQueue: () => set({ motionQueue: [], isMoving: false }),

  // PIN state
  setPinState: (ps) => set({ pinState: ps }),
  updatePinState: (patch) => set((s) => ({
    pinState: s.pinState ? { ...s.pinState, ...patch } : null,
  })),
  addPinResult: (result) => set((s) => ({
    pinState: s.pinState
      ? { ...s.pinState, results: [...s.pinState.results, result] }
      : null,
  })),
}));
