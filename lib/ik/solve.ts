// Inverse kinematics solver
// Yaw (J1) + 4-link planar CCD on J2/J3/J5/J7. J4 = J6 = 0.
// When keepVertical=true, J7 compensates so the stylus points straight down (-Z).
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
 * Planar FK: compute joint positions and tip in the (r, z) plane.
 * Chain starts at shoulder (0, SHOULDER_Z).
 * At home (all angles = 0), chain points straight up (+z).
 * cumAngle measured from +z, positive = tilt toward +r.
 * Returns 5 points: [shoulder, after-link0, after-link1, after-link2, tip]
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

  return pts;
}

// ── solver ─────────────────────────────────────────────────────────

export function solve(target: Vec3, seed?: number[], keepVertical = false): number[] | null {
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

  if (keepVertical) {
    // ── Vertical-stylus mode ──
    // The stylus must point straight down (-Z), so cumulative angle = π.
    // We solve a 3-link chain (J2, J3, J5) to reach the "wrist" position
    // (target offset by PLANAR_LINKS[3] upward, since the stylus hangs down),
    // then set J7 so that cumAngle = π.

    const stylusLen = PLANAR_LINKS[3];   // 0.137
    // Wrist target: stylus hangs straight down from wrist, so wrist is directly above target
    const rWrist = rTarget;
    const zWrist = zTarget + stylusLen;

    // 3-link CCD: only J2, J3, J5 (links 0,1,2)
    const WRIST_LINKS = [PLANAR_LINKS[0], PLANAR_LINKS[1], PLANAR_LINKS[2]];
    const WRIST_JOINTS = [1, 2, 4] as const;

    const wa = [pa[0], pa[1], pa[2]];  // warm-start from seed

    for (let iter = 0; iter < MAX_ITER; iter++) {
      for (let j = 2; j >= 0; j--) {
        // Pivot of joint j
        let pr = 0, pz = SHOULDER_Z, ca = 0;
        for (let k = 0; k < j; k++) {
          ca += wa[k];
          pr += WRIST_LINKS[k] * Math.sin(ca);
          pz += WRIST_LINKS[k] * Math.cos(ca);
        }

        // Tip of 3-link chain
        let tr = 0, tz = SHOULDER_Z;
        ca = 0;
        for (let k = 0; k < 3; k++) {
          ca += wa[k];
          tr += WRIST_LINKS[k] * Math.sin(ca);
          tz += WRIST_LINKS[k] * Math.cos(ca);
        }

        const toTipR = tr - pr, toTipZ = tz - pz;
        const toTgtR = rWrist - pr, toTgtZ = zWrist - pz;

        const angleTip = Math.atan2(toTipR, toTipZ);
        const angleTgt = Math.atan2(toTgtR, toTgtZ);
        const delta = angleTgt - angleTip;

        const ji = WRIST_JOINTS[j];
        wa[j] = clamp(wa[j] + delta, JOINTS[ji].lower, JOINTS[ji].upper);
      }

      // Check wrist convergence
      let wr = 0, wz = SHOULDER_Z, wca = 0;
      for (let k = 0; k < 3; k++) {
        wca += wa[k];
        wr += WRIST_LINKS[k] * Math.sin(wca);
        wz += WRIST_LINKS[k] * Math.cos(wca);
      }

      const dr = wr - rWrist;
      const dz = wz - zWrist;
      const err = Math.sqrt(dr * dr + dz * dz);

      if (err < TOLERANCE) {
        // Set J7 so total cumulative = π (pointing straight down)
        const cumJ2J3J5 = wa[0] + wa[1] + wa[2];
        const j7 = Math.PI - cumJ2J3J5;
        const j7c = clamp(j7, JOINTS[6].lower, JOINTS[6].upper);

        // Verify full-chain tip accuracy
        const fullPa = [wa[0], wa[1], wa[2], j7c];
        const pts = planarPositions(fullPa);
        const tip = pts[4];
        const tipErr = Math.sqrt((tip.r - rTarget) ** 2 + (tip.z - zTarget) ** 2);

        if (tipErr < TOLERANCE * 2) {
          const j1c = clamp(j1, JOINTS[0].lower, JOINTS[0].upper);
          return [j1c, wa[0], wa[1], 0, wa[2], 0, j7c];
        }
        // J7 was clamped too hard — fall through to general solver
        break;
      }
    }

    // If vertical mode failed, fall through to general CCD
  }

  // ── General CCD (no orientation constraint) ──
  // Reset warm-start if we fell through from vertical mode
  if (seed) {
    pa[0] = seed[1]; pa[1] = seed[2]; pa[2] = seed[4]; pa[3] = seed[6];
  } else {
    pa[0] = 0; pa[1] = 0; pa[2] = 0; pa[3] = 0;
  }

  for (let iter = 0; iter < MAX_ITER; iter++) {
    for (let j = 3; j >= 0; j--) {
      const pts = planarPositions(pa);
      const pivot = pts[j];
      const tip = pts[4];

      const toTipR = tip.r - pivot.r;
      const toTipZ = tip.z - pivot.z;
      const toTgtR = rTarget - pivot.r;
      const toTgtZ = zTarget - pivot.z;

      const angleTip = Math.atan2(toTipR, toTipZ);
      const angleTgt = Math.atan2(toTgtR, toTgtZ);
      const delta = angleTgt - angleTip;

      const ji = PLANAR_TO_JOINT[j];
      pa[j] = clamp(pa[j] + delta, JOINTS[ji].lower, JOINTS[ji].upper);
    }

    const pts = planarPositions(pa);
    const tip = pts[4];
    const dr = tip.r - rTarget;
    const dz = tip.z - zTarget;
    const err = Math.sqrt(dr * dr + dz * dz);

    if (err < TOLERANCE) {
      const j1c = clamp(j1, JOINTS[0].lower, JOINTS[0].upper);
      return [j1c, pa[0], pa[1], 0, pa[2], 0, pa[3]];
    }
  }

  return null;
}
