import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { OPENAI_API_KEY, TTS_VOICE, TTS_MODEL } from '../constants/openaiConfig';

// Mute flag — set externally by the user store to avoid circular imports
let _muted = false;
export function setAudioMutedFlag(muted: boolean) { _muted = muted; }
export function isAudioMuted() { return _muted; }

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
export async function speakRunCue(line: string): Promise<void> {
  if (!OPENAI_API_KEY || _muted) return;

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
        input: line,
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
