"use client";

import { useMemo } from 'react';
import type { SimulationConfig } from '../../hooks/useSimulation';
import { clamp01, ease, ampOf, type Point } from './primitives';
import { LayerBox, ConnectionBundle, DenseConnectionBundle, Arrow, SignalNode } from './primitives';

export interface MlpVisualizerProps {
  inputIQ: Array<[number, number]>;
  paOutput: Array<[number, number]>;
  config: SimulationConfig;
  clock: number;
}

const MAX_DISPLAY_SAMPLES = 20;
const S1 = 0.34;
const S2 = 0.67;
const CY = 320;

export function MlpVisualizer({ inputIQ, paOutput, config, clock }: MlpVisualizerProps) {
  const t = Math.floor(clock);
  const phase = clock - t;
  const M = Math.max(1, Math.min(20, config.memoryDepth));
  const layers = Math.max(1, Math.min(4, config.hiddenLayers));
  const hidden = Math.max(2, Math.min(12, config.hiddenSize));

  const win = useMemo(() => {
    const startIdx = Math.max(0, t - M + 1);
    return inputIQ.slice(startIdx, t + 1);
  }, [inputIQ, t, M]);

  const winLen = Math.min(MAX_DISPLAY_SAMPLES, win.length);
  const display = win.slice(win.length - winLen);

  const stage = phase < S1 ? 0 : phase < S2 ? 1 : 2;
  const stageStart = stage === 0 ? 0 : stage === 1 ? S1 : S2;
  const stageLen = stage === 0 ? S1 : stage === 1 ? S2 - S1 : 1 - S2;
  const wave = ease(clamp01((phase - stageStart) / stageLen));

  const amps = display.map(ampOf);
  const baseCols = (cols: number): number[] => {
    const out: number[] = [];
    for (let c = 0; c < cols; c++) {
      const si = Math.floor((c / Math.max(1, cols - 1)) * Math.max(0, amps.length - 1));
      out.push(clamp01(amps[si] || 0));
    }
    return out;
  };
  const baseAct = Array.from({ length: hidden }, (_, i) => clamp01(amps[Math.min(i, amps.length - 1)] || 0));
  const actMatrix = (base: number[], colOffset: number): number[][] => {
    const rows: number[][] = [];
    for (let r = 0; r < hidden; r++) {
      const shift = (r / hidden) * 0.55 + colOffset;
      const w = clamp01((wave - shift) * 2.4);
      rows.push([base[r] * (0.35 + 0.65 * w)]);
    }
    return rows;
  };
  const actH1 = actMatrix(baseAct, 0);
  const actH2 = actMatrix(baseAct, 0.15);

  // Horizontal geometry: everything flows left -> right along CY.
  const twoLayers = layers >= 2;
  const h1x = twoLayers ? 220 : 320;
  const boxW = 160;
  const boxH = 210;
  const boxY = CY - boxH / 2;
  const h2x = 500;
  const midRight = twoLayers ? h2x + boxW : h1x + boxW;
  const outX = midRight + 80;
  const outW = 160;
  const paX = outX + outW + 80;
  const paW = 150;

  const cur = win.length > 0 ? win[win.length - 1] : [0, 0];
  const paCur = t < paOutput.length ? paOutput[t] : [0, 0];

  // Memory window: vertical stack of sample nodes on the left edge.
  const nodeStep = 36;
  const stackH = Math.max(1, winLen) * nodeStep - 6;
  const stackY0 = CY - stackH / 2;
  const nodeCX = 80;
  const nodeW = 110;
  const nodeRight = nodeCX + nodeW / 2;
  const winPoints: Point[] = display.map((_, i) => ({
    x: nodeRight,
    y: stackY0 + i * nodeStep + 15,
  }));
  const edgePoints = (x: number, n: number): Point[] =>
    Array.from({ length: n }, (_, k) => ({
      x,
      y: boxY + 24 + ((k + 0.5) / n) * (boxH - 48),
    }));

  const stageActive = (s: number) => stage === s;

  return (
    <g>
      {/* Memory window stack (left edge) */}
      <g>
        {display.map((s, i) => {
          const isCur = i === display.length - 1;
          return (
            <SignalNode
              key={i}
              x={nodeCX}
              y={stackY0 + i * nodeStep + 15}
              label={'x(t-' + (display.length - 1 - i) + ')'}
              value={ampOf(s).toFixed(2)}
              active={isCur || (stageActive(0) && phase > 0.15)}
              color='#3b82f6'
              w={nodeW}
            />
          );
        })}
        <text x={nodeCX} y={stackY0 + winLen * nodeStep + 2} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
          window
        </text>
      </g>

      {/* Window -> Hidden Layer 1 (horizontal fan) - show all dense connections */}
      <DenseConnectionBundle
        from={winPoints}
        to={edgePoints(h1x, hidden)}
        active={stageActive(0)}
        color='#60a5fa'
        activeColor='#f59e0b'
      />
      <Arrow x1={nodeRight + 6} y1={CY} x2={h1x - 8} y2={CY} active={stageActive(0)} label='dense' />

      {/* Hidden Layer 1 - single vertical column of neurons */}
      <LayerBox
        x={h1x}
        y={boxY}
        w={boxW}
        h={boxH}
        title='Hidden Layer 1'
        subtitle={hidden + ' neurons'}
        cols={1}
        rows={hidden}
        activations={actH1.map((row) => [row[0]])}
        active={stageActive(0) || stageActive(1)}
      />
      <text x={h1x + boxW / 2} y={boxY + boxH + 8} textAnchor='middle' className='node-label' fill='#1f2937' fontSize={12} fontWeight='600'>
        M × H = {M * hidden} weights
      </text>

      {/* Hidden Layer 2 (when selected) - single vertical column */}
      {twoLayers && (
        <g>
          <DenseConnectionBundle
            from={edgePoints(h1x + boxW, hidden)}
            to={edgePoints(h2x, hidden)}
            active={stageActive(1)}
            color='#60a5fa'
            activeColor='#f59e0b'
          />
          <Arrow x1={h1x + boxW + 4} y1={CY} x2={h2x - 8} y2={CY} active={stageActive(1)} label='dense' />
          <LayerBox
            x={h2x}
            y={boxY}
            w={boxW}
            h={boxH}
            title='Hidden Layer 2'
            subtitle={hidden + ' neurons'}
            cols={1}
            rows={hidden}
            activations={actH2.map((row) => [row[0]])}
            active={stageActive(1) || stageActive(2)}
          />
          <text x={h2x + boxW / 2} y={boxY + boxH + 8} textAnchor='middle' className='node-label' fill='#1f2937' fontSize={12} fontWeight='600'>
            H × H = {hidden * hidden} weights
          </text>
        </g>
      )}

      {/* Last layer -> Output */}
      <ConnectionBundle
        from={edgePoints(midRight, hidden)}
        to={[{ x: outX, y: CY - 12 }, { x: outX, y: CY + 12 }]}
        active={stageActive(2)}
        maxLines={hidden}
        color='#60a5fa'
        activeColor='#f59e0b'
      />
      <Arrow x1={midRight + 4} y1={CY} x2={outX - 8} y2={CY} active={stageActive(2)} label='output' />

      {/* Output box (right of layers) */}
      <g>
        <rect
          x={outX}
          y={CY - 46}
          width={outW}
          height={92}
          rx={10}
          fill={stageActive(2) ? '#fffbeb' : '#ffffff'}
          stroke={stageActive(2) ? '#f59e0b' : '#dc2626'}
          strokeWidth={stageActive(2) ? 1.6 : 1.2}
        />
        <text x={outX + outW / 2} y={CY - 26} textAnchor='middle' className='node-label' fill={stageActive(2) ? '#92400e' : '#111827'} fontSize={10}>
          Output
        </text>
        <text x={outX + outW / 2} y={CY - 6} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'I: ' + cur[0].toFixed(2)}
        </text>
        <text x={outX + outW / 2} y={CY + 14} textAnchor='middle' className='node-sublabel' fill='#b91c1c' fontSize={11}>
          {'Q: ' + cur[1].toFixed(2)}
        </text>
        <text x={outX + outW / 2} y={CY + 32} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
          predistorted IQ
        </text>
      </g>

      {/* Output -> PA (right edge) */}
      <Arrow x1={outX + outW + 4} y1={CY} x2={paX - 8} y2={CY} active={stageActive(2)} label='to PA' />
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
        <text x={paX + paW / 2} y={CY + 32} textAnchor='middle' className='node-sublabel' fill='#6b7280' fontSize={9}>
          PA output
        </text>
      </g>
    </g>
  );
}