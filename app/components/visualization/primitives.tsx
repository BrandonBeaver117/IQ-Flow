/**
 * Reusable SVG primitives for the architecture visualizers.
 *
 * These are pure presentation components: they render boxes, neurons,
 * connections, arrows, gates and kernels from simple state values
 * (activation 0..1, booleans, positions). All animation logic lives in
 * the three architecture visualizers; these just draw the state.
 */

import type { ReactNode } from 'react';

export interface Point {
  x: number;
  y: number;
}

/** Clamp a value to 0..1. */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Smooth ease-in-out curve. */
export function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Activation pulse within a phase window [start, end].
 * Returns 0 outside the window, easing 0 -> 1 inside it.
 */
export function pulse(phase: number, start: number, end: number): number {
  if (phase <= start || phase >= end) return 0;
  return ease((phase - start) / (end - start));
}

/** Amplitude (magnitude) of an IQ sample [i, q]. */
export function ampOf(sample: [number, number]): number {
  return Math.sqrt(sample[0] * sample[0] + sample[1] * sample[1]);
}

/** A neuron dot; brightness reflects activation (0..1). */
export function Neuron({ x, y, r = 5, activation = 0, active = false }: {
  x: number;
  y: number;
  r?: number;
  activation?: number;
  active?: boolean;
}) {
  const fill = active ? '#f59e0b' : '#3b82f6';
  const opacity = active ? 0.95 : 0.25 + clamp01(activation) * 0.6;
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill={fill}
      opacity={opacity}
      stroke={active ? '#fcd34d' : '#60a5fa'}
      strokeWidth={active ? 1.2 : 0.5}
    />
  );
}

/**
 * A titled layer box containing a grid of neurons.
 * activations is rows x cols of 0..1 values; omit for a plain empty grid.
 */
export function LayerBox({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  cols = 5,
  rows = 3,
  activations,
  active = false,
  accent = '#3b82f6',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  cols?: number;
  rows?: number;
  activations?: number[][];
  active?: boolean;
  accent?: string;
}) {
  const padX = 16;
  const topPad = 26;
  const botPad = 12;
  const innerW = w - padX * 2;
  const innerH = h - topPad - botPad;
  const neurons: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = x + padX + (cols === 1 ? innerW / 2 : (c / (cols - 1)) * innerW);
      const ny = y + topPad + (rows === 1 ? innerH / 2 : (r / (rows - 1)) * innerH);
      const a = activations && activations[r] && activations[r][c] !== undefined ? activations[r][c] : 0;
      neurons.push(
        <Neuron key={'n' + r + '-' + c} x={nx} y={ny} activation={a} active={active && a > 0.55} />,
      );
    }
  }
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={active ? '#fffbeb' : '#ffffff'}
        stroke={active ? '#f59e0b' : accent}
        strokeWidth={active ? 1.6 : 1.2}
      />
      <text x={x + w / 2} y={y + 16} textAnchor='middle' className='node-label' fill={active ? '#92400e' : '#111827'} fontSize={10}>
        {title}
      </text>
      {subtitle !== undefined && (
        <text x={x + w / 2} y={y + h - 3} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={8}>
          {subtitle}
        </text>
      )}
      {neurons}
    </g>
  );
}

/**
 * Representative connection bundle between two point sets.
 * Draws at most maxLines evenly-sampled edges so diagrams stay readable.
 */
export function ConnectionBundle({
  from,
  to,
  active = false,
  maxLines = 10,
  color = '#93c5fd',
  activeColor = '#f59e0b',
}: {
  from: Point[];
  to: Point[];
  active?: boolean;
  maxLines?: number;
  color?: string;
  activeColor?: string;
}) {
  if (from.length === 0 || to.length === 0) return null;
  const n = Math.min(maxLines, from.length, to.length);
  const lines: ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const fi = Math.floor((k / n) * from.length);
    const ti = Math.floor((k / n) * to.length);
    lines.push(
      <line
        key={k}
        x1={from[fi].x}
        y1={from[fi].y}
        x2={to[ti].x}
        y2={to[ti].y}
        stroke={active ? activeColor : color}
        strokeWidth={active ? 1.6 : 0.7}
        opacity={active ? 0.9 : 0.35}
        strokeDasharray={active ? undefined : '3 2'}
      />,
    );
  }
  return <g>{lines}</g>;
}

/**
 * Dense all-to-all connection bundle for fully-connected layers.
 * Draws every from-point to every to-point.
 */
