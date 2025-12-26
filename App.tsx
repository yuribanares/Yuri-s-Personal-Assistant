import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppStatus, Message } from './types';
import { generateGeminiResponse } from './services/gemini';
import { SpeechService, checkSpeechSupport } from './services/speech';
import ChatInterface from './components/ChatInterface';
import { Mic, Square, Trash2, Download, Code } from 'lucide-react';

const PYTHON_SCRIPT_CONTENT = `import os
import time
import speech_recognition as sr
import pyttsx3
import google.generativeai as genai

# Setup instructions:
# 1. pip install speechrecognition pyttsx3 google-generativeai pyaudio
# 2. Set your API Key in the environment variable 'API_KEY' or replace below.

API_KEY = os.getenv("API_KEY") # or "YOUR_ACTUAL_KEY_HERE"

def main():
    if not API_KEY:
        print("Please provide a Google GenAI API Key.")
        return

    # Configure GenAI
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    chat = model.start_chat(history=[])

    # Configure Text-to-Speech
    engine = pyttsx3.init()
    
    # Configure Speech-to-Text
    recognizer = sr.Recognizer()

    def speak(text):
        print(f"Assistant: {text}")
        engine.say(text)
        engine.runAndWait()

    speak("Hello! I am your Python Desktop Assistant. How can I help?")

    while True:
        try:
            with sr.Microphone() as source:
                print("Listening...")
                recognizer.adjust_for_ambient_noise(source)
                audio = recognizer.listen(source, timeout=5)
                
                text = recognizer.recognize_google(audio)
                print(f"You: {text}")

                if "quit" in text.lower() or "exit" in text.lower():
                    speak("Goodbye!")
                    break

                response = chat.send_message(text)
                speak(response.text)

        except sr.UnknownValueError:
            pass # No speech detected
        except sr.RequestError as e:
            print(f"Could not request results; {e}")
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
`;

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  
  // Refs to maintain instance across renders without triggering re-renders
  const speechService = useRef<SpeechService | null>(null);

  // Initialize Speech Service
  useEffect(() => {
    if (!checkSpeechSupport()) {
      const msg = "Sorry, your browser does not support Web Speech API. Please use Chrome, Edge or Safari.";
      alert(msg);
      setMessages([{ id: 'error', role: 'assistant', text: msg, timestamp: Date.now() }]);
      return;
    }

    speechService.current = new SpeechService(
      // On Result
      (text) => handleUserVoiceInput(text),
      // On End (Listening)
      () => {
        setStatus((prev) => (prev === AppStatus.LISTENING ? AppStatus.THINKING : prev));
      },
      // On Error
      (err) => {
        console.error("Speech Error:", err);
        setStatus(AppStatus.IDLE);
      }
    );

    return () => {
        speechService.current?.stopListening();
        speechService.current?.stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserVoiceInput = useCallback(async (text: string) => {
    if (!text.trim()) {
        setStatus(AppStatus.IDLE);
        return;
    }

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStatus(AppStatus.THINKING);

    // 2. Get AI Response
    // Pass current messages (excluding the one we just added to state, as that is async)
    const aiText = await generateGeminiResponse(messages, text);

    // 3. Add AI Message
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: aiText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    // 4. Speak Response
    setStatus(AppStatus.SPEAKING);
    speechService.current?.speak(aiText, () => {
      setStatus(AppStatus.IDLE);
    });
  }, [messages]);

  const toggleListening = () => {
    if (status === AppStatus.IDLE) {
      setStatus(AppStatus.LISTENING);
      speechService.current?.startListening();
    } else if (status === AppStatus.LISTENING) {
      setStatus(AppStatus.IDLE);
      speechService.current?.stopListening();
    } else if (status === AppStatus.SPEAKING) {
      setStatus(AppStatus.IDLE);
      speechService.current?.stopSpeaking();
    }
  };

  const resetChat = () => {
      setMessages([]);
      speechService.current?.stopSpeaking();
      setStatus(AppStatus.IDLE);
  };

  const downloadPythonScript = () => {
    const blob = new Blob([PYTHON_SCRIPT_CONTENT], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Gemini Assistant</h1>
        </div>
        <div className="flex gap-2">
            <button
                onClick={downloadPythonScript}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-blue-200"
                title="Download main.py"
            >
                <Code className="w-4 h-4" />
                <span className="hidden sm:inline">Download .py</span>
                <Download className="w-4 h-4 opacity-50" />
            </button>
            <button 
                onClick={resetChat}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                title="Clear Chat"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Chat Area */}
      <ChatInterface messages={messages} />

      {/* Status Bar */}
      <div className="bg-slate-900 px-6 pb-2 pt-2">
        <div className="flex items-center justify-center h-8">
            {status === AppStatus.LISTENING && (
                <span className="text-blue-400 text-sm font-medium animate-pulse">Listening...</span>
            )}
            {status === AppStatus.THINKING && (
                <span className="text-amber-400 text-sm font-medium animate-pulse">Thinking...</span>
            )}
            {status === AppStatus.SPEAKING && (
                <span className="text-green-400 text-sm font-medium">Speaking...</span>
            )}
             {status === AppStatus.IDLE && messages.length > 0 && (
                <span className="text-slate-500 text-sm">Idle</span>
            )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-slate-800/30 backdrop-blur-md border-t border-slate-700/50">
        <div className="max-w-3xl mx-auto flex justify-center">
            <button
                onClick={toggleListening}
                className={`
                    relative group flex items-center justify-center w-20 h-20 rounded-full shadow-xl transition-all duration-300
                    ${status === AppStatus.LISTENING ? 'bg-red-500 hover:bg-red-600 scale-110 ring-4 ring-red-500/30' : ''}
                    ${status === AppStatus.SPEAKING ? 'bg-slate-700 hover:bg-slate-600 ring-2 ring-green-500' : ''}
                    ${status === AppStatus.IDLE ? 'bg-blue-600 hover:bg-blue-500 hover:scale-105' : ''}
                    ${status === AppStatus.THINKING ? 'bg-amber-600 cursor-wait' : ''}
                `}
                disabled={status === AppStatus.THINKING}
            >
                {status === AppStatus.LISTENING ? (
                     <Square className="w-8 h-8 text-white fill-current" />
                ) : status === AppStatus.SPEAKING ? (
                    <Square className="w-8 h-8 text-white fill-current" />
                ) : (
                    <Mic className={`w-9 h-9 text-white ${status === AppStatus.THINKING ? 'animate-bounce' : ''}`} />
                )}
                
                {/* Ripple Effect when listening */}
                {status === AppStatus.LISTENING && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-20"></span>
                )}
            </button>
        </div>
        <p className="text-center text-slate-500 text-xs mt-4">
            {status === AppStatus.IDLE ? "Tap to speak" : "Tap to stop"}
        </p>
      </div>
    </div>
  );
};

export default App;
