// PIN sequence orchestrator.
// Validates digits, executes one digit at a time, measures per-key accuracy,
// and drives the store's pinState through the full lifecycle.

import { KEYS } from '../robot/constants';
import { fk } from '../robot/fk';
import { solve } from '../ik/solve';
import { execute } from '../pipeline/executor';
import { useRobotStore } from '../../store/robot';
import type { PinDigitResult } from '../../store/robot';

const PASS_THRESHOLD_MM = 5;  // ±5mm per PRD

/**
 * Start an autonomous PIN entry sequence.
 * Returns immediately — the sequence runs asynchronously via store subscriptions.
 */
export function startPin(pin: string): void {
  const store = useRobotStore.getState();

  // Don't start if already running
  if (store.pinState?.active) return;

  // 1. Validate all digits upfront
  const digits = pin.split('');
  for (let i = 0; i < digits.length; i++) {
    if (!KEYS[digits[i]]) {
      store.setPinState({
        active: false,
        pin,
        currentDigitIndex: i,
        activeKeyId: null,
        results: [],
        phase: 'failed',
        failReason: `No key for digit "${digits[i]}" (position ${i + 1})`,
      });
      store.addLog({
        source: 'pin',
        kind: 'enterPin',
        result: 'REJECT',
        reason: `No key for digit "${digits[i]}"`,
        timestamp: Date.now(),
      });
      return;
    }
  }

  if (digits.length === 0) {
    store.setPinState({
      active: false, pin, currentDigitIndex: 0, activeKeyId: null,
      results: [], phase: 'failed', failReason: 'PIN is empty',
    });
    return;
  }

  // 2. Initialize pinState
  store.setPinState({
    active: true,
    pin,
    currentDigitIndex: 0,
    activeKeyId: digits[0],
    results: [],
    phase: 'running',
  });

  store.setMode('ik');

  // 3. Start the first digit
  executeDigit(digits, 0);
}

/**
 * Execute a single digit and wait for motion to complete before moving on.
 */
function executeDigit(digits: string[], index: number): void {
  const store = useRobotStore.getState();
  const digit = digits[index];
  const keyId = digit;
  const keyPos = KEYS[keyId];

  // Update active key
  store.updatePinState({ currentDigitIndex: index, activeKeyId: keyId });

  // Execute the touchKey command
  const report = execute({ kind: 'touchKey', keyId }, 'pin');

  if (!report.success) {
    // Gate rejected — halt the sequence
    store.updatePinState({
      active: false,
      phase: 'failed',
      failReason: `Digit "${digit}" (position ${index + 1}) rejected: ${report.details.find(d => d.startsWith('REJECT')) ?? 'unknown'}`,
      activeKeyId: null,
    });
    return;
  }

  // Measure accuracy from the IK solution.
  // The executor enqueued waypoints: prepare?, pre-approach?, approach, touch, dwell, retract.
  // The touch waypoint's IK solution is what determines accuracy.
  // We can compute it by solving IK for the touch position with the current seed.
  const currentJoints = store.motionQueue.length > 0
    ? store.motionQueue[store.motionQueue.length - 1]
    : store.joints;

  // Find the touch target's TCP from the queued joint solution.
  // The touch waypoint targets (key.x, key.y, TOUCH_Z=0.05) with keepVertical.
  // The executor already validated and enqueued the solution.
  // We compute FK of the joints that will be at the touch position.
  // The touch waypoint is the Nth-from-last in the queue (before dwell and retract).
  // More reliable: just solve IK directly for the measurement.
  const touchSolution = solve(keyPos, currentJoints, true);

  let result: PinDigitResult;
  if (touchSolution) {
    const tip = fk(touchSolution).tcp;
    const dx = tip.x - keyPos.x;
    const dy = tip.y - keyPos.y;
    const dz = tip.z - keyPos.z;
    const errorMm = Math.sqrt(dx * dx + dy * dy + dz * dz) * 1000;
    const pass = errorMm < PASS_THRESHOLD_MM;

    result = { digit, keyId, errorMm: Math.round(errorMm * 100) / 100, pass };
  } else {
    result = { digit, keyId, errorMm: 999, pass: false };
  }

  // Record result
  store.addPinResult(result);
  store.addLog({
    source: 'pin',
    kind: 'touchKey',
    result: result.pass ? 'ALLOW' : 'REJECT',
    reason: `Key ${keyId}: ${result.errorMm.toFixed(2)}mm ${result.pass ? 'PASS' : 'FAIL'}`,
    timestamp: Date.now(),
  });

  // Wait for motion queue to drain, then advance to next digit
  const unsub = useRobotStore.subscribe((state) => {
    if (!state.isMoving && state.motionQueue.length === 0) {
      unsub();

      const nextIndex = index + 1;
      if (nextIndex < digits.length) {
        // Next digit
        executeDigit(digits, nextIndex);
      } else {
        // All digits complete
        const finalState = useRobotStore.getState();
        const allResults = finalState.pinState?.results ?? [];
        const allPass = allResults.every((r) => r.pass);

        store.updatePinState({
          active: false,
          phase: allPass ? 'complete' : 'failed',
          activeKeyId: null,
          failReason: allPass ? undefined : 'One or more keys exceeded 5mm tolerance',
        });

        store.addLog({
          source: 'pin',
          kind: 'enterPin',
          result: allPass ? 'ALLOW' : 'REJECT',
          reason: `PIN "${digits.join('')}" complete: ${allResults.filter(r => r.pass).length}/${allResults.length} PASS`,
          timestamp: Date.now(),
        });

        store.setMode('idle');
      }
    }
  });
}

/**
 * Cancel a running PIN sequence.
 */
export function cancelPin(): void {
  const store = useRobotStore.getState();
  store.clearQueue();
  store.setPinState(null);
  store.setMode('idle');
}
