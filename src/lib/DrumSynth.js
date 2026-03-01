// public 디렉토리 내 에셋으로 접근하기 위한 경로 설정
// (Vite 환경에서는 src 안의 assets를 import하거나 public 폴더를 활용할 수 있습니다.
// 여기서는 동적 fetch를 위해 URL을 임포트 방식으로 선언하는 것이 안전합니다.)
import kickUrl from '../assets/sounds/kick.wav';
import snareUrl from '../assets/sounds/snare.wav';
import hihatUrl from '../assets/sounds/hihat.wav';
import openhatUrl from '../assets/sounds/openhat.wav';
import clapUrl from '../assets/sounds/clap.wav';
import tomUrl from '../assets/sounds/tom.wav';
import tinkUrl from '../assets/sounds/tink.wav';

export class DrumSynth {
  constructor() {
    this.ctx = null;
    this.buffers = {
      kick: null,
      snare: null,
      hihat: null,
      openhat: null,
      clap: null,
      tom: null,
      tink: null
    };
    this.isLoaded = false;
  }

  async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!this.isLoaded) {
      await this.loadAllSamples();
      this.isLoaded = true;
    }
  }

  async loadSample(name, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers[name] = audioBuffer;
    } catch (e) {
      console.error(`Failed to load drum sample: ${name}`, e);
    }
  }

  async loadAllSamples() {
    const promises = [
      this.loadSample('kick', kickUrl),
      this.loadSample('snare', snareUrl),
      this.loadSample('hihat', hihatUrl),
      this.loadSample('openhat', openhatUrl),
      this.loadSample('clap', clapUrl),
      this.loadSample('tom', tomUrl),
      this.loadSample('tink', tinkUrl)
    ];
    await Promise.all(promises);
  }

  playSound(bufferName, time, volume = 1.0) {
    if (!this.ctx || !this.buffers[bufferName]) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[bufferName];

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    source.start(time);
  }

  // 기존 API 호환성을 유지하기 위한 래핑 메서드들
  playKick(time) {
    this.playSound('kick', time, 1.2); // 킥은 볼륨을 조금 높게
  }

  playSnare(time) {
    this.playSound('snare', time, 1.0);
  }

  playClosedHihat(time) {
    this.playSound('hihat', time, 0.7);
  }

  playOpenHihat(time) {
    this.playSound('openhat', time, 0.7);
  }

  // 새로 추가된 사운드용 메서드
  playClap(time) {
    this.playSound('clap', time, 1.0);
  }

  playTom(time) {
    this.playSound('tom', time, 1.0);
  }

  playTink(time) {
    this.playSound('tink', time, 0.8);
  }

  // 하위 호환성을 위해 유지
  playHihat(time) {
    this.playClosedHihat(time);
  }
}

export const drumSynth = new DrumSynth();
