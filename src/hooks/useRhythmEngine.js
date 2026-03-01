import { useState, useEffect, useRef, useCallback } from 'react';
import { drumSynth } from '../lib/DrumSynth';
import { PATTERNS } from '../constants/patterns';

export function useRhythmEngine() {
  // 상태 관리
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [playBars, setPlayBars] = useState(4);
  const [muteBars, setMuteBars] = useState(4);
  const [preset, setPreset] = useState('standard_8beat');
  const [isReady, setIsReady] = useState(false); // 샘플 로딩 상태

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
  const currentTick = useRef(0); // 0 ~ 15 (16비트 레졸루션)
  const currentBarCount = useRef(0);
  const phaseRef = useRef('play'); // 'play' or 'mute'

  // UI 동기화 큐
  const drawQueue = useRef([]);
  const animationRef = useRef(null);

  // 컴포넌트 마운트 시 오디오 버퍼 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await drumSynth.init(); // 버퍼 다운로드 및 디코딩 대기
        if (mounted) setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize drum samples:", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 다음 노트의 시간을 계산
  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    const secondsPerTick = secondsPerBeat / 4.0;

    nextNoteTime.current += secondsPerTick;
    currentTick.current++;

    if (currentTick.current === 16) {
      currentTick.current = 0;
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
  const scheduleNote = useCallback((tickNumber, time, phase, barIndex) => {
    if (tickNumber % 4 === 0) {
      const visualBeat = Math.floor(tickNumber / 4);
      drawQueue.current.push({ note: visualBeat, time, phase, bar: barIndex });
    } else {
      drawQueue.current.push({ note: -1, time, phase, bar: barIndex });
    }

    if (phase === 'play') {
      const p = presetRef.current;
      const pattern = PATTERNS[p];
      if (!pattern) return;

      const sounds = pattern.sequence[tickNumber] || [];

      sounds.forEach(sound => {
        if (sound === 'K') drumSynth.playKick(time);
        if (sound === 'S') drumSynth.playSnare(time);
        if (sound === 'H') drumSynth.playClosedHihat(time);
        if (sound === 'O') drumSynth.playOpenHihat(time);
        if (sound === 'C') drumSynth.playClap(time);
        if (sound === 'T') drumSynth.playTom(time);
        if (sound === 'I') drumSynth.playTink(time);
      });
    }
  }, []);

  // 오디오 스케줄러 루프
  const scheduler = useCallback(() => {
    if (!drumSynth.ctx) return;

    while (nextNoteTime.current < drumSynth.ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentTick.current, nextNoteTime.current, phaseRef.current, currentBarCount.current);
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
      if (event.note !== -1) {
        setActiveBeat(event.note);
      }
      setCurrentPhase(event.phase);
      setCurrentBarIndex(event.bar);
    }
    animationRef.current = requestAnimationFrame(draw);
  }, []);

  // 재생 / 정지 토글
  const togglePlay = async () => {
    if (!isReady) return; // 로딩 중에는 아무 동작 안함

    if (isPlaying) {
      setIsPlaying(false);
      clearTimeout(timerRef.current);
      cancelAnimationFrame(animationRef.current);
      setActiveBeat(-1);
      drawQueue.current = [];
    } else {
      // User gesture로 인해 AudioContext 확실히 활성화
      if (drumSynth.ctx.state === 'suspended') {
        await drumSynth.ctx.resume();
      }

      setIsPlaying(true);
      currentTick.current = 0;
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
    state: { isPlaying, bpm, playBars, muteBars, preset, currentPhase, activeBeat, currentBarIndex, isReady },
    actions: { setBpm, setPlayBars, setMuteBars, setPreset, togglePlay }
  };
}
