/** 
 * Memory-dependent PA model for the RF PA modeling / DPD visualizer. 
 * 
 * Implements a realistic memory-dependent power amplifier: 
 *   - AM-AM: amplitude compression via a soft sigmoid (logistic) curve. 
 *   - AM-PM: phase rotation that depends on the instantaneous amplitude. 
 *   - Memory: the distortion at time t depends on x(t), x(t-1), ..., x(t-M). 
 * 
 * The PA is immutable across architecture switches. The same input signal 
 * and PA model are fed to all three architectures during comparison. 
 */ 
 
import type { Complex, PaParameters } from './types'; 
 
/** Convert a complex IQ pair into polar form. */ 
export function toPolar(i: number, q: number): { amplitude: number; phase: number } { 
  const amplitude = Math.sqrt(i * i + q * q); 
  const phase = Math.atan2(q, i); 
  return { amplitude, phase }; 
} 
 
/** Convert polar form back into a complex IQ pair. */ 
export function toCartesian(amplitude: number, phase: number): Complex { 
  return { i: amplitude * Math.cos(phase), q: amplitude * Math.sin(phase) }; 
} 
 
/** 
 * Smooth amplitude compression curve (AM-AM). 
 * Handles the soft knee near saturation with an exponential profile. 
 */ 
function amAm(amplitude: number, nonlinearity: number): number { 
  const norm = Math.min(amplitude, 1.0); 
  const knee = 0.4; 
  if (norm <= knee) { 
    return norm * (1 + nonlinearity * (1 - norm / knee) * 0.5); 
  } 
  const above = (norm - knee) / (1 - knee); 
  const compressed = 1 - (1 - norm) * (1 - above * nonlinearity); 
  return Math.min(1, Math.max(0, compressed)); 
} 
 
/** 
 * Smooth phase rotation as a function of amplitude (AM-PM). 
 */ 
function amPm(amplitude: number, phaseKnee: number): number { 
  const norm = Math.min(amplitude, 1.0); 
  return norm * norm * phaseKnee; 
} 
 
/** 
 * Memory-dependent PA: distorts a *window* of IQ samples using the last M 
 * amplitudes and phases. 
 */ 
export function paDistort(window: Array<{ i: number; q: number }>, p: PaParameters): { i: number; q: number } { 
  if (window.length === 0) { 
    return { i: 0, q: 0 }; 
  } 
  const recent = window[window.length - 1]; 
  let sumAmp = 0; 
  for (let k = 0; k < window.length; k++) { 
    const { amplitude } = toPolar(window[k].i, window[k].q); 
    sumAmp += amplitude; 
  } 
  const meanAmp = sumAmp / window.length; 
  const base = toPolar(recent.i, recent.q); 
  const outAmp = amAm(base.amplitude, p.nonlinearity); 
  const ampForPm = Math.max(base.amplitude, meanAmp); 
  const phaseRotation = amPm(ampForPm, p.phaseKnee); 
  const phase = base.phase + phaseRotation; 
  return toCartesian(outAmp, phase); 
} 
 
/** Generate the full PA output for a fixed input memory window at every time step. */ 
export function paOutputForFullSequence(sequence: Array<{ i: number; q: number }>, memoryDepth: number, p: PaParameters): Array<{ i: number; q: number }> { 
  const out: Array<{ i: number; q: number }> = []; 
  const padded = Array.from({ length: memoryDepth }, () => ({ i: 0, q: 0 })).concat(sequence); 
  for (let t = 0; t < sequence.length; t++) { 
    const start = t; 
    const end = t + memoryDepth; 
    const window = padded.slice(start, end + 1); 
    out.push(paDistort(window, p)); 
  } 
  return out; 
} 
