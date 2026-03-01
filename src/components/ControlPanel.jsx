import React from 'react';
import { Settings2, Square, Play } from 'lucide-react';
import { ControlNumber } from './ControlNumber';
import { PATTERNS } from '../constants/patterns';

export function ControlPanel({
  playBars, setPlayBars,
  muteBars, setMuteBars,
  preset, setPreset,
  bpm, setBpm,
  isPlaying, togglePlay
}) {
  return (
    <div className="p-6 bg-zinc-900/50">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ControlNumber label="재생 마디 (Play Loops)" value={playBars} setter={setPlayBars} min={1} max={16} />
        <ControlNumber label="묵음 마디 (Mute Loops)" value={muteBars} setter={setMuteBars} min={1} max={16} />
      </div>

      {/* 프리셋 선택 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-zinc-400 text-sm font-medium flex items-center gap-1">
            <Settings2 size={16} /> 드럼 패턴
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PATTERNS).map(([key, name]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`py-2 rounded-xl text-sm font-medium transition-colors ${preset === key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* BPM 컨트롤 (직접 입력 지원) */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-3 px-1">
          <span className="text-zinc-400 text-sm font-medium">템포 (BPM)</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            onBlur={(e) => {
              let val = parseInt(e.target.value);
              if (isNaN(val) || val < 40) val = 40;
              if (val > 300) val = 300;
              setBpm(val);
            }}
            className="bg-transparent text-3xl font-bold text-white tracking-tighter w-20 text-right focus:outline-none focus:border-b focus:border-indigo-500 rounded-none border-b border-transparent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="클릭하여 숫자 입력"
          />
        </div>
        <input
          type="range"
          min="40"
          max="300"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* 재생 버튼 */}
      <button
        onClick={togglePlay}
        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold transition-all shadow-xl active:scale-[0.98] ${isPlaying
          ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
          }`}
      >
        {isPlaying ? (
          <>
            <Square fill="currentColor" size={24} />
            <span>정지</span>
          </>
        ) : (
          <>
            <Play fill="currentColor" size={24} />
            <span>연습 시작</span>
          </>
        )}
      </button>
    </div>
  );
}
