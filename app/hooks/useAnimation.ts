/** 
 * Animation hook for the RF PA visualizer. 
 * 
 * Drives a requestAnimationFrame loop so the signal streams through the 
 * selected architecture smoothly. The loop itself never mutates the input 
 * signal or the PA model; it only advances the simulation clock and asks the 
 * current architecture to update its internal working state. 
 */ 
 
import { useEffect, useRef } from 'react'; 
 
/** The animation handle returned by requestAnimationFrame. */ 
export type AnimationFrame = number; 
 
/** 
 * A tick callback fired once per frame with the current time in seconds. 
 * Pure; components should derive state from it. 
 */ 
export type TickCallback = (time: number) => void; 
 
/** 
 * Run an animation loop. 
 * 
 * @param onTick  Called every frame with the monotonically increasing 
 *                simulation time in seconds. 
 * @param enabled   When false, the loop is paused (doesn't advance time). 
 */ 
export function useAnimation(onTick: TickCallback, enabled: boolean = true): void { 
  const savedCallback = useRef(onTick); 
  const rafRef = useRef<AnimationFrame | null>(null); 
 
  useEffect(() => { 
    savedCallback.current = onTick; 
  }, [onTick]); 
 
  useEffect(() => { 
    if (!enabled) return; 
 
    const loop = (timeMs: number) => { 
      savedCallback.current(timeMs / 1000); 
      rafRef.current = requestAnimationFrame(loop); 
    }; 
 
    rafRef.current = requestAnimationFrame(loop); 
    return () => { 
      if (rafRef.current !== null) { 
        cancelAnimationFrame(rafRef.current); 
      } 
    }; 
  }, [enabled]); 
} 
