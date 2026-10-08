"use client";

import type { Architecture } from '../../sim/types';
import { ARCHITECTURES } from '../../sim/types';

export interface ArchitectureSelectorProps {
  value: Architecture;
  onChange: (a: Architecture) => void;
}

/**
 * The primary selector: exactly three toggle buttons - [MLP] [CNN] [GRU].
 *
 * No generic RNN and no Transformer are offered. Switching tabs keeps the
 * exact same IQ input signal, PA model, simulation timing, and memory-
 * dependent signal (only the AI architecture changes).
 */
export function ArchitectureSelector({ value, onChange }: ArchitectureSelectorProps) {
  return (
    <div className='flex items-center gap-1' role='group' aria-label='Architecture selector'>
      {ARCHITECTURES.map((arch) => (
        <button
          key={arch}
          type='button'
          aria-pressed={value === arch}
          onClick={() => onChange(arch)}
          className={
            'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ' +
            (value === arch
              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800')
          }
        >
          {arch}
        </button>
      ))}
    </div>
  );
}
