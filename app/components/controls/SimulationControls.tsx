"use client";

import { useMemo, useState } from 'react';
import type { Architecture } from '../../sim/types';
import { ArchitectureSelector } from './ArchitectureSelector';
import { updateConfig } from '../../hooks/useSimulation';
import type { SimulationConfig } from '../../hooks/useSimulation';

export interface SimulationControlsProps {
  value: SimulationConfig;
  onChange: (next: SimulationConfig) => void;
  architecture: Architecture;
  running: boolean;
  onRunningChange: (r: boolean) => void;
  speed: number;
  onSpeedChange: (s: number) => void;
}

function CompactSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className='flex items-center gap-1.5 min-w-[110px]' title={label}>
      <span className='text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 w-24'>
        {label}
      </span>
      <span className='text-[10px] font-mono text-gray-700 dark:text-gray-200 w-10 text-right'>
        {format ? format(value) : String(value)}
      </span>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className='h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-gray-300 dark:bg-gray-600 outline-none'
        style={{
          background: `linear-gradient(to right, #2563eb ${pct}%, #e5e7eb ${pct}%)`,
        }}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <span className='text-[10px] text-gray-500 dark:text-gray-400'>
      <span className='font-medium text-gray-600 dark:text-gray-300'>{label}:</span> {value}
    </span>
  );
}

export function SimulationControls({
  value,
  onChange,
  architecture,
  running,
  onRunningChange,
  speed,
  onSpeedChange,
}: SimulationControlsProps) {
  const [memDepth, setMemDepth] = useState(value.memoryDepth);
  const [hiddenLayers, setHiddenLayers] = useState(value.hiddenLayers);
  const [hiddenSize, setHiddenSize] = useState(value.hiddenSize);
  const [kernelSize, setKernelSize] = useState(value.kernelSize);
  const [dilation, setDilation] = useState(value.dilation);
  const [speedLocal, setSpeedLocal] = useState(speed);

  useMemo(() => {
    setMemDepth(value.memoryDepth);
    setHiddenLayers(value.hiddenLayers);
    setHiddenSize(value.hiddenSize);
    setKernelSize(value.kernelSize);
    setDilation(value.dilation);
    setSpeedLocal(speed);
  }, [
    value,
    speed,
  ]);

  const handleMemory = (v: number) => {
    setMemDepth(v);
    onChange(updateConfig(value, { memoryDepth: v }));
  };
  const handleHiddenLayers = (v: number) => {
    setHiddenLayers(v);
    onChange(updateConfig(value, { hiddenLayers: v }));
  };
  const handleHiddenSize = (v: number) => {
    setHiddenSize(v);
    onChange(updateConfig(value, { hiddenSize: v }));
  };
  const handleKernel = (v: number) => {
    setKernelSize(v);
    onChange(updateConfig(value, { kernelSize: v }));
  };
  const handleDilation = (v: number) => {
    setDilation(v);
    onChange(updateConfig(value, { dilation: v }));
  };
  const handleSpeed = (v: number) => {
    setSpeedLocal(v);
    onSpeedChange(v);
  };
  const handleArchitecture = (a: Architecture) => {
    onChange(updateConfig(value, { architecture: a }));
  };

  const reset = () => {
    onChange(
      updateConfig(value, {
        memoryDepth: 5,
        kernelSize: 3,
        dilation: 1,
        hiddenLayers: 2,
        hiddenSize: 8,
        architecture: 'MLP',
      }),
    );
  };

  return (
    <div className='flex items-center gap-3 text-xs'>
      <button
        type='button'
        onClick={() => onRunningChange(!running)}
        className={
          'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ' +
          (running
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-green-600 text-white hover:bg-green-700')
        }
        aria-pressed={running}
        title={running ? 'Pause' : 'Play'}
      >
        {running ? '⏸' : '▶'}
      </button>
      <button
        type='button'
        onClick={reset}
        className='rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition'
        title='Reset to defaults'
      >
        ↻
      </button>

      <CompactSlider
        label='Speed'
        value={speedLocal}
        min={0.1}
        max={3}
        step={0.1}
        format={(v) => v.toFixed(1) + 'x'}
        onChange={handleSpeed}
      />

      <span className='w-px h-5 bg-gray-300 dark:bg-gray-600' />

      <ArchitectureSelector value={value.architecture} onChange={handleArchitecture} />

      <span className='w-px h-5 bg-gray-300 dark:bg-gray-600' />

      <CompactSlider
        label='Memory depth'
        value={memDepth}
        min={1}
        max={20}
        step={1}
        onChange={handleMemory}
      />

      <span className='w-px h-5 bg-gray-300 dark:bg-gray-600' />

      {architecture === 'MLP' && (
        <>
          <CompactSlider
            label='Hidden layers'
            value={hiddenLayers}
            min={1}
            max={4}
            step={1}
            onChange={handleHiddenLayers}
          />
          <CompactSlider
            label='Hidden size'
            value={hiddenSize}
            min={2}
            max={12}
            step={1}
            onChange={handleHiddenSize}
          />
          <Metric label='Params' value={memDepth * hiddenSize} />
          <Metric label='Connectivity' value='Fully Connected' />
        </>
      )}
      {architecture === 'CNN' && (
        <>
          <CompactSlider
            label='Kernel size'
            value={kernelSize}
            min={1}
            max={7}
            step={1}
            onChange={handleKernel}
          />
          <CompactSlider
            label='Dilation'
            value={dilation}
            min={1}
            max={4}
            step={1}
            onChange={handleDilation}
          />
          <Metric label='Channels' value='2 (I, Q)' />
          <Metric label='Receptive field' value={1 + (kernelSize - 1) * dilation} />
          <Metric label='K-params' value={kernelSize * 2} />
        </>
      )}
      {architecture === 'GRU' && (
        <>
          <CompactSlider
            label='Hidden size'
            value={hiddenSize}
            min={2}
            max={16}
            step={1}
            onChange={handleHiddenSize}
          />
          <Metric label='Memory' value='Hidden State' />
          <Metric label='Params' value={3 * (2 + hiddenSize) * hiddenSize} />
        </>
      )}
    </div>
  );
}