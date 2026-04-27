export const LANGUAGE_META = {
  en: {
    label: "English",
    speechRecognition: "en-IN",
    speechSynthesis: "en-IN",
    deepgram: "en",
  },
  hi: {
    label: "हिंदी",
    speechRecognition: "hi-IN",
    speechSynthesis: "hi-IN",
    deepgram: "hi",
  },
  ta: {
    label: "தமிழ்",
    speechRecognition: "ta-IN",
    speechSynthesis: "ta-IN",
    deepgram: "ta",
  },
  bn: {
    label: "বাংলা",
    speechRecognition: "bn-IN",
    speechSynthesis: "bn-IN",
    deepgram: "bn",
  },
} as const;

export type SupportedLanguage = keyof typeof LANGUAGE_META;
