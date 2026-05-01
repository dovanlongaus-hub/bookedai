import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------
 * Web Speech API typings (mirrors patterns in chess + homepage search;
 * duplicated inline to keep this controller self-contained).
 * ------------------------------------------------------------------ */
type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

/* ------------------------------------------------------------------
 * Voice picker (exported for unit tests)
 * ------------------------------------------------------------------ */
export const pickMaleVoice = (
  voices: SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | null => {
  if (!voices || voices.length === 0) return null;
  const langPrefix = (locale || 'en-US').split('-')[0].toLowerCase();
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const malePattern = /daniel|aaron|david|ryan|alex|james|microsoft david|google.*male|male/i;
  let male = candidates.find((v) => malePattern.test(v.name));
  if (!male) {
    male = candidates.find((v) => malePattern.test(`${v.name} ${v.voiceURI || ''}`));
  }
  return male || null;
};

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */
export interface MentorVoiceControllerProps {
  /** When true, the controller listens for user speech and emits final transcripts */
  active: boolean;
  /** Called when STT produces a final transcript */
  onTranscript: (text: string) => void;
  /** Optional locale hint, e.g. 'en-US', 'vi-VN'. Defaults to 'en-US'. */
  locale?: string;
  /** When true and a non-empty `speakText` is given, the controller speaks it once via TTS. */
  speakText?: string | null;
  /** Called when TTS finishes or errors */
  onSpeakDone?: () => void;
  /** Disabled UI state (controller renders mic button but doesn't act) */
  disabled?: boolean;
  /** Pass-through className on the wrapper */
  className?: string;
  /** Parent-supplied toggle invoked on mic-button click */
  onToggleActive?: () => void;
}

let warnedNoMaleVoice = false;

export const MentorVoiceController: React.FC<MentorVoiceControllerProps> = ({
  active,
  onTranscript,
  locale = 'en-US',
  speakText = null,
  onSpeakDone,
  disabled = false,
  className,
  onToggleActive,
}) => {
  const [supported, setSupported] = useState<boolean>(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const lastSpokenRef = useRef<string | null>(null);

  // Detect STT support + warm voice list
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as WindowWithSpeechRecognition;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));

    // Voices: getVoices() is async on Chrome — attach voiceschanged once.
    const synth = window.speechSynthesis;
    if (synth) {
      const refresh = () => {
        voicesRef.current = synth.getVoices();
      };
      refresh();
      synth.addEventListener?.('voiceschanged', refresh);
      return () => {
        synth.removeEventListener?.('voiceschanged', refresh);
      };
    }
    return undefined;
  }, []);

  // Drive STT lifecycle off the `active` prop
  useEffect(() => {
    if (!supported || disabled) return;
    if (typeof window === 'undefined') return;
    const w = window as WindowWithSpeechRecognition;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    if (active) {
      const recognition = new Ctor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale;
      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          }
        }
        const trimmed = finalText.trim();
        if (trimmed) onTranscript(trimmed);
      };
      recognition.onerror = () => {
        try { recognition.stop(); } catch { /* ignore */ }
      };
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      try { recognition.start(); } catch { /* already-started races */ }
    }

    return () => {
      const r = recognitionRef.current;
      if (r) {
        try { r.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, [active, supported, disabled, locale, onTranscript]);

  // TTS: speak when `speakText` changes to a new non-empty string
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (!speakText || !speakText.trim()) return;
    if (speakText === lastSpokenRef.current) return;
    lastSpokenRef.current = speakText;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(speakText);
    const voice = pickMaleVoice(voicesRef.current, locale);
    if (voice) {
      utterance.voice = voice;
    } else if (!warnedNoMaleVoice) {
      warnedNoMaleVoice = true;
      // eslint-disable-next-line no-console
      console.warn('MentorVoice: no male voice available; using system default');
    }
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    utterance.lang = locale;
    utterance.onend = () => onSpeakDone?.();
    utterance.onerror = () => onSpeakDone?.();
    synth.speak(utterance);
  }, [speakText, locale, onSpeakDone]);

  // Final unmount cleanup — cancel any in-flight TTS
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || !supported) return;
    onToggleActive?.();
  }, [disabled, supported, onToggleActive]);

  const titleText = !supported
    ? 'Voice not supported in this browser'
    : active
      ? 'Listening…'
      : 'Tap to speak';

  return (
    <button
      type="button"
      className={`aim-mic-button ${className || ''}`.trim()}
      data-active={active}
      disabled={disabled || !supported}
      aria-label={active ? 'Stop listening' : 'Start voice'}
      aria-pressed={active}
      title={titleText}
      onClick={handleClick}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
      </svg>
    </button>
  );
};

export default MentorVoiceController;
