// Inverse kinematics solver
// Yaw (J1) + 4-link planar CCD on J2/J3/J5/J7. J4 = J6 = 0.
// Pure math, no Three.js.

import { JOINTS, SHOULDER, PLANAR_LINKS, TOLERANCE } from '../robot/constants';
import type { Vec3 } from '../pipeline/types';

// ── constants ──────────────────────────────────────────────────────

const MAX_ITER = 100;
const SHOULDER_Z = SHOULDER[2];                            // 0.310

// Map from planar index → JOINTS index for limit checking
const PLANAR_TO_JOINT = [1, 2, 4, 6] as const;            // J2, J3, J5, J7

// ── helpers ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Planar FK: compute joint positions AND tip in the (r, z) plane.
 * Chain starts at shoulder (0, SHOULDER_Z).
 * At home (all angles = 0), chain points straight up (+z).
 * cumAngle is measured from +z axis, positive = tilt toward +r.
 *
 * Returns array of 5 points: [shoulder, after-link0, after-link1, after-link2, tip]
 */
function planarPositions(angles: number[]): { r: number; z: number }[] {
  const pts: { r: number; z: number }[] = [{ r: 0, z: SHOULDER_Z }];
  let r = 0, z = SHOULDER_Z;
  let cumAngle = 0;

  for (let i = 0; i < 4; i++) {
    cumAngle += angles[i];
    r += PLANAR_LINKS[i] * Math.sin(cumAngle);
    z += PLANAR_LINKS[i] * Math.cos(cumAngle);
    pts.push({ r, z });
  }

  return pts;  // pts[0] = shoulder, pts[4] = tip
}

// ── solver ─────────────────────────────────────────────────────────

export function solve(target: Vec3, seed?: number[]): number[] | null {
  // 1. J1 = yaw
  const j1 = Math.atan2(target.y, target.x);

  // 2. Planar target
  const rTarget = Math.sqrt(target.x * target.x + target.y * target.y);
  const zTarget = target.z;

  // 3. Warm-start planar angles [J2, J3, J5, J7]
  const pa = [0, 0, 0, 0];
  if (seed) {
    pa[0] = seed[1];   // J2
    pa[1] = seed[2];   // J3
    pa[2] = seed[4];   // J5
    pa[3] = seed[6];   // J7
  }

  // 4. CCD iterations
  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Sweep tip-to-base: J7 (index 3) → J5 (2) → J3 (1) → J2 (0)
    for (let j = 3; j >= 0; j--) {
      const pts = planarPositions(pa);

      // Joint j pivot is at pts[j] (shoulder for j=0, end of prev link for j>0)
      const pivot = pts[j];
      // Current tip is at pts[4]
      const tip = pts[4];

      // Vectors from pivot to tip and target
      const toTipR = tip.r - pivot.r;
      const toTipZ = tip.z - pivot.z;
      const toTgtR = rTarget - pivot.r;
      const toTgtZ = zTarget - pivot.z;

      // Angle between vectors: how much to rotate the sub-chain
      // Use atan2 for signed angle: positive = CCW in (r,z) plane
      const angleTip = Math.atan2(toTipR, toTipZ);   // angle of tip vector from +z
      const angleTgt = Math.atan2(toTgtR, toTgtZ);   // angle of target vector from +z
      const delta = angleTgt - angleTip;

      // Update and clamp
      const ji = PLANAR_TO_JOINT[j];
      pa[j] = clamp(pa[j] + delta, JOINTS[ji].lower, JOINTS[ji].upper);
    }

    // Check convergence
    const pts = planarPositions(pa);
    const tip = pts[4];
    const dr = tip.r - rTarget;
    const dz = tip.z - zTarget;
    const err = Math.sqrt(dr * dr + dz * dz);

    if (err < TOLERANCE) {
      // Clamp J1 too
      const j1c = clamp(j1, JOINTS[0].lower, JOINTS[0].upper);
      return [j1c, pa[0], pa[1], 0, pa[2], 0, pa[3]];
    }
  }

  return null;                                             // did not converge
}
