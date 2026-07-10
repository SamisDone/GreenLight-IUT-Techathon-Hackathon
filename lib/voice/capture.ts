// Web Speech API wrapper.
// Thin layer around webkitSpeechRecognition for continuous voice capture.
// Chrome-only (other browsers may not support it).

// TypeScript doesn't ship Web Speech API types by default
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognitionEvent: any;
    webkitSpeechRecognition: any;
  }
}

// Minimal type declarations for SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}
type CaptureCallbacks = {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  onStateChange: (listening: boolean) => void;
};

let recognition: SpeechRecognition | null = null;
let callbacks: CaptureCallbacks | null = null;
let isListening = false;

/**
 * Check if Web Speech API is available.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Start continuous voice capture.
 */
export function startListening(cbs: CaptureCallbacks): void {
  if (isListening) return;

  if (!isSpeechSupported()) {
    cbs.onError('Speech recognition not supported — use Chrome');
    return;
  }

  const SpeechRecognitionCtor = window.SpeechRecognitionEvent || window.webkitSpeechRecognition;
  recognition = new SpeechRecognitionCtor() as unknown as SpeechRecognition;
  callbacks = cbs;

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1];
    if (last.isFinal) {
      const transcript = last[0].transcript.trim();
      if (transcript && callbacks) {
        callbacks.onTranscript(transcript);
      }
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    // 'no-speech' and 'aborted' are normal when the user pauses — don't surface them
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    if (callbacks) callbacks.onError(event.error);
  };

  recognition.onend = () => {
    // Auto-restart if we're supposed to still be listening
    // (recognition stops after silence in some browsers)
    if (isListening && recognition) {
      try {
        recognition.start();
      } catch {
        // Already started — ignore
      }
    } else {
      isListening = false;
      if (callbacks) callbacks.onStateChange(false);
    }
  };

  try {
    recognition.start();
    isListening = true;
    cbs.onStateChange(true);
  } catch {
    cbs.onError('Failed to start speech recognition');
  }
}

/**
 * Stop voice capture.
 */
export function stopListening(): void {
  isListening = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Already stopped
    }
    recognition = null;
  }
  if (callbacks) {
    callbacks.onStateChange(false);
    callbacks = null;
  }
}

/**
 * Toggle listening on/off.
 */
export function toggleListening(cbs: CaptureCallbacks): void {
  if (isListening) {
    stopListening();
  } else {
    startListening(cbs);
  }
}
