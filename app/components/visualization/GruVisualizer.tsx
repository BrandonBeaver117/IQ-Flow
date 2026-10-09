"use client";

import { useMemo } from 'react';
import type { SimulationConfig } from '../../hooks/useSimulation';
import { clamp01, pulse, ease, ampOf } from './primitives';
import { Arrow, SignalNode, Gate } from './primitives';

export interface GruVisualizerProps {
  inputIQ: Array<[number, number]>;
  paOutput: Array<[number, number]>;
  config: SimulationConfig;
  clock: number;
}

const CY = 320;

export function GruVisualizer({ inputIQ, paOutput, config, clock }: GruVisualizerProps) {
  const t = Math.floor(clock);
  const phase = clock - t;
  const hidden = Math.max(2, Math.min(16, config.hiddenSize));

  const cur = useMemo<[number, number]>(() => {
    return t < inputIQ.length ? inputIQ[t] : [0, 0];
  }, [inputIQ, t]);
  const paCur = t < paOutput.length ? paOutput[t] : [0, 0];

  const hiddenAt = (tt: number) => 0.5 + 0.4 * Math.sin(tt * 0.35);
  const hPrev = hiddenAt(t - 1);
  const hCur = hiddenAt(t);

  const amp = ampOf(cur);
  const xIn = pulse(phase, 0, 0.3);
  const hOut = pulse(phase, 0.7, 1);

  // Gate values: deterministic from the live IQ window (data flow only).
  const gatesPhase = clamp01((phase - 0.3) / 0.4);
  const gatesWave = ease(gatesPhase);
  const gatesActive = phase >= 0.3 && phase <= 0.72;
  const rVal = clamp01(0.35 + 0.5 * amp * (0.5 + 0.5 * Math.sin(t))) * gatesWave;
  const zVal = clamp01(0.3 + 0.5 * amp * (0.5 + 0.5 * Math.cos(t))) * gatesWave;

  // Horizontal geometry: cell centered, x(t) + h(t-1) on left,
  // h(t) -> output -> PA marching right along CY.
  const cellX = 320;
  const cellW = 320;
  const cellH = 220;
  const cellY = CY - cellH / 2;
  const outX = cellX + cellW + 60;
  const outW = 150;
  const paX = outX + outW + 50;
  const paW = 140;

  // Input node positions
  const xNodeX = 80;
  const hPrevX = 150;
  const xNodeY = cellY + cellH - 30;
  const hPrevY = cellY + 20;

  // Port positions on cell left edge
  const portR = 6;
  const xPortX = cellX;
  const xPortY = xNodeY;
  const hPortX = cellX;
  const hPortY = hPrevY;

  // Interior layout: Reset + Update stacked left, Candidate right.
  const boxW = 118;
  const boxH = 68;
  const resetX = cellX + 64;
  const resetY = cellY + 42;
  const updateX = cellX + 64;
  const updateY = cellY + 118;
  const resetMidY = resetY + boxH / 2;
  const updateMidY = updateY + boxH / 2;
  const candX = cellX + 198;
  const candY = cellY + 42;
  const candW = 104;
  const candH = boxH * 2 + 8;
  // Shared merge dot + trunk (H/V wiring only).
  const mergeX = cellX + 30;
  const mergeY = (resetMidY + updateMidY) / 2;
  const trunkX = cellX + 48;

  return (
    <g>
      <text x={16} y={22} className='node-label' fill='#374151' fontSize={10}>
        {'one GRU cell - hidden state ' + hidden + ' - x(t) + h(t-1) flow right into the cell'}
      </text>

      {/* x(t) enters on the left near the bottom (blue) */}
      <SignalNode x={xNodeX} y={xNodeY} label='x(t)' value={amp.toFixed(2)} active={xIn > 0.35} color='#3b82f6' w={120} />
      <Arrow x1={xNodeX + 60} y1={xNodeY} x2={xPortX - portR - 4} y2={xNodeY} active={xIn > 0.35} color='#3b82f6' />

      {/* h(t-1) enters on the left near the top (purple) */}
      <SignalNode x={hPrevX} y={hPrevY} label='h(t-1)' value={hPrev.toFixed(2)} active={xIn > 0.35 || phase > 0.1} color='#7c3aed' w={120} />
      <Arrow x1={hPrevX + 60} y1={hPrevY} x2={hPortX - portR - 4} y2={hPrevY} active={xIn > 0.35 || phase > 0.1} color='#7c3aed' />

      {/* GRU cell shell: one rounded rectangle with a faint background */}
      <g>
        <rect
          x={cellX}
          y={cellY}
          width={cellW}
          height={cellH}
          rx={14}
          fill='#faf8ff'
          stroke='#7c3aed'
          strokeWidth={1.6}
        />
        <text x={cellX + cellW / 2} y={cellY + 24} textAnchor='middle' className='node-label' fill='#5b21b6' fontSize={12}>
          GRU Cell
        </text>
        {/* Input ports on left edge: blue x(t) near bottom, purple h(t-1) near top */}
        <circle cx={xPortX} cy={xPortY} r={portR} fill='#eff6ff' stroke='#3b82f6' strokeWidth={1.5} />
        <circle cx={hPortX} cy={hPortY} r={portR} fill='#f5f3ff' stroke='#7c3aed' strokeWidth={1.5} />

        {/* Shared merge point: one dot where x(t) and h(t-1) combine (H/V wires only) */}
        <line x1={xPortX} y1={xPortY} x2={xPortX + 14} y2={xPortY} stroke='#3b82f6' strokeWidth={1.4} />
        <line x1={xPortX + 14} y1={xPortY} x2={xPortX + 14} y2={mergeY} stroke='#3b82f6' strokeWidth={1.4} />
        <line x1={hPortX} y1={hPortY} x2={hPortX + 14} y2={hPortY} stroke='#7c3aed' strokeWidth={1.4} />
        <line x1={hPortX + 14} y1={hPortY} x2={hPortX + 14} y2={mergeY} stroke='#7c3aed' strokeWidth={1.4} />
        <line x1={xPortX + 14} y1={mergeY} x2={mergeX} y2={mergeY} stroke='#6b7280' strokeWidth={1.4} />
        <line x1={hPortX + 14} y1={mergeY} x2={mergeX} y2={mergeY} stroke='#6b7280' strokeWidth={1.4} />
        <circle cx={mergeX} cy={mergeY} r={4} fill='#6b7280' />

        {/* Trunk from merge dot right, splitting up/down into Reset and Update */}
        <line x1={mergeX} y1={mergeY} x2={trunkX} y2={mergeY} stroke='#6b7280' strokeWidth={1.4} />
        <line x1={trunkX} y1={resetMidY} x2={trunkX} y2={updateMidY} stroke='#6b7280' strokeWidth={1.4} />
        <line x1={trunkX} y1={resetMidY} x2={resetX} y2={resetMidY} stroke='#6b7280' strokeWidth={1.4} />
        <line x1={trunkX} y1={updateMidY} x2={updateX} y2={updateMidY} stroke='#6b7280' strokeWidth={1.4} />
        {/* Candidate feed: straight horizontal wire from the trunk */}
        <line x1={trunkX} y1={mergeY} x2={candX} y2={mergeY} stroke='#6b7280' strokeWidth={1.4} />

        {/* Reset box (green) with value bar */}
        <rect x={resetX} y={resetY} width={boxW} height={boxH} rx={8} fill='#f0fdf4' stroke='#16a34a' strokeWidth={1.4} />
        <text x={resetX + boxW / 2} y={resetY + 16} textAnchor='middle' className='node-label' fill='#14532d' fontSize={11}>
          Reset
        </text>
        <text x={resetX + boxW / 2} y={resetY + 28} textAnchor='middle' className='node-sublabel' fill='#4d7c0f' fontSize={8}>
          what to ignore
        </text>
        <text x={resetX + boxW / 2} y={resetY + 38} textAnchor='middle' className='node-sublabel' fill='#4d7c0f' fontSize={8}>
          from the past
        </text>
        <Gate x={resetX + 10} y={resetY + 44} w={boxW - 44} label='' value={rVal} />

        {/* Update box (green) with value bar */}
        <rect x={updateX} y={updateY} width={boxW} height={boxH} rx={8} fill='#f0fdf4' stroke='#16a34a' strokeWidth={1.4} />
        <text x={updateX + boxW / 2} y={updateY + 16} textAnchor='middle' className='node-label' fill='#14532d' fontSize={11}>
          Update
        </text>
        <text x={updateX + boxW / 2} y={updateY + 28} textAnchor='middle' className='node-sublabel' fill='#4d7c0f' fontSize={8}>
          keep old
        </text>
        <text x={updateX + boxW / 2} y={updateY + 38} textAnchor='middle' className='node-sublabel' fill='#4d7c0f' fontSize={8}>
          vs take new
        </text>
        <Gate x={updateX + 10} y={updateY + 44} w={boxW - 44} label='' value={zVal} />

        {/* Candidate box (amber) */}
        <rect x={candX} y={candY} width={candW} height={candH} rx={8} fill='#fffbeb' stroke='#f59e0b' strokeWidth={1.4} />
        <text x={candX + candW / 2} y={candY + 22} textAnchor='middle' className='node-label' fill='#92400e' fontSize={11}>
          Candidate
        </text>
        <text x={candX + candW / 2} y={candY + 38} textAnchor='middle' className='node-sublabel' fill='#b45309' fontSize={8}>
          proposed
        </text>
        <text x={candX + candW / 2} y={candY + 50} textAnchor='middle' className='node-sublabel' fill='#b45309' fontSize={8}>
          new memory
        </text>
      </g>

      {/* h(t) leaves right */}
      <Arrow x1={cellX + cellW + 6} y1={CY} x2={outX - 60} y2={CY} active={hOut > 0.3} color='#7c3aed' />

      {/* Purple return line under the cell back to h(t-1) input (H/V only) */}
      <g>
        <line x1={cellX + cellW} y1={CY} x2={cellX + cellW + 30} y2={CY} stroke='#7c3aed' strokeWidth={3} opacity={0.8} />
        <line x1={cellX + cellW + 30} y1={CY} x2={cellX + cellW + 30} y2={cellY + cellH + 40} stroke='#7c3aed' strokeWidth={3} opacity={0.8} />
        <line x1={cellX + cellW + 30} y1={cellY + cellH + 40} x2={hPrevX + 55} y2={cellY + cellH + 40} stroke='#7c3aed' strokeWidth={3} opacity={0.8} />
        <line x1={hPrevX + 55} y1={cellY + cellH + 40} x2={hPrevX + 55} y2={hPortY} stroke='#7c3aed' strokeWidth={3} opacity={0.8} />
        <polygon
          points={`${hPrevX + 55},${hPortY - 5} ${hPrevX + 42},${hPortY + 3} ${hPrevX + 55},${hPortY + 12}`}
          fill='#7c3aed'
          opacity={0.8}
        />
      </g>
      <text x={(cellX + cellW + hPrevX) / 2} y={cellY + cellH + 34} textAnchor='middle' className='node-sublabel' fill='#7c3aed' fontSize={9}>
        carry to next step
      </text>

      {/* Same weights note */}
      <text x={cellX + cellW / 2} y={cellY + cellH + 16} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
        same weights, same cell, every step
      </text>

      {/* h(t) leaves right -> output -> PA */}
      <SignalNode x={outX - 4} y={CY} label='h(t)' value={hCur.toFixed(2)} active={hOut > 0.35} color='#7c3aed' w={104} />
      <Arrow x1={outX + 52} y1={CY} x2={outX + outW - 118} y2={CY} active={hOut > 0.4} label='output' />
      <g>
        <rect
          x={outX + outW - 110}
          y={CY - 46}
          width={110}
          height={92}
          rx={10}
          fill={hOut > 0.4 ? '#fffbeb' : '#ffffff'}
          stroke={hOut > 0.4 ? '#f59e0b' : '#dc2626'}
          strokeWidth={hOut > 0.4 ? 1.6 : 1.2}
        />
        <text x={outX + outW - 55} y={CY - 26} textAnchor='middle' className='node-label' fill={hOut > 0.4 ? '#92400e' : '#111827'} fontSize={10}>
          Output
        </text>
        <text x={outX + outW - 55} y={CY - 6} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'I: ' + cur[0].toFixed(2)}
        </text>
        <text x={outX + outW - 55} y={CY + 14} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'Q: ' + cur[1].toFixed(2)}
        </text>
      </g>
      <Arrow x1={outX + outW + 4} y1={CY} x2={paX - 8} y2={CY} active={hOut > 0.4} label='to PA' />
      <g>
        <rect
          x={paX}
          y={CY - 46}
          width={paW}
          height={92}
          rx={10}
          fill='#fef2f2'
          stroke='#dc2626'
          strokeWidth={1.2}
        />
        <text x={paX + paW / 2} y={CY - 26} textAnchor='middle' className='node-label' fill='#7f1d1d' fontSize={10}>
          Nonlinear PA
        </text>
        <text x={paX + paW / 2} y={CY - 6} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'I: ' + paCur[0].toFixed(2)}
        </text>
        <text x={paX + paW / 2} y={CY + 14} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'Q: ' + paCur[1].toFixed(2)}
        </text>
      </g>
    </g>
  );
}
