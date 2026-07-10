import { plan } from './planner';
import { validate } from '../safety/gate';
import { useRobotStore } from '../../store/robot';
import type { MotionCommand, ExecReport } from './types';

export function execute(cmd: MotionCommand, source: string = 'keyboard'): ExecReport {
  const state = useRobotStore.getState();
  const { enqueueMotion, addLog } = state;

  // Jogs are immediate — clear any queued motion and plan from the
  // current (mid-interpolation) joints so the joystick feels responsive.
  if (cmd.kind === 'jog') {
    state.clearQueue();
  }

  // For jog: plan from current joints (just cleared the queue).
  // For everything else: plan from the last queued target if mid-motion.
  const joints = (cmd.kind === 'jog' || state.motionQueue.length === 0)
    ? state.joints
    : state.motionQueue[state.motionQueue.length - 1];

  const waypoints = plan(cmd, joints);

  const report: ExecReport = {
    success: true,
    commandsExecuted: 0,
    commandsRejected: 0,
    details: [],
  };

  // Validate ALL waypoints first, chaining seeds so each IK warm-starts
  // from the previous solution (not the stale initial joints).
  const solutions: number[][] = [];
  let seed = joints;

  for (const wp of waypoints) {
    const result = validate(wp, seed);

    if (result.ok) {
      solutions.push(result.jointSolution);
      seed = result.jointSolution;       // next IK warm-starts from this
      report.commandsExecuted++;
      addLog({ source, kind: cmd.kind, result: 'ALLOW', timestamp: Date.now() });
      report.details.push(`ALLOW: ${wp.label ?? 'waypoint'}`);
    } else {
      report.commandsRejected++;
      report.success = false;
      addLog({ source, kind: cmd.kind, result: 'REJECT', reason: result.reason, timestamp: Date.now() });
      report.details.push(`REJECT: ${wp.label ?? 'waypoint'} — ${result.reason}`);
      break;                             // stop on first rejection
    }
  }

  // Enqueue all validated solutions — Arm.tsx useFrame will play them in order
  for (const sol of solutions) {
    enqueueMotion(sol);
  }

  return report;
}
