// Safety gate — deterministic, pure validate(waypoint): GateResult
// Checks: reachability, joint limits, workspace bounds.
// Handles both 'cartesian' and 'joint' waypoints — nothing bypasses this.

import { JOINTS, SHOULDER, REACH_MAX } from '../robot/constants';
import { fk } from '../robot/fk';
import { solve } from '../ik/solve';
import type { PoseWaypoint, GateResult } from '../pipeline/types';

export function validate(waypoint: PoseWaypoint, currentJoints?: number[]): GateResult {
  if (waypoint.kind === 'cartesian') {
    return validateCartesian(waypoint.target, currentJoints);
  }
  return validateJoint(waypoint.joints);
}

// ── cartesian path ─────────────────────────────────────────────────

function validateCartesian(
  t: { x: number; y: number; z: number },
  currentJoints?: number[],
): GateResult {
  // 1. Distance from shoulder to target
  const dx = t.x;
  const dy = t.y;
  const dz = t.z - SHOULDER[2];
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (d > REACH_MAX * 0.97) {
    return {
      ok: false,
      reason: `Target unreachable: distance ${d.toFixed(3)}m exceeds reach ${REACH_MAX}m`,
      code: 'UNREACHABLE',
    };
  }

  // 2. Ground-plane check
  if (t.z < 0) {
    return { ok: false, reason: 'Target below ground plane', code: 'OUT_OF_BOUNDS' };
  }

  // 3. IK
  const solution = solve(t, currentJoints);
  if (!solution) {
    return { ok: false, reason: 'IK did not converge', code: 'UNREACHABLE' };
  }

  // 4. Joint-limit sanity check on solution
  for (let i = 0; i < 7; i++) {
    if (solution[i] < JOINTS[i].lower || solution[i] > JOINTS[i].upper) {
      return {
        ok: false,
        reason: `Joint ${i} out of limits`,
        code: 'JOINT_LIMIT',
      };
    }
  }

  return { ok: true, jointSolution: solution };
}

// ── joint path ─────────────────────────────────────────────────────

function validateJoint(joints: number[]): GateResult {
  // 1. Limits
  for (let i = 0; i < 7; i++) {
    if (joints[i] < JOINTS[i].lower || joints[i] > JOINTS[i].upper) {
      return {
        ok: false,
        reason: `Joint ${i} (${joints[i].toFixed(3)} rad) exceeds limits [${JOINTS[i].lower}, ${JOINTS[i].upper}]`,
        code: 'JOINT_LIMIT',
      };
    }
  }

  // 2. TCP above ground
  const { tcp } = fk(joints);
  if (tcp.z < 0) {
    return {
      ok: false,
      reason: 'Joint configuration puts TCP below ground',
      code: 'OUT_OF_BOUNDS',
    };
  }

  return { ok: true, jointSolution: joints };
}
