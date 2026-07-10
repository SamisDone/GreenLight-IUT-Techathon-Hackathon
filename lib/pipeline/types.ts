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

// Compiled, low-level, gate-checkable — discriminated union
export type PoseWaypoint =
  | { kind: 'cartesian'; target: Vec3; keepVertical: boolean; label?: string }
  | { kind: 'joint';     joints: number[];                   label?: string };

export type GateResult =
  | { ok: true; jointSolution: number[] }
  | { ok: false; reason: string; code: 'UNREACHABLE' | 'JOINT_LIMIT' | 'OUT_OF_BOUNDS' | 'MALFORMED' };

export type ExecReport = {
  success: boolean;
  commandsExecuted: number;
  commandsRejected: number;
  details: string[];
};
