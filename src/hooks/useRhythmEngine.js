import { useState, useEffect, useRef, useCallback } from 'react';
import { drumSynth } from '../lib/DrumSynth';

export function useRhythmEngine() {
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

  // 재생 중 실시간 반영을 위한 Refs
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

  // 다음 노트의 시간을 계산
  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTime.current += secondsPerBeat;
    currentBeatInBar.current++;

    if (currentBeatInBar.current === 4) {
      currentBeatInBar.current = 0;
      currentBarCount.current++;

      if (phaseRef.current === 'play' && currentBarCount.current >= playBarsRef.current) {
        phaseRef.current = 'mute';
        currentBarCount.current = 0;
      } else if (phaseRef.current === 'mute' && currentBarCount.current >= muteBarsRef.current) {
        phaseRef.current = 'play';
        currentBarCount.current = 0;
      }
    }
  }, []);

  // 노트 스케줄링
  const scheduleNote = useCallback((beatNumber, time, phase, barIndex) => {
    drawQueue.current.push({ note: beatNumber, time, phase, bar: barIndex });

    if (phase === 'play') {
      const p = presetRef.current;

      drumSynth.playHihat(time);

      if (p === 'basic') {
        if (beatNumber === 0 || beatNumber === 2) drumSynth.playKick(time);
        if (beatNumber === 1 || beatNumber === 3) drumSynth.playSnare(time);
      } else if (p === 'four') {
        drumSynth.playKick(time);
        if (beatNumber === 1 || beatNumber === 3) drumSynth.playSnare(time);
      } else if (p === 'half') {
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

  return {
    state: { isPlaying, bpm, playBars, muteBars, preset, currentPhase, activeBeat, currentBarIndex },
    actions: { setBpm, setPlayBars, setMuteBars, setPreset, togglePlay }
  };
}
