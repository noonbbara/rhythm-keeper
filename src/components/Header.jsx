import React from 'react';
import { Activity } from 'lucide-react';

export function Header({ isPlaying }) {
  return (
    <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
      <div className="flex items-center gap-2 text-indigo-400">
        <Activity size={24} />
        <h1 className="text-xl font-bold tracking-tight text-white">Rhythm Keeper</h1>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPlaying ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
        {isPlaying ? 'Running' : 'Ready'}
      </div>
    </div>
  );
}
