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

// Joint arrival threshold (rad)
const ARRIVAL_EPS = 0.001;

// ── Component: URDF arm with velocity-limited joint interpolation ──
export function Arm() {
  const robot = useURDFLoader('/arm.urdf');
  const robotContainerRef = useRef<Group>(null);

  // Add robot to its own container — NOT the parent group.
  // This avoids clear() destroying React children like <Keys />.
  useEffect(() => {
    if (!robot || !robotContainerRef.current) return;
    const container = robotContainerRef.current;
    container.add(robot);
    return () => { container.remove(robot); };
  }, [robot]);

  // ── Main animation loop: velocity-limited interpolation ──
  useFrame((_, delta) => {
    if (!robot) return;

    const state = useRobotStore.getState();
    const { joints, motionQueue, isMoving } = state;

    // If there's a target in the queue, interpolate toward it
    if (isMoving && motionQueue.length > 0) {
      const target = motionQueue[0];
      const next = [...joints];
      let allArrived = true;

      for (let i = 0; i < 7; i++) {
        const diff = target[i] - joints[i];
        if (Math.abs(diff) < ARRIVAL_EPS) {
          next[i] = target[i];
        } else {
          allArrived = false;
          const maxStep = JOINTS[i].vel * delta;
          next[i] = joints[i] + Math.sign(diff) * Math.min(maxStep, Math.abs(diff));
        }
      }

      state.setJoints(next);

      if (allArrived) {
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
      {/* Robot goes here imperatively — isolated from React children */}
      <group ref={robotContainerRef} />
      {/* Keys are React children — never destroyed by imperative adds */}
      <Keys />
    </group>
  );
}
