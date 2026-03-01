import React from 'react';
import { Minus, Plus } from 'lucide-react';

export const ControlNumber = ({ label, value, setter, min, max }) => (
  <div className="flex flex-col items-center bg-zinc-800 p-4 rounded-2xl w-full">
    <span className="text-zinc-400 text-sm font-medium mb-3">{label}</span>
    <div className="flex items-center justify-between w-full">
      <button
        onClick={() => setter(v => Math.max(min, v - 1))}
        className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 active:bg-zinc-500 transition"
      >
        <Minus size={18} className="text-white" />
      </button>
      <span className="text-2xl font-bold text-white w-12 text-center">{value}</span>
      <button
        onClick={() => setter(v => Math.min(max, v + 1))}
        className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 active:bg-zinc-500 transition"
      >
        <Plus size={18} className="text-white" />
      </button>
    </div>
  </div>
);
