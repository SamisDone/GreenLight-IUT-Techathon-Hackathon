// The core contract — every input source and every executor depends on these types.

export type Vec3 = { x: number; y: number; z: number };

// High-level intent, emitted by every input source
export type MotionCommand =
  | { kind: 'jog'; axis: 'x' | 'y' | 'z'; delta: number }        // Cartesian nudge (meters)
  | { kind: 'moveTo'; target: Vec3; keepVertical?: boolean }      // absolute stylus tip target
  | { kind: 'rotateJoint'; joint: number; deltaDeg: number }      // e.g. rotate base 30 deg
  | { kind: 'touchKey'; keyId: string }                           // approach, descend, retract
  | { kind: 'enterPin'; pin: string }                             // compiles to touchKey[]
  | { kind: 'home' };

// Compiled, low-level, gate-checkable
export type PoseWaypoint = {
  target: Vec3;
  keepVertical: boolean;
  label?: string;      // for the console log, e.g. "above key 5", "descend"
};

export type GateResult =
  | { ok: true; jointSolution: number[] }
  | { ok: false; reason: string; code: 'UNREACHABLE' | 'JOINT_LIMIT' | 'OUT_OF_BOUNDS' | 'MALFORMED' };

export type ExecReport = {
  success: boolean;
  commandsExecuted: number;
  commandsRejected: number;
  details: string[];
};
