export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

// Voice used for in-run cues. "onyx" sounds deep and authoritative (field-comms feel).
// Options: alloy | echo | fable | onyx | nova | shimmer
export const TTS_VOICE = 'onyx';

// tts-1 = fast / low-latency (ideal for real-time cues)
// tts-1-hd = higher quality but slower
export const TTS_MODEL = 'tts-1';
