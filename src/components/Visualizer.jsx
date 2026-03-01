import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function Visualizer({
  isPlaying,
  currentPhase,
  currentBarIndex,
  playBars,
  muteBars,
  activeBeat
}) {
  return (
    <div className="p-8 flex flex-col items-center justify-center relative h-64">
      <div className="mb-8 flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 shadow-lg ${!isPlaying ? 'bg-zinc-800' :
          currentPhase === 'play' ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' :
            'bg-rose-500/20 text-rose-400 shadow-rose-500/20'
          }`}>
          {currentPhase === 'play' ? <Volume2 size={32} /> : <VolumeX size={32} />}
        </div>
        <h2 className={`text-2xl font-bold transition-colors ${!isPlaying ? 'text-zinc-500' :
          currentPhase === 'play' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
          {currentPhase === 'play' ? 'SOUND ON' : 'MUTED'}
        </h2>
        <p className="text-zinc-500 mt-1 font-medium">
          마디 {isPlaying ? currentBarIndex + 1 : 0} / {currentPhase === 'play' ? playBars : muteBars}
        </p>
      </div>

      <div className="flex gap-4">
        {[0, 1, 2, 3].map((beat) => (
          <div
            key={beat}
            className={`w-4 h-4 rounded-full transition-all ${activeBeat === beat && isPlaying ? 'duration-0 ease-out' : 'duration-[250ms] ease-in'
              } ${activeBeat === beat && isPlaying
                ? currentPhase === 'play'
                  ? 'bg-emerald-400 scale-150 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                  : 'bg-rose-400 scale-150 shadow-[0_0_15px_rgba(251,113,133,0.5)]'
                : 'bg-zinc-800 scale-100'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
