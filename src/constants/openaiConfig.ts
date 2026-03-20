/**
 * OpenAI API configuration.
 *
 * Replace OPENAI_API_KEY with your key from https://platform.openai.com/api-keys
 *
 * The TTS service will silently skip voice cues if no key is provided,
 * so the app works normally without one.
 */
export const OPENAI_API_KEY = 'REMOVED';

// Voice used for in-run cues. "onyx" sounds deep and authoritative (field-comms feel).
// Options: alloy | echo | fable | onyx | nova | shimmer
export const TTS_VOICE = 'onyx';

// tts-1 = fast / low-latency (ideal for real-time cues)
// tts-1-hd = higher quality but slower
export const TTS_MODEL = 'tts-1';
