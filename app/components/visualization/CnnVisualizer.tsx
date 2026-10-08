"use client";

import { useMemo } from 'react';
import type { SimulationConfig } from '../../hooks/useSimulation';
import { clamp01, ampOf } from './primitives';
import { Kernel, ConnectionBundle, Arrow, SignalNode } from './primitives';

export interface CnnVisualizerProps {
  inputIQ: Array<[number, number]>;
  paOutput: Array<[number, number]>;
  config: SimulationConfig;
  clock: number;
}

const MAX_DISPLAY_SAMPLES = 10;
const CY = 320;

export function CnnVisualizer({ inputIQ, paOutput, config, clock }: CnnVisualizerProps) {
  const t = Math.floor(clock);
  const phase = clock - t;
  const M = Math.max(1, Math.min(20, config.memoryDepth));
  const kSize = Math.max(1, Math.min(7, config.kernelSize));
  const dilation = Math.max(1, Math.min(4, config.dilation));

  const win = useMemo(() => {
    const startIdx = Math.max(0, t - M + 1);
    return inputIQ.slice(startIdx, t + 1);
  }, [inputIQ, t, M]);

  const winLen = Math.min(MAX_DISPLAY_SAMPLES, win.length);
  const display = win.slice(win.length - winLen);

  const effK = Math.max(1, Math.min(kSize, Math.floor((winLen - 1) / dilation) + 1));
  const numPositions = Math.max(1, winLen - (effK - 1) * dilation);
  const kernelPos = Math.min(numPositions - 1, Math.floor(phase * numPositions));
  const taps = Array.from({ length: effK }, (_, i) => kernelPos + i * dilation);
  const tapSet = new Set(taps);
  const weights = Array.from({ length: effK }, (_, i) => 0.5 + 0.45 * Math.sin(i + 1));
  const ghostPositions = [0, numPositions - 1].filter((p) => p !== kernelPos);

  // Compute convolution values for each position and channel
  const convValues = useMemo(() => {
    const vals: Array<{ I: number; Q: number }> = [];
    for (let pos = 0; pos < numPositions; pos++) {
      let sumI = 0, sumQ = 0;
      for (let k = 0; k < effK; k++) {
        const idx = pos + k * dilation;
        if (idx < display.length) {
          const w = weights[k];
          sumI += display[idx][0] * w;
          sumQ += display[idx][1] * w;
        }
      }
      vals.push({ I: sumI, Q: sumQ });
    }
    return vals;
  }, [display, effK, dilation, weights, numPositions]);

  // Horizontal geometry: sequence strips on the left, feature maps mid,
  // output + PA boxes on the right, all along CY.
  const seqX0 = 30;
  const sampleW = 72;
  const seqW = Math.max(1, winLen) * sampleW;
  const sampleX = (i: number) => seqX0 + i * sampleW;
  const iRowY = CY - 66;
  const qRowY = CY + 10;
  const kernelY = CY - 128;
  const cellW = sampleW - 10;

  const fmX = seqX0 + seqW + 60;
  const fmW = 150;
  const fmCols = Math.min(6, numPositions);
  const fmActive = kernelPos < fmCols ? kernelPos : -1;
  const outActive = phase > 0.86;

  const outX = fmX + fmW + 50;
  const outW = 150;
  const paX = outX + outW + 50;
  const paW = 140;

  const cur = win.length > 0 ? win[win.length - 1] : [0, 0];
  const paCur = t < paOutput.length ? paOutput[t] : [0, 0];
  const receptiveField = 1 + (effK - 1) * dilation;

  const sampleRect = (i: number, y: number, ch: 'I' | 'Q') => {
    const s = display[i];
    const v = ch === 'I' ? s[0] : s[1];
    const amp = clamp01(Math.abs(v));
    const under = tapSet.has(i);
    return (
      <g key={ch + i}>
        <rect
          x={sampleX(i) + 3}
          y={y}
          width={sampleW - 6}
          height={30}
          rx={5}
          fill={under ? '#fef3c7' : '#dbeafe'}
          stroke={under ? '#f59e0b' : '#3b82f6'}
          strokeWidth={under ? 1.4 : 0.9}
          opacity={under ? 1 : 0.55 + amp * 0.45}
        />
        <text x={sampleX(i) + sampleW / 2} y={y + 20} textAnchor='middle' className='node-label' fill={under ? '#92400e' : '#1e3a8a'} fontSize={9}>
          {v.toFixed(2)}
        </text>
      </g>
    );
  };

  const fmCol = (j: number, y: number, ch: 'I' | 'Q') => {
    const cw = (fmW - 8) / fmCols;
    const x = fmX + 4 + j * cw;
    const isActive = j === fmActive;
    const done = j < kernelPos;
    const val = convValues[j] || { I: 0, Q: 0 };
    const v = ch === 'I' ? val.I : val.Q;
    const absV = clamp01(Math.abs(v));
    return (
      <g key={ch + j}>
        <rect
          x={x + 2}
          y={y}
          width={Math.max(10, cw - 4)}
          height={30}
          rx={5}
          fill={isActive ? '#f59e0b' : done ? '#bbf7d0' : '#f3f4f6'}
          stroke={isActive ? '#f59e0b' : done ? '#16a34a' : '#d1d5db'}
          strokeWidth={isActive ? 1.6 : 0.9}
          opacity={isActive ? 0.95 : done ? 0.5 + absV * 0.4 : 0.6}
        />
        <text x={x + cw / 2} y={y + 12} textAnchor='middle' className='node-label' fill={isActive ? '#92400e' : '#111827'} fontSize={9}>
          {v.toFixed(2)}
        </text>
        <text x={x + cw / 2} y={y + 25} textAnchor='middle' className='node-sublabel' fill={isActive ? '#92400e' : '#6b7280'} fontSize={7}>
          {'f' + (j + 1)}
        </text>
      </g>
    );
  };

  return (
    <g>
      <text x={16} y={22} className='node-label' fill='#374151' fontSize={10}>
        {'shared kernel (' + effK + ' taps, dilation ' + dilation + ') slides right across the sequence'}
      </text>
      <text x={1184} y={22} textAnchor='end' className='node-sublabel' fill='#6b7280' fontSize={9}>
        {'receptive field: ' + receptiveField + ' samples'}
      </text>
      <text x={1184} y={34} textAnchor='end' className='node-sublabel' fill='#6b7280' fontSize={9}>
        {'params approx ' + effK + ' x 2 channels = ' + effK * 2}
      </text>

      <g opacity={0.3}>
        {ghostPositions.map((p) => (
          <Kernel
            key={'ghost' + p}
            xs={Array.from({ length: effK }, (_, i) => sampleX(p + i * dilation) + 3)}
            y={kernelY}
            weights={weights}
            cellW={cellW}
          />
        ))}
      </g>

      <Kernel
        xs={taps.map((tp) => sampleX(tp) + 3)}
        y={kernelY}
        weights={weights}
        active
        cellW={cellW}
      />
      <text x={seqX0} y={kernelY - 8} className='node-label' fill='#374151' fontSize={10}>
        KERNEL (shared weights)
      </text>

      <g>
        {display.map((_, i) => sampleRect(i, iRowY, 'I'))}
        {display.map((_, i) => sampleRect(i, qRowY, 'Q'))}
        <text x={seqX0 - 8} y={iRowY + 20} textAnchor='end' className='node-label' fill='#374151' fontSize={10}>
          I
        </text>
        <text x={seqX0 - 8} y={qRowY + 20} textAnchor='end' className='node-label' fill='#374151' fontSize={10}>
          Q
        </text>
        <text x={seqX0 + seqW / 2} y={qRowY + 48} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
          IQ time sequence (kernel moves right)
        </text>
      </g>

      <Arrow x1={seqX0 + seqW + 6} y1={CY} x2={fmX - 8} y2={CY} label='convolution' />
      <g>
        <rect
          x={fmX}
          y={CY - 76}
          width={fmW}
          height={152}
          rx={10}
          fill='#ffffff'
          stroke='#16a34a'
          strokeWidth={1.2}
        />
        <text x={fmX + fmW / 2} y={CY - 58} textAnchor='middle' className='node-label' fill='#111827' fontSize={10}>
          Feature Maps
        </text>
        {Array.from({ length: fmCols }, (_, j) => fmCol(j, iRowY - 34, 'I'))}
        {Array.from({ length: fmCols }, (_, j) => fmCol(j, qRowY - 34, 'Q'))}
      </g>

      <Arrow x1={fmX + fmW + 4} y1={CY} x2={outX - 8} y2={CY} active={outActive} label='output' />
      <g>
        <rect
          x={outX}
          y={CY - 46}
          width={outW}
          height={92}
          rx={10}
          fill={outActive ? '#fffbeb' : '#ffffff'}
          stroke={outActive ? '#f59e0b' : '#dc2626'}
          strokeWidth={outActive ? 1.6 : 1.2}
        />
        <text x={outX + outW / 2} y={CY - 26} textAnchor='middle' className='node-label' fill={outActive ? '#92400e' : '#111827'} fontSize={10}>
          Output
        </text>
        <text x={outX + outW / 2} y={CY - 6} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'I: ' + cur[0].toFixed(2)}
        </text>
        <text x={outX + outW / 2} y={CY + 14} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'Q: ' + cur[1].toFixed(2)}
        </text>
      </g>
      <Arrow x1={outX + outW + 4} y1={CY} x2={paX - 8} y2={CY} active={outActive} label='to PA' />
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