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
    if (loadingRef.current) return;  // guard StrictMode double-mount
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

// ── Component: URDF arm with live joint binding ──
export function Arm() {
  const robot = useURDFLoader('/arm.urdf');
  const groupRef = useRef<Group>(null);

  // Add robot to group imperatively (urdf-loader returns a raw Object3D)
  useEffect(() => {
    if (!robot || !groupRef.current) return;
    groupRef.current.clear();
    groupRef.current.add(robot);
  }, [robot]);

  // Drive joints from store at 60fps — NON-REACTIVE read via getState()
  useFrame(() => {
    if (!robot) return;
    const { joints } = useRobotStore.getState();

    JOINTS.forEach((jDef, i) => {
      const joint = robot.joints[jDef.name] as URDFJoint | undefined;
      if (joint) {
        joint.setJointValue(joints[i]);
      }
    });
  });

  if (!robot) return null;

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Robot is added imperatively via useEffect — <primitive> alternative */}
      {/* Keys are siblings inside the rotated group, so they inherit Z-up → Y-up */}
      <Keys />
    </group>
  );
}
