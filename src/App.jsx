import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Minus, Plus, Volume2, VolumeX, Activity, Settings2 } from 'lucide-react';

// --- Web Audio API 기반 드럼 신디사이저 엔진 ---
class DrumSynth {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.createNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // 주파수를 빠르게 떨어뜨려 펀치감을 줍니다.
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  playSnare(time) {
    // 톤 (몸통 소리)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(250, time);
    oscGain.gain.setValueAtTime(0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.start(time);
    osc.stop(time + 0.2);

    // 스네어 와이어 (노이즈 소리)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.start(time);
    noise.stop(time + 0.2);
  }

  playHihat(time) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 10000;
    
    const gain = this.ctx.createGain();
    
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    noise.start(time);
    noise.stop(time + 0.05);
  }
}

const drumSynth = new DrumSynth();

// UI 컴포넌트 - 숫자 조절 컨트롤러 (재렌더링 최적화를 위해 App 밖으로 분리)
const ControlNumber = ({ label, value, setter, min, max }) => (
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

const PATTERNS = {
  basic: '기본 록',
  four: '포 온 더 플로어',
  half: '하프 타임'
};

export default function App() {
  // 상태 관리
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [playBars, setPlayBars] = useState(4); // n개의 루프 (소리 남)
  const [muteBars, setMuteBars] = useState(4); // m개의 루프 (소리 안남)
  const [preset, setPreset] = useState('basic'); // 드럼 패턴
  
  // 시각적 피드백을 위한 상태
  const [currentPhase, setCurrentPhase] = useState('play');
  const [activeBeat, setActiveBeat] = useState(-1);
  const [currentBarIndex, setCurrentBarIndex] = useState(0);

  // 재생 중 실시간 반영을 위한 Refs (오디오 스케줄러가 항상 최신 값을 참조하도록 함)
  const bpmRef = useRef(bpm);
  const playBarsRef = useRef(playBars);
  const muteBarsRef = useRef(muteBars);
  const presetRef = useRef(preset);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { playBarsRef.current = playBars; }, [playBars]);
  useEffect(() => { muteBarsRef.current = muteBars; }, [muteBars]);
  useEffect(() => { presetRef.current = preset; }, [preset]);

  // 스케줄러를 위한 참조 변수들
  const timerRef = useRef(null);
  const lookahead = 25; // 스케줄러 호출 주기 (ms)
  const scheduleAheadTime = 0.1; // 미리 스케줄링할 시간 (초)
  const nextNoteTime = useRef(0);
  const currentBeatInBar = useRef(0); // 0, 1, 2, 3
  const currentBarCount = useRef(0);
  const phaseRef = useRef('play'); // 'play' or 'mute'
  
  // UI 동기화 큐
  const drawQueue = useRef([]);
  const animationRef = useRef(null);

  // 다음 노트의 시간을 계산 (최신 Ref 값을 참조하여 실시간 반영)
  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current; 
    nextNoteTime.current += secondsPerBeat;
    currentBeatInBar.current++;

    // 한 마디(4박자)가 끝났을 때
    if (currentBeatInBar.current === 4) {
      currentBeatInBar.current = 0;
      currentBarCount.current++;

      // 페이즈 전환 로직
      if (phaseRef.current === 'play' && currentBarCount.current >= playBarsRef.current) {
        phaseRef.current = 'mute';
        currentBarCount.current = 0;
      } else if (phaseRef.current === 'mute' && currentBarCount.current >= muteBarsRef.current) {
        phaseRef.current = 'play';
        currentBarCount.current = 0;
      }
    }
  }, []); // 의존성 배열을 비워 클로저 문제를 없앰

  // 노트 스케줄링
  const scheduleNote = useCallback((beatNumber, time, phase, barIndex) => {
    drawQueue.current.push({ note: beatNumber, time: time, phase: phase, bar: barIndex });

    if (phase === 'play') {
      const p = presetRef.current;
      
      // 하이햇은 모든 패턴에서 기본적으로 모든 박자에 나옵니다.
      drumSynth.playHihat(time);

      if (p === 'basic') {
        // 기본 록 (쿵 치 따 치)
        if (beatNumber === 0 || beatNumber === 2) drumSynth.playKick(time);
        if (beatNumber === 1 || beatNumber === 3) drumSynth.playSnare(time);
      } else if (p === 'four') {
        // 포 온 더 플로어 (쿵 쿵 쿵 쿵)
        drumSynth.playKick(time); // 모든 박자에 킥
        if (beatNumber === 1 || beatNumber === 3) drumSynth.playSnare(time);
      } else if (p === 'half') {
        // 하프 타임 (쿵 - 따 -)
        if (beatNumber === 0) drumSynth.playKick(time);
        if (beatNumber === 2) drumSynth.playSnare(time);
      }
    }
  }, []);

  // 오디오 스케줄러 루프
  const scheduler = useCallback(() => {
    if (!drumSynth.ctx) return;
    
    while (nextNoteTime.current < drumSynth.ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentBeatInBar.current, nextNoteTime.current, phaseRef.current, currentBarCount.current);
      nextNote();
    }
    timerRef.current = setTimeout(scheduler, lookahead);
  }, [nextNote, scheduleNote]);

  // UI 그리기 루프
  const draw = useCallback(() => {
    if (!drumSynth.ctx) return;
    const currentTime = drumSynth.ctx.currentTime;
    
    while (drawQueue.current.length && drawQueue.current[0].time <= currentTime) {
      const event = drawQueue.current.shift();
      setActiveBeat(event.note);
      setCurrentPhase(event.phase);
      setCurrentBarIndex(event.bar);
    }
    animationRef.current = requestAnimationFrame(draw);
  }, []);

  // 재생 / 정지 토글
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      setActiveBeat(-1);
      drawQueue.current = [];
    } else {
      drumSynth.init();
      setIsPlaying(true);
      
      currentBeatInBar.current = 0;
      currentBarCount.current = 0;
      phaseRef.current = 'play';
      nextNoteTime.current = drumSynth.ctx.currentTime + 0.1;
      drawQueue.current = [];
      
      scheduler();
      draw();
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-800">
        
        {/* 헤더 */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <Activity size={24} />
            <h1 className="text-xl font-bold tracking-tight text-white">Rhythm Keeper</h1>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isPlaying ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
            {isPlaying ? 'Running' : 'Ready'}
          </div>
        </div>

        {/* 메인 뷰: 시각적 피드백 */}
        <div className="p-8 flex flex-col items-center justify-center relative h-64">
          <div className="mb-8 flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors duration-300 shadow-lg ${
              !isPlaying ? 'bg-zinc-800' : 
              currentPhase === 'play' ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/20' : 
              'bg-rose-500/20 text-rose-400 shadow-rose-500/20'
            }`}>
              {currentPhase === 'play' ? <Volume2 size={32} /> : <VolumeX size={32} />}
            </div>
            <h2 className={`text-2xl font-bold transition-colors ${
              !isPlaying ? 'text-zinc-500' : 
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
                className={`w-4 h-4 rounded-full transition-all duration-100 ${
                  activeBeat === beat && isPlaying
                    ? currentPhase === 'play' 
                      ? 'bg-emerald-400 scale-150 shadow-[0_0_15px_rgba(52,211,153,0.5)]' 
                      : 'bg-rose-400 scale-150 shadow-[0_0_15px_rgba(251,113,133,0.5)]'
                    : 'bg-zinc-800 scale-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 컨트롤 패널 */}
        <div className="p-6 bg-zinc-900/50">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <ControlNumber label="재생 마디 (Play Loops)" value={playBars} setter={setPlayBars} min={1} max={16} />
            <ControlNumber label="묵음 마디 (Mute Loops)" value={muteBars} setter={setMuteBars} min={1} max={16} />
          </div>

          {/* 프리셋 선택 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-zinc-400 text-sm font-medium flex items-center gap-1">
                <Settings2 size={16}/> 드럼 패턴
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PATTERNS).map(([key, name]) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    preset === key 
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
                  if (val > 240) val = 240;
                  setBpm(val);
                }}
                className="bg-transparent text-3xl font-bold text-white tracking-tighter w-20 text-right focus:outline-none focus:border-b focus:border-indigo-500 rounded-none border-b border-transparent transition-colors"
                title="클릭하여 숫자 입력"
              />
            </div>
            <input 
              type="range" 
              min="40" 
              max="240" 
              value={bpm} 
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* 재생 버튼 */}
          <button
            onClick={togglePlay}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-xl font-bold transition-all shadow-xl active:scale-[0.98] ${
              isPlaying 
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
      </div>
    </div>
  );
}