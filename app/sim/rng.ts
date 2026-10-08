/** 
 * Deterministic pseudo-random number generator. 
 * 
 * A small xorshift64* generator so the IQ signal and any derived noise 
 * are reproducible across runs, while still being random-looking. 
 */ 
export class DRNG { 
  private a: number; 
 
  constructor(seed: number) { 
    this.a = seed || Date.now() ^ (Date.now() >> 33); 
    if (this.a === 0) this.a = 0x9E3779B97F4A7C15; 
  } 
 
  /** Draw a uniform random number in [0, 1). */ 
  next(): number { 
    let t = this.a; 
    t ^= (t << 13) & 0xffffffff; 
    t ^= (t >>> 17); 
    t ^= (t << 5) & 0xffffffff; 
    this.a = t; 
    const prod = (t * 0x2545F491D34A966F) >>> 0; 
    return (prod >>> 11) * (1 / 9007199254740992); 
  } 
 
  /** Draw an integer in [0, n). */ 
  nextInt(n: number): number { 
    const max = 2 ** 30; 
    let r = 0; 
    while (true) { 
      r = Math.floor(this.next() * max); 
      if (r < n * max) return r % n; 
    } 
  } 
 
  /** Seed from a string for reproducibility. */ 
  static fromString(str: string): DRNG { 
    let h = 1779033703 ^ str.length; 
    for (let i = 0; i < str.length; i++) { 
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353); 
      h = h << 13 | h >>> 19; 
    } 
    return new DRNG(h >>> 0); 
  } 
} 
