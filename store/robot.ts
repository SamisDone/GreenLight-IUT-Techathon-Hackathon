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

interface RobotState {
  joints: number[];             // length 7, current visual position
  tcp: Vec3;                    // computed from FK
  mode: Mode;
  safetyFlag: boolean;
  logs: LogEntry[];
  motionQueue: number[][];      // FIFO of validated joint targets
  isMoving: boolean;            // true while interpolating toward a target

  // Instant — for sliders/debug
  setJoints: (j: number[]) => void;
  setMode: (m: Mode) => void;
  addLog: (entry: LogEntry) => void;

  // Motion queue — for pipeline (smooth interpolation)
  enqueueMotion: (joints: number[]) => void;
  completeMotion: () => void;   // shift front off the queue
  setIsMoving: (v: boolean) => void;
  clearQueue: () => void;
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
}));
