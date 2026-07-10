'use client';

// Custom React hook for Web Speech API voice capture.
// Handles auto-restart, cleanup, interim results, and error recovery.

import { useState, useRef, useCallback, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  // Clean up any pending restart timer
  const clearRestart = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // Create a fresh recognition instance
  const createRecognition = useCallback(() => {
    if (!supported) return null;

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript.trim();
        } else {
          interimText += result[0].transcript;
        }
      }

      if (interimText) {
        setInterim(interimText);
      }

      if (finalText) {
        setInterim('');
        setTranscript(finalText);
        if (onResultRef.current) {
          onResultRef.current(finalText);
        }
      }
    };

    rec.onerror = (event: any) => {
      const err = event.error;
      // These are normal — Chrome fires them on silence or when restarting
      if (err === 'no-speech' || err === 'aborted') return;

      if (err === 'not-allowed') {
        setError('Microphone access denied');
        shouldListenRef.current = false;
        setListening(false);
        return;
      }

      setError(err);
    };

    rec.onend = () => {
      // Auto-restart if we're supposed to keep listening.
      // Small delay prevents rapid-fire restart loops that exhaust the API.
      if (shouldListenRef.current) {
        clearRestart();
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              // Create a fresh instance if the old one is dead
              const fresh = createRecognition();
              if (fresh) {
                recognitionRef.current = fresh;
                try { fresh.start(); } catch { /* give up */ }
              }
            }
          }
        }, 300);
      } else {
        setListening(false);
      }
    };

    return rec;
  }, [supported, clearRestart]);

  const start = useCallback((onResult: (text: string) => void) => {
    if (!supported) {
      setError('Speech recognition not supported — use Chrome');
      return;
    }

    onResultRef.current = onResult;
    shouldListenRef.current = true;
    setError(null);

    // Tear down any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ok */ }
    }

    const rec = createRecognition();
    if (!rec) return;

    recognitionRef.current = rec;

    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Failed to start');
    }
  }, [supported, createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    clearRestart();

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
      recognitionRef.current = null;
    }

    setListening(false);
    setInterim('');
  }, [clearRestart]);

  const toggle = useCallback((onResult: (text: string) => void) => {
    if (listening) {
      stop();
    } else {
      start(onResult);
    }
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearRestart();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ok */ }
      }
    };
  }, [clearRestart]);

  return { listening, transcript, interim, error, supported, start, stop, toggle };
}
