import { plan } from './planner';
import { validate } from '../safety/gate';
import { useRobotStore } from '../../store/robot';
import type { MotionCommand, ExecReport } from './types';
import type { LogEntry } from '../../store/robot';

export function execute(cmd: MotionCommand, source: string = 'keyboard'): ExecReport {
  const { joints, setJoints, addLog } = useRobotStore.getState();
  const waypoints = plan(cmd, joints);

  const report: ExecReport = {
    success: true,
    commandsExecuted: 0,
    commandsRejected: 0,
    details: [],
  };

  for (const wp of waypoints) {
    const result = validate(wp, joints);

    if (result.ok) {
      setJoints(result.jointSolution);
      report.commandsExecuted++;
      addLog({ source, kind: cmd.kind, result: 'ALLOW', timestamp: Date.now() });
      report.details.push(`ALLOW: ${wp.label ?? 'waypoint'}`);
    } else {
      report.commandsRejected++;
      report.success = false;
      addLog({ source, kind: cmd.kind, result: 'REJECT', reason: result.reason, timestamp: Date.now() });
      report.details.push(`REJECT: ${wp.label ?? 'waypoint'} — ${result.reason}`);
      break;
    }
  }

  return report;
}
