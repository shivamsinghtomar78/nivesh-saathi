export const LANGUAGE_META = {
  en: {
    label: "English",
    speechRecognition: "en-IN",
    speechSynthesis: "en-IN",
    deepgram: "en",
  },
  hi: {
    label: "Hindi",
    speechRecognition: "hi-IN",
    speechSynthesis: "hi-IN",
    deepgram: "hi",
  },
  hinglish: {
    label: "Hinglish",
    speechRecognition: "hi-IN",
    speechSynthesis: "hi-IN",
    deepgram: "hi",
  },
  bho: {
    label: "Bhojpuri",
    speechRecognition: "hi-IN",
    speechSynthesis: "hi-IN",
    deepgram: "hi",
  },
  mr: {
    label: "Marathi",
    speechRecognition: "mr-IN",
    speechSynthesis: "mr-IN",
    deepgram: "hi",
  },
  ta: {
    label: "Tamil",
    speechRecognition: "ta-IN",
    speechSynthesis: "ta-IN",
    deepgram: "ta",
  },
  te: {
    label: "Telugu",
    speechRecognition: "te-IN",
    speechSynthesis: "te-IN",
    deepgram: "te",
  },
} as const;

export type SupportedLanguage = keyof typeof LANGUAGE_META;
