import { KEYS, APPROACH_Z, TOUCH_Z } from '../robot/constants';
import { fk } from '../robot/fk';
import type { MotionCommand, PoseWaypoint, Vec3 } from './types';

export function plan(cmd: MotionCommand, currentJoints: number[]): PoseWaypoint[] {
  switch (cmd.kind) {
    case 'home':
      return [{ kind: 'joint', joints: [0, 0, 0, 0, 0, 0, 0], label: 'home' }];

    case 'moveTo':
      return [{
        kind: 'cartesian',
        target: cmd.target,
        keepVertical: cmd.keepVertical ?? false,
        label: `moveTo (${cmd.target.x}, ${cmd.target.y}, ${cmd.target.z})`,
      }];

    case 'touchKey': {
      const key = KEYS[cmd.keyId];
      if (!key) return [];
      return [
        { kind: 'cartesian', target: { x: key.x, y: key.y, z: APPROACH_Z }, keepVertical: true, label: `approach key-${cmd.keyId}` },
        { kind: 'cartesian', target: { x: key.x, y: key.y, z: TOUCH_Z },   keepVertical: true, label: `touch key-${cmd.keyId}` },
        { kind: 'cartesian', target: { x: key.x, y: key.y, z: APPROACH_Z }, keepVertical: true, label: `retract key-${cmd.keyId}` },
      ];
    }

    case 'enterPin':
      return cmd.pin
        .split('')
        .flatMap((digit) => plan({ kind: 'touchKey', keyId: digit }, currentJoints));

    case 'jog': {
      const tcp: Vec3 = { ...fk(currentJoints).tcp };
      tcp[cmd.axis] += cmd.delta;
      return [{
        kind: 'cartesian',
        target: tcp,
        keepVertical: false,
        label: `jog ${cmd.axis} ${cmd.delta > 0 ? '+' : ''}${cmd.delta}`,
      }];
    }

    case 'rotateJoint': {
      const newJoints = [...currentJoints];
      newJoints[cmd.joint] += cmd.deltaDeg * Math.PI / 180;
      return [{ kind: 'joint', joints: newJoints, label: `rotate joint ${cmd.joint} by ${cmd.deltaDeg}°` }];
    }
  }
}
