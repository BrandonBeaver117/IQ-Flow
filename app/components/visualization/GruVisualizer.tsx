"use client";

import { useMemo } from 'react';
import type { SimulationConfig } from '../../hooks/useSimulation';
import { clamp01, pulse, ease, ampOf } from './primitives';
import { Gate, Arrow, SignalNode } from './primitives';

export interface GruVisualizerProps {
  inputIQ: Array<[number, number]>;
  paOutput: Array<[number, number]>;
  config: SimulationConfig;
  clock: number;
}

/**
 * GRU data-flow visualization: ONE recurrent cell, laid out LEFT to RIGHT.
 * x(t) and h(t-1) enter from the left -> gates + candidate inside the cell
 * -> h(t) leaves right -> Output -> PA. A short carry path under the cell
 * shows h(t) feeding the next step. No inference is performed.
 */
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
  const rBase = clamp01(0.35 + 0.5 * amp * (0.5 + 0.5 * Math.sin(t)));
  const zBase = clamp01(0.3 + 0.5 * amp * (0.5 + 0.5 * Math.cos(t)));

  const xIn = pulse(phase, 0, 0.3);
  const gatesPhase = clamp01((phase - 0.3) / 0.4);
  const gatesWave = ease(gatesPhase);
  const hOut = pulse(phase, 0.7, 1);
  const gatesActive = phase >= 0.3 && phase <= 0.72;
  const rVal = rBase * gatesWave;
  const zVal = zBase * gatesWave;

  // Horizontal geometry: x(t) + h(t-1) pills on the left, cell center,
  // h(t) pill + output + PA marching right along CY.
  const xNodeX = 90;
  const hPrevX = 260;
  const cellX = 380;
  const cellW = 300;
  const cellH = 220;
  const cellY = CY - cellH / 2;
  const outX = cellX + cellW + 60;
  const outW = 150;
  const paX = outX + outW + 50;
  const paW = 140;

  return (
    <g>
      <text x={16} y={22} className='node-label' fill='#374151' fontSize={10}>
        {'one GRU cell - hidden state ' + hidden + ' - x(t) + h(t-1) flow right into the cell'}
      </text>

      {/* x(t) enters from the left */}
      <SignalNode x={xNodeX} y={CY - 40} label='x(t)' value={amp.toFixed(2)} active={xIn > 0.35} color='#3b82f6' w={110} />
      <Arrow x1={xNodeX + 60} y1={CY - 40} x2={cellX - 8} y2={CY - 40} active={xIn > 0.35} label='input' />

      {/* h(t-1) enters below it */}
      <SignalNode x={hPrevX} y={CY + 44} label='h(t-1)' value={hPrev.toFixed(2)} active={gatesActive} color='#7c3aed' w={110} />
      <Arrow x1={hPrevX + 60} y1={CY + 44} x2={cellX - 8} y2={CY + 44} active={gatesActive} color='#7c3aed' label='state in' />

      {/* GRU cell */}
      <g>
        <rect
          x={cellX}
          y={cellY}
          width={cellW}
          height={cellH}
          rx={12}
          fill={gatesActive ? '#fffbeb' : '#ffffff'}
          stroke={gatesActive ? '#f59e0b' : '#7c3aed'}
          strokeWidth={gatesActive ? 1.8 : 1.4}
        />
        <text x={cellX + cellW / 2} y={cellY + 20} textAnchor='middle' className='node-label' fill={gatesActive ? '#92400e' : '#111827'} fontSize={11}>
          GRU Cell
        </text>
        <Gate x={cellX + 84} y={cellY + 34} w={130} label='Reset' value={rVal} />
        <Gate x={cellX + 84} y={cellY + 62} w={130} label='Update' value={zVal} />
        <rect
          x={cellX + 84}
          y={cellY + 96}
          width={130}
          height={52}
          rx={8}
          fill={gatesActive ? '#fef3c7' : '#f5f3ff'}
          stroke={gatesActive ? '#f59e0b' : '#7c3aed'}
          strokeWidth={gatesActive ? 1.4 : 1}
        />
        <text x={cellX + 149} y={cellY + 118} textAnchor='middle' className='node-label' fill={gatesActive ? '#92400e' : '#5b21b6'} fontSize={9}>
          Candidate
        </text>
        <text x={cellX + 149} y={cellY + 134} textAnchor='middle' className='node-sublabel' fill={gatesActive ? '#92400e' : '#6b7280'} fontSize={9}>
          {'h~(t) ' + (0.5 + 0.3 * Math.sin(t)).toFixed(2)}
        </text>
        <Arrow x1={cellX + 149} y1={cellY + 150} x2={cellX + 149} y2={cellY + cellH - 10} active={gatesActive} />
        <text x={cellX + cellW / 2} y={cellY + cellH - 14} textAnchor='middle' className='node-sublabel' fill={gatesActive ? '#92400e' : '#6b7280'} fontSize={9}>
          {'h(t) ' + hCur.toFixed(2)}
        </text>
      </g>
      <text x={cellX + cellW / 2} y={cellY + cellH + 16} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
        same weights, same cell, every step
      </text>

      {/* Short carry path under the cell: h(t) feeds next step */}
      <path
        d={'M ' + (cellX + 40) + ' ' + (cellY + cellH + 4) + ' L ' + hPrevX + ' ' + (CY + 66)}
        fill='none'
        stroke='#7c3aed'
        strokeWidth={1.2}
        strokeDasharray='4 3'
        opacity={0.7}
      />
      <text x={(cellX + 40 + hPrevX) / 2} y={cellY + cellH + 34} textAnchor='middle' className='node-sublabel' fill='#7c3aed' fontSize={9}>
        carry h(t) to next step
      </text>

      {/* h(t) leaves right -> output -> PA */}
      <Arrow x1={cellX + cellW + 6} y1={CY} x2={outX - 60} y2={CY} active={hOut > 0.3} color='#7c3aed' />
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
