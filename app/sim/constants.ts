/** 
 * Default constants for the simulation. 
 * 
 * These keep the visualizer deterministic and fast for the educational 
 * charts, while leaving realistic room for the user to explore. 
 */ 
 
/** Default number of samples processed in the streaming simulation loop. */ 
export const DEFAULT_NUM_SAMPLES = 600; 
 
/** Default sample rate (complex I/Q samples per second). */ 
export const DEFAULT_SAMPLE_RATE = 1000; 
 
/** Minimum window length driven by memory depth. */ 
export const MIN_WINDOW_SAMPLES = 10; 
 
/** The maximum lookahead used in the simulation clock. */ 
export const SIMULATION_STEP = 1; 
