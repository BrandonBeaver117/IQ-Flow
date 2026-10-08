/** 
 * Simulation state hook for the RF PA visualizer. 
 * 
 * Holds the immutable setup (input signal, PA parameters, memory depth, and 
 * the derived PA output) plus a simClock that advances on each animation 
 * frame. It does NOT encode the AI architecture internal state, because 
 * each architecture (MLP, CNN, GRU) has different working state; those are 
 * owned by their respective visualizer components. 
 * 
 * Design invariant: switching architecture never changes the input signal or 
 * the PA output. Only the architecture prediction changes. 
 */ 
 
import { useMemo } from 'react'; 
import type { Architecture } from '../sim/types'; 
import { paOutputForFullSequence } from '../sim/pa'; 
import { normalizeIQ, generateIQSignal } from '../sim/signal'; 
import { DRNG } from '../sim/rng'; 
import { DEFAULT_NUM_SAMPLES, DEFAULT_SAMPLE_RATE } from '../sim/constants'; 
 
/** Mutable simulation configuration. */ 
export interface SimulationConfig { 
  architecture: Architecture; 
  numSamples: number; 
  sampleRate: number; 
  seed: number; 
  nonlinearity: number; 
  memoryDepth: number; 
  phaseKnee: number; 
  inputDrive: number; 
  kernelSize: number;
  dilation: number;
  hiddenLayers: number;
  hiddenSize: number;
} 
 
/** Window of the last `memoryDepth` IQ samples feeding the model at `currentTime`. */ 
export interface WindowState { 
  complex: Array<[number, number]>; 
  length: number; 
  time: number; 
} 
 
/** Running error statistic over the live window. */ 
export interface ErrorStats { 
  mse: number; 
  currentMagnitude: number; 
} 
 
/** The full set of read-only simulation data for a given config. */ 
export interface SimulationData { 
  inputIQ: Array<[number, number]>; 
  paOutput: Array<[number, number]>; 
  config: SimulationConfig; 
  stepSize: number; 
} 
 
/** 
 * Derived simulation data and mutable simulation clock. 
 * 
 * On mount we generate the signal and compute the PA output once. Any change 
 * to the config (except architecture) triggers a regeneration of the same 
 * data with the new parameters while keeping the seed-derived signal aligned. 
 */ 
export function useSimulation(config: SimulationConfig): SimulationData { 
  const rng = useMemo(() => DRNG.fromString(String(config.seed)), [config.seed]); 
 
  const inputIQ = useMemo<Array<[number, number]>>(() => { 
    const raw = generateIQSignal(config.numSamples, config.sampleRate, () => rng.next()); 
    const normalized = normalizeIQ(raw); 
    const drive = Math.max(0.01, Math.min(1.0, config.inputDrive)); 
    return normalized.map(([i, q]) => [i * drive, q * drive]); 
  }, [config.numSamples, config.sampleRate, rng, config.inputDrive]); 
 
  const paOutput = useMemo<Array<[number, number]>>(() => { 
    const p = { 
      nonlinearity: config.nonlinearity, 
      memoryDepth: config.memoryDepth, 
      phaseKnee: config.phaseKnee, 
      inputDrive: config.inputDrive, 
    } as const; 
    const asObjects = inputIQ.map(([i, q]) => ({ i, q }));
    const out = paOutputForFullSequence(asObjects, config.memoryDepth, p);
    return out.map(({ i, q }) => [i, q] as [number, number]); 
  }, [inputIQ, config.memoryDepth, config.nonlinearity, config.phaseKnee, config.inputDrive]); 
 
  const stepSize = useMemo(() => 0.0001, []); 
 
  return { 
    inputIQ, 
    paOutput, 
    config, 
    stepSize, 
  }; 
} 
 
/** 
 * Update config values, returning a new config without mutating the old one. 
 */ 
export function updateConfig(
  prev: SimulationConfig, 
  patch: Partial<SimulationConfig>, 
): SimulationConfig { 
  return { ...prev, ...patch }; 
} 
 
/** 
 * Advance the simulation clock by one sample step. Returns a new clock value. 
 */ 
export function advanceClock(clock: number, step: number = 1): number { 
  return clock + step; 
} 




