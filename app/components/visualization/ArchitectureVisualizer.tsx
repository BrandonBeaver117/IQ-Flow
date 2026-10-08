"use client";

import type { Architecture } from '../../sim/types';
import type { SimulationConfig } from '../../hooks/useSimulation';
import { PLAYFIELD } from './SharedVisualizer';
import { Arrow } from './primitives';
import { MlpVisualizer } from './MlpVisualizer';
import { CnnVisualizer } from './CnnVisualizer';
import { GruVisualizer } from './GruVisualizer';

/**
 * Architecture dispatcher.
 *
 * Renders the shared pipeline context strip (IQ Input -> AI/DPD architecture
 * -> Predist. IQ -> Nonlinear PA -> PA Output) and then delegates the
 * main diagram to the architecture-specific visualizer.
 */
export interface ArchitectureVisualizerProps {
  inputIQ: Array<[number, number]>;
  paOutput: Array<[number, number]>;
  config: SimulationConfig;
  clock: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}

const ARCH_COLOR: Record<Architecture, string> = {
  MLP: '#2563eb',
  CNN: '#16a34a',
  GRU: '#7c3aed',
};

/** ViewBox Y at which the zoomable architecture diagram begins (below the
 * fixed pipeline context strip). Passed to useDiagramZoom so that
 * zoom-at-cursor math accounts for the header offset. */
export const DIAGRAM_ORIGIN_Y = 64;

export function ArchitectureVisualizer({ inputIQ, paOutput, config, clock, zoom, panX, panY }: ArchitectureVisualizerProps) {
  const architecture = config.architecture;
  const color = ARCH_COLOR[architecture];

  const stages: Array<{ label: string; accent: string; filled: boolean }> = [
    { label: 'IQ Input', accent: '#3b82f6', filled: false },
    { label: 'AI / DPD  ' + architecture, accent: color, filled: true },
    { label: 'Predist. IQ', accent: '#3b82f6', filled: false },
    { label: 'Nonlinear PA', accent: '#dc2626', filled: false },
    { label: 'PA Output', accent: '#dc2626', filled: false },
  ];
  const pillW = 150;
  const gap = 28;
  const totalW = stages.length * pillW + (stages.length - 1) * gap;
  const x0 = (PLAYFIELD.width - totalW) / 2;
  const cy = 30;
  const diagramY = DIAGRAM_ORIGIN_Y;

  return (
    <g>
      {/* Pipeline context strip */}
      <g>
        {stages.map((st, i) => {
          const px = x0 + i * (pillW + gap);
          return (
            <g key={st.label}>
              <rect
                x={px}
                y={cy - 16}
                width={pillW}
                height={32}
                rx={16}
                fill={st.filled ? st.accent : '#f3f4f6'}
                stroke={st.accent}
                strokeWidth={st.filled ? 0 : 1.2}
              />
              <text
                x={px + pillW / 2}
                y={cy + 4}
                textAnchor='middle'
                className='node-label'
                fill={st.filled ? '#ffffff' : '#1f2937'}
                fontSize={11}
              >
                {st.label}
              </text>
              {i < stages.length - 1 && (
                <Arrow x1={px + pillW + 6} y1={cy} x2={px + pillW + gap - 6} y2={cy} color='#6b7280' />
              )}
            </g>
          );
        })}
      </g>

      {/* diagramZ - zoomable */}
      <g transform={'translate(' + (panX ?? 0) + ' ' + (diagramY + (panY ?? 0)) + ') scale(' + (zoom ?? 1) + ')'}>
        {architecture === 'MLP' && <MlpVisualizer inputIQ={inputIQ} paOutput={paOutput} config={config} clock={clock} />}
        {architecture === 'CNN' && <CnnVisualizer inputIQ={inputIQ} paOutput={paOutput} config={config} clock={clock} />}
        {architecture === 'GRU' && <GruVisualizer inputIQ={inputIQ} paOutput={paOutput} config={config} clock={clock} />}
      </g>
    </g>
  );
}