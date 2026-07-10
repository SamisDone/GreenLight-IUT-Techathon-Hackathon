'use client';

import type { ReactNode, CSSProperties } from 'react';

// Thin L-shaped bracket ticks at the 4 corners of a panel.
// Pure CSS — no extra DOM nodes.

const BRACKET_SIZE = 12;
const BRACKET_THICKNESS = 2;
const BRACKET_COLOR = 'var(--primary)';
const BRACKET_GAP = 4;

const cornerStyle = (
  top: boolean,
  left: boolean,
): CSSProperties => ({
  position: 'absolute',
  width: BRACKET_SIZE,
  height: BRACKET_SIZE,
  ...(top ? { top: BRACKET_GAP } : { bottom: BRACKET_GAP }),
  ...(left ? { left: BRACKET_GAP } : { right: BRACKET_GAP }),
  borderColor: BRACKET_COLOR,
  borderStyle: 'solid',
  borderWidth: 0,
  ...(top ? { borderTopWidth: BRACKET_THICKNESS } : { borderBottomWidth: BRACKET_THICKNESS }),
  ...(left ? { borderLeftWidth: BRACKET_THICKNESS } : { borderRightWidth: BRACKET_THICKNESS }),
  pointerEvents: 'none' as const,
});

export default function CornerBrackets({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      <div style={cornerStyle(true, true)} />
      <div style={cornerStyle(true, false)} />
      <div style={cornerStyle(false, true)} />
      <div style={cornerStyle(false, false)} />
    </div>
  );
}