export function DenseConnectionBundle({
  from,
  to,
  active = false,
  color = '#60a5fa',
  activeColor = '#f59e0b',
}: {
  from: Point[];
  to: Point[];
  active?: boolean;
  color?: string;
  activeColor?: string;
}) {
  if (from.length === 0 || to.length === 0) return null;
  const lines: ReactNode[] = [];
  for (let fi = 0; fi < from.length; fi++) {
    for (let ti = 0; ti < to.length; ti++) {
      lines.push(
        <line
          key={`${fi}-${ti}`}
          x1={from[fi].x}
          y1={from[fi].y}
          x2={to[ti].x}
          y2={to[ti].y}
          stroke={active ? activeColor : color}
          strokeWidth={active ? 1.2 : 0.6}
          opacity={active ? 0.75 : 0.5}
        />,
      );
    }
  }
  return <g>{lines}</g>;
}

/** A directed flow arrow with an arrowhead and optional label. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  active = false,
  color = '#528bda',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  active?: boolean;
  color?: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 8;
  const px = -uy;
  const py = ux;
  const backX = x2 - head * ux;
  const backY = y2 - head * uy;
  const stroke = active ? '#f59e0b' : color;
  const mx = x1 + (backX - x1) * 0.5;
  const my = y1 + (backY - y1) * 0.5;
  return (
    <g>
      <line x1={x1} y1={y1} x2={backX} y2={backY} stroke={stroke} strokeWidth={active ? 2 : 1.4} strokeDasharray={active ? undefined : '4 3'} />
      <polygon
        points={[x2, y2, backX + head * 0.55 * px, backY + head * 0.55 * py, backX - head * 0.55 * px, backY - head * 0.55 * py].join(' ')}
        fill={stroke}
      />
      {label !== undefined && (
        <text x={mx + (label.length > 3 ? -6 : -14)} y={my - 5} textAnchor='middle' className='node-sublabel' fill={active ? '#92400e' : '#6b7280'} fontSize={9}>
          {label}
        </text>
      )}
    </g>
  );
}

/** A pill-shaped signal node, e.g. x(t) or h(t). */
export function SignalNode({
  x,
  y,
  label,
  value,
  active = false,
  color = '#3b82f6',
  w = 100,
}: {
  x: number;
  y: number;
  label: string;
  value?: string;
  active?: boolean;
  color?: string;
  w?: number;
}) {
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 15}
        width={w}
        height={30}
        rx={15}
        fill={active ? '#fef3c7' : '#eff6ff'}
        stroke={active ? '#f59e0b' : color}
        strokeWidth={active ? 1.6 : 1.1}
      />
      <text x={x} y={y + 4} textAnchor='middle' className='node-label' fill={active ? '#92400e' : '#1e3a8a'} fontSize={10}>
        {label}{value !== undefined ? '  ' + value : ''}
      </text>
    </g>
  );
}

/** A horizontal 0..1 gate bar with a label and numeric value. */
export function Gate({
  x,
  y,
  w = 130,
  label,
  value,
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  value: number;
}) {
  const v = clamp01(value);
  return (
    <g>
      <rect x={x} y={y} width={w} height={16} rx={8} fill='#e5e7eb' stroke='#9ca3af' strokeWidth={0.75} />
      <rect x={x} y={y} width={Math.max(2, w * v)} height={16} rx={8} fill={v > 0.5 ? '#f59e0b' : '#60a5fa'} opacity={0.85} />
      <text x={x - 8} y={y + 12} textAnchor='end' className='node-label' fill='#374151' fontSize={9}>
        {label}
      </text>
      <text x={x + w + 8} y={y + 12} textAnchor='start' className='node-sublabel' fill='#6b7280' fontSize={9}>
        {v.toFixed(2)}
      </text>
    </g>
  );
}

/**
 * A convolution kernel drawn as weight cells at explicit x positions
 * (each aligned over the IQ sample its tap covers). weights has one entry
 * per tap; cells highlight when active.
 */
export function Kernel({
  xs,
  y,
  weights,
  active = false,
  cellW = 40,
  cellH = 30,
}: {
  xs: number[];
  y: number;
  weights: number[];
  active?: boolean;
  cellW?: number;
  cellH?: number;
}) {
  const cells: ReactNode[] = [];
  for (let i = 0; i < xs.length; i++) {
    const cx = xs[i];
    cells.push(
      <g key={i}>
        <rect
          x={cx}
          y={y}
          width={cellW}
          height={cellH}
          rx={5}
          fill={active ? '#fef3c7' : '#dbeafe'}
          stroke={active ? '#f59e0b' : '#3b82f6'}
          strokeWidth={active ? 1.4 : 1}
        />
        <text x={cx + cellW / 2} y={y + cellH / 2 + 3} textAnchor='middle' className='node-label' fill={active ? '#92400e' : '#1e3a8a'} fontSize={9}>
          {(weights[i] !== undefined ? weights[i] : 0.5).toFixed(1)}
        </text>
      </g>,
    );
  }
  return <g>{cells}</g>;
}
