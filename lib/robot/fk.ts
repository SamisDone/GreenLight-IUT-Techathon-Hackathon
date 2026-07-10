// Forward kinematics — compute every joint transform and the TCP position
// in the base frame (Z-up). Pure math, no Three.js imports.

import { JOINTS, TCP_OFFSET } from './constants';
import type { Vec3 } from '../pipeline/types';

// ── helpers ────────────────────────────────────────────────────────

type Mat3 = [number, number, number, number, number, number, number, number, number];
// Row-major: [r00, r01, r02,  r10, r11, r12,  r20, r21, r22]

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Rotation about Z axis by angle a. */
function rz(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Rotation about Y axis by angle a. */
function ry(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

/** Multiply two 3×3 matrices (row-major). */
function mulMM(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
    a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
    a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
    a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
    a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
    a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
    a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
  ];
}

/** Multiply 3×3 matrix by a column vector [vx, vy, vz]. */
function mulMV(m: Mat3, vx: number, vy: number, vz: number): [number, number, number] {
  return [
    m[0]*vx + m[1]*vy + m[2]*vz,
    m[3]*vx + m[4]*vy + m[5]*vz,
    m[6]*vx + m[7]*vy + m[8]*vz,
  ];
}

// ── FK ─────────────────────────────────────────────────────────────

export function fk(angles: number[]): { positions: Vec3[]; tcp: Vec3 } {
  let R: Mat3 = [...IDENTITY] as Mat3;
  let px = 0, py = 0, pz = 0;
  const positions: Vec3[] = [];

  for (let i = 0; i < 7; i++) {
    const joint = JOINTS[i];
    const oz = joint.offset[2];            // offset is always [0, 0, z]

    // Translate: p = p + R * [0, 0, oz]
    const [dx, dy, dz] = mulMV(R, 0, 0, oz);
    px += dx;
    py += dy;
    pz += dz;

    positions[i] = { x: px, y: py, z: pz };

    // Rotate R based on joint axis
    const a = angles[i];
    R = joint.axis === 'z' ? mulMM(R, rz(a)) : mulMM(R, ry(a));
  }

  // TCP offset: p = p + R * [0, 0, TCP_OFFSET[2]]
  const [tx, ty, tz] = mulMV(R, 0, 0, TCP_OFFSET[2]);
  px += tx;
  py += ty;
  pz += tz;

  const tcp: Vec3 = { x: px, y: py, z: pz };
  positions[7] = tcp;

  return { positions, tcp };
}
