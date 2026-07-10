'use client';

import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFRobot, URDFJoint } from 'urdf-loader';
import { useRobotStore } from '@/store/robot';
import { JOINTS } from '@/lib/robot/constants';
import { Keys } from './Keys';

// ── Hook: load URDF once, StrictMode-safe ──
function useURDFLoader(url: string): URDFRobot | null {
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const loader = new URDFLoader();
    loader.packages = '';

    loader.load(url, (loadedRobot) => {
      setRobot(loadedRobot);
    });

    return () => { loadingRef.current = false; };
  }, [url]);

  return robot;
}

// Hermite smoothstep: ease-in-ease-out, zero velocity at start/end
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// ── Component: URDF arm with smooth motion ──
export function Arm() {
  const robot = useURDFLoader('/arm.urdf');
  const robotContainerRef = useRef<Group>(null);

  // Motion state — kept in refs to avoid re-renders
  const motionStartRef = useRef<number[] | null>(null);  // joints at motion start
  const motionElapsedRef = useRef(0);
  const motionDurationRef = useRef(0);

  // Add robot to its own container
  useEffect(() => {
    if (!robot || !robotContainerRef.current) return;
    const container = robotContainerRef.current;
    container.add(robot);
    return () => { container.remove(robot); };
  }, [robot]);

  // ── Main animation loop ──
  useFrame((_, delta) => {
    if (!robot) return;

    const state = useRobotStore.getState();
    const { joints, motionQueue, isMoving } = state;

    if (isMoving && motionQueue.length > 0) {
      const target = motionQueue[0];

      // Initialize motion segment if this is a new target
      if (!motionStartRef.current) {
        motionStartRef.current = [...joints];
        motionElapsedRef.current = 0;

        // Duration = slowest joint (largest |delta| / velocity)
        let maxTime = 0;
        for (let i = 0; i < 7; i++) {
          const travel = Math.abs(target[i] - joints[i]);
          if (travel > 0.001) {
            maxTime = Math.max(maxTime, travel / JOINTS[i].vel);
          }
        }
        // Minimum duration to prevent instant snaps on tiny moves
        motionDurationRef.current = Math.max(maxTime, 0.20);
      }

      // Advance time
      motionElapsedRef.current += delta;
      const rawT = Math.min(motionElapsedRef.current / motionDurationRef.current, 1);
      const t = smoothstep(rawT);

      // Interpolate all joints along the smoothstep curve
      const start = motionStartRef.current;
      const next = new Array(7);
      for (let i = 0; i < 7; i++) {
        next[i] = start[i] + (target[i] - start[i]) * t;
      }

      state.setJoints(next);

      // Motion segment complete
      if (rawT >= 1) {
        motionStartRef.current = null;
        state.completeMotion();
      }
    }

    // Apply current joints to URDF visual
    const currentJoints = useRobotStore.getState().joints;
    JOINTS.forEach((jDef, i) => {
      const joint = robot.joints[jDef.name] as URDFJoint | undefined;
      if (joint) {
        joint.setJointValue(currentJoints[i]);
      }
    });
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={robotContainerRef} />
      <Keys />
    </group>
  );
}
