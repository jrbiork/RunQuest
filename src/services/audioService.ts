import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { OPENAI_API_KEY, TTS_VOICE, TTS_MODEL } from '../constants/openaiConfig';

// Mute flag — set externally by the user store to avoid circular imports
let _muted = false;
export function setAudioMutedFlag(muted: boolean) { _muted = muted; }
export function isAudioMuted() { return _muted; }

let onboardingAmbientPlayer: AudioPlayer | null = null;
const ONBOARDING_AMBIENT_VOLUME = 0.32;

/**
 * Looped ambient bed for intro + onboarding (see `app/intro.tsx`, `app/onboarding/_layout.tsx`).
 * Replace `assets/sounds/onboarding.mp3` to change the mood; playback stops when
 * onboarding completes and the user enters the main app.
 */
export async function startOnboardingAmbient(): Promise<void> {
  if (_muted) return;
  if (onboardingAmbientPlayer) {
    try {
      if (!onboardingAmbientPlayer.playing) onboardingAmbientPlayer.play();
    } catch {
      // ignore
    }
    return;
  }
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/onboarding.mp3'),
    );
    player.loop = true;
    player.volume = ONBOARDING_AMBIENT_VOLUME;
    player.play();
    onboardingAmbientPlayer = player;
  } catch {
    // optional — never block intro/onboarding
  }
}

export function stopOnboardingAmbient(): void {
  if (!onboardingAmbientPlayer) return;
  try {
    onboardingAmbientPlayer.pause();
    onboardingAmbientPlayer.release();
  } catch {
    // ignore
  }
  onboardingAmbientPlayer = null;
}

/** When global mute toggles while ambient may be playing. */
export function syncOnboardingAmbientWithMute(): void {
  if (!onboardingAmbientPlayer) return;
  try {
    if (_muted) {
      onboardingAmbientPlayer.pause();
    } else {
      onboardingAmbientPlayer.volume = ONBOARDING_AMBIENT_VOLUME;
      onboardingAmbientPlayer.play();
    }
  } catch {
    // ignore
  }
}

/**
 * Play the goal-reached chime and trigger haptic feedback.
 * Gracefully handles missing file or permission issues so the run
 * screen is never broken by audio errors.
 */
export async function playGoalReachedSound(): Promise<void> {
  // Haptic first — always works regardless of mute
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }

  if (_muted) return;

  // Audio chime
  try {
    await setAudioModeAsync({ playsInSilentMode: true });

    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/goal_reached.wav'),
    );

    player.play();

    // Release the player after the chime duration (~1 s)
    setTimeout(() => {
      try { player.release(); } catch { /* ignore */ }
    }, 2000);
  } catch {
    // Silent fail — audio is a nice-to-have
  }
}

/** Mission failed (e.g. time expired) — error haptic + short chime. */
export async function playMissionFailedSound(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // ignore
  }
  if (_muted) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/goal_reached.wav'),
    );
    player.volume = 0.35;
    player.play();
    setTimeout(() => {
      try { player.release(); } catch { /* ignore */ }
    }, 2000);
  } catch {
    // ignore
  }
}

/**
 * Speak a narrative in-run voice cue via the OpenAI TTS API.
 *
 * Flow:
 *  1. POST text to /v1/audio/speech → mp3 bytes
 *  2. Write to a temp file in the app's cache directory
 *  3. Play with expo-audio's createAudioPlayer
 *  4. Delete the temp file after playback
 *
 * Silent-fails on any error so it never disrupts the run screen.
 * Requires OPENAI_API_KEY to be set in src/constants/openaiConfig.ts.
 */
/** Keep TTS input short; one sentence is ideal for in-run cues. */
const MAX_TTS_CHARS = 220;

export async function speakRunCue(line: string): Promise<void> {
  if (!OPENAI_API_KEY || _muted) return;

  const text =
    line.length > MAX_TTS_CHARS ? `${line.slice(0, MAX_TTS_CHARS - 1).trimEnd()}…` : line;

  try {
    // 1. Call OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) return;

    // 2. Write audio bytes to a temp file
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // Convert to base64 for FileSystem.writeAsStringAsync
    let binary = '';
    uint8.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    const tempPath = `${FileSystem.cacheDirectory}rq_cue_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 3. Play
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer({ uri: tempPath });
    player.play();

    // 4. Clean up temp file after playback (estimate ~3 s for short phrases)
    setTimeout(async () => {
      try { player.release(); } catch { /* ignore */ }
      try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch { /* ignore */ }
    }, 5000);

  } catch {
    // Silent fail — TTS is a nice-to-have, never breaks the run
  }
}
