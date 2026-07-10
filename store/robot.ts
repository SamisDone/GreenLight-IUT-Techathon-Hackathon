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
  joints: number[];       // length 7, init [0,0,0,0,0,0,0]
  tcp: Vec3;              // computed from FK
  mode: Mode;
  safetyFlag: boolean;
  logs: LogEntry[];
  setJoints: (j: number[]) => void;
  setMode: (m: Mode) => void;
  addLog: (entry: LogEntry) => void;
}

const HOME = [0, 0, 0, 0, 0, 0, 0];
const homeTcp = fk(HOME).tcp;

export const useRobotStore = create<RobotState>((set) => ({
  joints: [...HOME],
  tcp: homeTcp,
  mode: 'idle',
  safetyFlag: false,
  logs: [],
  setJoints: (j) => set({ joints: [...j], tcp: fk(j).tcp }),
  setMode: (m) => set({ mode: m }),
  addLog: (entry) => set((s) => ({ logs: [...s.logs.slice(-199), entry] })),
}));
