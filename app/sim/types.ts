/** 
 * Core domain types for the RF PA modeling / DPD architecture visualizer. 
 *
 * The visualizer compares exactly three AI architectures (MLP, CNN, GRU) on the 
 * same task: modeling a memory-dependent radio-frequency power amplifier. 
 *
 * Design note: the input signal and the PA model are immutable. Switching 
 * architecture only changes how the *current* architecture consumes the fixed 
 * input window and predicts the PA output y(t). 
 */ 
 
/** The three AI architectures the visualizer supports. */ 
export type Architecture = 'MLP' | 'CNN' | 'GRU'; 
 
/** Valid filter/architecture names. No generic RNN, no Transformer. */ 
export const ARCHITECTURES: Architecture[] = ['MLP', 'CNN', 'GRU']; 
 
/** 
 * A single complex-baseband IQ sample. 
 * Real representation: [i, q] where i = in-phase, q = in-quadrature. 
 */ 
export type IQSample = [number, number]; 
 
/** Phase in radians, amplitude in linear power. */ 
export interface Complex { 
  i: number; 
  q: number; 
} 
 
/** Parameters for the power amplifier model. */ 
export interface PaParameters { 
  /** Non-linearity strength (0 = linear, larger = more distortion). */ 
  nonlinearity: number; 
  /** Memory depth of the PA (how many past samples feed the distortion). */ 
  memoryDepth: number; 
  /** Additional phase distortion coefficient. */ 
  phaseKnee: number; 
  /** Input drive (0..1 relative to PA saturation). */ 
  inputDrive: number; 
} 
 
/** A time-indexed IQ sample. */ 
export interface SampledIQ { 
  time: number; 
  iq: number[]; 
  amplitude: number; 
  phase: number; 
} 
 
/** Slider / parameter control configuration. */ 
export interface SliderControl { 
  id: string; 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  format?: (v: number) => string; 
} 
 
/** Slider shared by all three architectures (memory depth). */ 
export const MEMORY_DEPTH_CONTROL: SliderControl = { 
  id: 'memory-depth', 
  label: 'Memory depth (M)', 
  value: 5, 
  min: 1, 
  max: 20, 
  step: 1, 
}; 
 
/** Slider shared by all three architectures (input drive). */ 
export const INPUT_DRIVE_CONTROL: SliderControl = { 
  id: 'input-drive', 
  label: 'Input drive', 
  value: 0.8, 
  min: 0.1, 
  max: 1, 
  step: 0.05, 
}; 
 
/** Slider shared by all three architectures (PA non-linearity). */ 
export const NONLINEARITY_CONTROL: SliderControl = { 
  id: 'nonlinearity', 
  label: 'PA nonlinearity', 
  value: 0.6, 
  min: 0, 
  max: 1, 
  step: 0.05, 
}; 
 
/** 
 * Return the number of trainable parameters in the first layer of a windowed MLP. 
 * first-layer params  memory depth (M)  hidden size (H), the parameter 
 * relationship the educational diagram must make explicit. 
 */ 
export function mlpFirstLayerParamCount(memoryDepth: number, hiddenSize: number): number { 
  return memoryDepth * hiddenSize; 
} 
 
/** 
 * Compute the theoretical receptive field of a 1D CNN given a stack of 
 * convolutional layers with given kernel sizes and dilation rates. 
 */ 
export function cnnReceptiveField(kernelSizes: number[], dilations: number[]): number { 
  if (kernelSizes.length === 0 || dilations.length === 0) return 1; 
  let rf = 1; 
  for (let i = 0; i < kernelSizes.length; i++) { 
    rf += (kernelSizes[i] - 1) * dilations[i]; 
  } 
  return rf + 1; 
} 
