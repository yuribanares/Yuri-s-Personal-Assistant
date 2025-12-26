export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export interface SpeechServices {
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onEnd: () => void) => void;
  stopSpeaking: () => void;
  isSupported: boolean;
}
