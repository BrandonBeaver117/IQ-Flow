"use client";

import { useRef, useState } from 'react';
import type { SimulationConfig } from './hooks/useSimulation';
import { useAnimation } from './hooks/useAnimation';
import { useSimulation, updateConfig, advanceClock } from './hooks/useSimulation';
import { SimulationControls } from './components/controls/SimulationControls';
import { ArchitectureVisualizer, DIAGRAM_ORIGIN_Y } from './components/visualization/ArchitectureVisualizer';
import { PLAYFIELD } from './components/visualization/SharedVisualizer';
import { useDiagramZoom, useDiagramGestures } from './components/visualization/useDiagramZoom';

export default function Home() {
  const [config, setConfig] = useState<SimulationConfig>({
    architecture: 'MLP',
    numSamples: 600,
    sampleRate: 1000,
    seed: 20261008,
    nonlinearity: 0.6,
    memoryDepth: 5,
    phaseKnee: 0.5,
    inputDrive: 0.8,
    kernelSize: 3,
    dilation: 1,
    hiddenLayers: 2,
    hiddenSize: 8,
  });
  const [clock, setClock] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const sim = useSimulation(config);
  const architecture = config.architecture;

  const tick = (timeSec: number) => {
    setClock((prev) => advanceClock(prev, 0.005 * speed) % Math.max(1, sim.inputIQ.length));
  };
  useAnimation(tick, running);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomApi = useDiagramZoom(DIAGRAM_ORIGIN_Y);
  useDiagramGestures(svgRef, zoomApi);

  const keyIdeas: Record<typeof architecture, string> = {
    MLP: 'explicitly provides the whole memory window to a dense layer',
    CNN: 'uses weight sharing across time with a sliding kernel',
    GRU: 'reuses one cell across timesteps via hidden-state carry',
  };

  return (
    <div className='flex h-screen flex-col overflow-hidden font-sans'>
      <header className='flex items-center justify-between px-4 py-1.5 text-sm'>
        <div className='flex items-center gap-3'>
          <span className='text-lg font-semibold text-gray-900 dark:text-zinc-50'>IQ Flow</span>
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            RF PA modeling · {architecture} visualizer
          </span>
        </div>
        <div className='flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400'>
          <span className='font-mono text-gray-700 dark:text-gray-200'>
            MSE: {sim.stepSize.toFixed(6)}
          </span>
          <span className='font-mono text-gray-700 dark:text-gray-200'>
            Zoom: {Math.round(zoomApi.zoom * 100)}%
          </span>
        </div>
      </header>

      <div className='bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-700 px-2 py-1 overflow-x-auto'>
        <SimulationControls
          value={config}
          onChange={setConfig}
          architecture={architecture}
          running={running}
          onRunningChange={setRunning}
          speed={speed}
          onSpeedChange={setSpeed}
        />
      </div>

      <div className='relative flex-1 overflow-hidden p-2'>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${PLAYFIELD.width} ${PLAYFIELD.height}`}
          className='h-full w-full bg-white dark:bg-gray-900 select-none'
          preserveAspectRatio='xMidYMid meet'
          style={{ overflow: 'visible', touchAction: 'none' }}
          role='img'
          aria-label={`${architecture} architecture diagram`}
        >
          <defs>
            <pattern id='grid' width={24} height={24} patternUnits='userSpaceOnUse' opacity={0.35}>
              <path d='M 24 0 L 0 0 0 24' fill='none' stroke='#9ca3af' strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect x={-10000} y={-10000} width={20000} height={20000} fill='url(#grid)' />
          <ArchitectureVisualizer
            inputIQ={sim.inputIQ}
            paOutput={sim.paOutput}
            config={sim.config}
            clock={clock}
            zoom={zoomApi.zoom}
            panX={zoomApi.panX}
            panY={zoomApi.panY}
          />
        </svg>

        <div className='absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 shadow-sm'>
          <button
            type='button'
            onClick={zoomApi.zoomOut}
            className='text-xs px-1.5 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
            aria-label='Zoom out'
            title='Zoom out (scroll / pinch to zoom)'
          >
            −
          </button>
          <span className='text-[10px] font-mono text-gray-600 dark:text-gray-300 w-10 text-center'>
            {Math.round(zoomApi.zoom * 100)}%
          </span>
          <button
            type='button'
            onClick={zoomApi.zoomIn}
            className='text-xs px-1.5 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
            aria-label='Zoom in'
            title='Zoom in'
          >
            +
          </button>
          <button
            type='button'
            onClick={zoomApi.reset}
            className='text-xs px-1.5 py-0.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
            aria-label='Reset view'
            title='Reset view (double-click to reset)'
          >
            ⟲
          </button>
        </div>
      </div>

      <div className='flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black px-4 py-1 text-xs text-gray-500 dark:text-gray-400'>
        <span className='font-medium text-gray-600 dark:text-gray-300'>Key idea:</span>
        <span className='font-medium text-gray-700 dark:text-gray-200'>{architecture}</span>
        <span>{keyIdeas[architecture]}</span>
      </div>
    </div>
  );
}
