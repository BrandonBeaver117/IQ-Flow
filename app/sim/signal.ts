/** 
 * IQ signal generation for the RF PA modeling / DPD visualizer. 
 * 
 * Generates a complex-baseband (I/Q) signal that is a realistic, mildly 
 * modulated source for a PA. The signal is generated once and is immutable 
 * for the duration of a simulation run, so the three architectures see the 
 * exact same input. 
 */ 

import type { IQSample } from './types'; 

/** A complex IQ sample as a [i, q] tuple. */ 
export type IQTuple = IQSample; 

/**
 * Generate IQ signal with high variance between adjacent samples.
 * Amplitudes jump dramatically between 0.1-1.0 for visual clarity.
 */
export function generateIQSignal(
  numSamples: number, 
  sampleRate: number, 
  rng: (n: number) => number, 
): IQSample[] { 
  const signal: IQSample[] = []; 
  
  for (let t = 0; t < numSamples; t++) { 
    // Big jumps between adjacent samples
    // Use a random walk with large steps for visible differences
    let amp: number;
    if (t === 0) {
      amp = 0.1 + rng(1) * 0.9;
    } else {
      const prev = signal[t - 1];
      const prevAmp = Math.sqrt(prev[0] * prev[0] + prev[1] * prev[1]);
      // Large step: 60% chance of big jump, 40% moderate
      const bigJump = rng(1) < 0.6;
      const step = bigJump ? (rng(1) - 0.5) * 0.8 : (rng(1) - 0.5) * 0.3;
      amp = prevAmp + step;
      amp = Math.max(0.1, Math.min(1.0, amp));
    }
    
    // Uniform random phase (independent per sample for max variance)
    const phase = rng(1) * 2 * Math.PI;
    
    const i = amp * Math.cos(phase);
    const q = amp * Math.sin(phase);
    signal.push([i, q]); 
  } 
  return signal; 
} 

/** Normalize the IQ signal into a 0..1 amplitude normalized envelope. */ 
export function normalizeIQ(signal: IQSample[]): IQSample[] { 
  let maxAmp = 0; 
  for (const [i, q] of signal) { 
    maxAmp = Math.max(maxAmp, Math.sqrt(i * i + q * q)); 
  } 
  if (maxAmp === 0) return signal; 
  const gain = 1 / maxAmp; 
  return signal.map(([i, q]) => [i * gain, q * gain]); 
}