import React from 'react';
import { useRhythmEngine } from './hooks/useRhythmEngine';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';

export default function App() {
  const { state, actions } = useRhythmEngine();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800">
        <Header isPlaying={state.isPlaying} />

        <Visualizer
          isPlaying={state.isPlaying}
          currentPhase={state.currentPhase}
          currentBarIndex={state.currentBarIndex}
          playBars={state.playBars}
          muteBars={state.muteBars}
          activeBeat={state.activeBeat}
        />

        <ControlPanel
          playBars={state.playBars}
          setPlayBars={actions.setPlayBars}
          muteBars={state.muteBars}
          setMuteBars={actions.setMuteBars}
          preset={state.preset}
          setPreset={actions.setPreset}
          bpm={state.bpm}
          setBpm={actions.setBpm}
          isPlaying={state.isPlaying}
          togglePlay={actions.togglePlay}
          isReady={state.isReady}
        />
      </div>
    </div>
  );
}