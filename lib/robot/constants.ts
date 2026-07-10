// All values from 6_dof_arm.urdf and key_config.json. Base frame, meters, radians.

export const JOINTS = [
  { name: 'joint_1',      axis: 'z', lower: -3.1416, upper: 3.1416, vel: 2.5, offset: [0, 0, 0.060] },
  { name: 'joint_2',      axis: 'y', lower: -2.0944, upper: 2.0944, vel: 2.5, offset: [0, 0, 0.250] },
  { name: 'joint_3',      axis: 'y', lower: -2.6180, upper: 2.6180, vel: 3.0, offset: [0, 0, 0.250] },
  { name: 'joint_4',      axis: 'z', lower: -3.1416, upper: 3.1416, vel: 3.5, offset: [0, 0, 0.250] },
  { name: 'joint_5',      axis: 'y', lower: -2.0944, upper: 2.0944, vel: 4.0, offset: [0, 0, 0.150] },
  { name: 'joint_6',      axis: 'z', lower: -3.1416, upper: 3.1416, vel: 4.5, offset: [0, 0, 0.250] },
  { name: 'stylus_pitch', axis: 'y', lower: -2.0944, upper: 2.0944, vel: 5.0, offset: [0, 0, 0.150] },
] as const;

export const TCP_OFFSET   = [0, 0, 0.137] as const;              // stylus_tip from stylus link
export const SHOULDER     = [0, 0, 0.310] as const;              // J2 pivot in base frame
export const PLANAR_LINKS = [0.250, 0.400, 0.400, 0.137] as const; // J2->J3, J3->J5, J5->J7, J7->tip
export const REACH_MAX    = 1.19;                                 // from shoulder, meters
export const TOLERANCE    = 0.005;                                // 5 mm success band
export const APPROACH_Z   = 0.12;                                 // hover height above a key
export const TOUCH_Z      = 0.05;                                 // key surface height

export const KEYS: Record<string, { x: number; y: number; z: number }> = {
  '1': { x: 0.500, y:  0.050, z: 0.050 },
  '2': { x: 0.550, y:  0.050, z: 0.050 },
  '3': { x: 0.600, y:  0.050, z: 0.050 },
  '4': { x: 0.500, y: -0.050, z: 0.050 },
  '5': { x: 0.550, y: -0.050, z: 0.050 },
  '6': { x: 0.600, y: -0.050, z: 0.050 },
};
