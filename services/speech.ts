// Type definitions for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const checkSpeechSupport = (): boolean => {
  const win = window as unknown as IWindow;
  return !!(win.SpeechRecognition || win.webkitSpeechRecognition) && !!window.speechSynthesis;
};

export class SpeechService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private onResultCallback: (text: string) => void;
  private onEndCallback: () => void;
  private onErrorCallback: (error: string) => void;

  constructor(
    onResult: (text: string) => void,
    onEnd: () => void,
    onError: (error: string) => void
  ) {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    this.synthesis = window.speechSynthesis;
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.onResultCallback(transcript);
      };

      this.recognition.onerror = (event: any) => {
        // Ignore 'no-speech' errors as they just mean silence
        if (event.error !== 'no-speech') {
          this.onErrorCallback(event.error);
        }
        this.onEndCallback();
      };

      this.recognition.onend = () => {
        this.onEndCallback();
      };
    }
  }

  public startListening() {
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Recognition already started or error:", e);
      }
    } else {
      this.onErrorCallback("Speech recognition not supported in this browser.");
    }
  }

  public stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  public speak(text: string, onEnd: () => void) {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = onEnd;
    utterance.onerror = (e) => {
      console.error("TTS Error", e);
      onEnd();
    };

    // Try to select a nice voice
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English")) || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
  }
}
