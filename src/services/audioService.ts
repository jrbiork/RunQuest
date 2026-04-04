import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { getBundledRunCueIndex } from '../audio/bundledRunCueStrings';
import { RUN_CUE_REQUIRES } from '../audio/runCueRequires';
import { OPENAI_API_KEY, TTS_VOICE, TTS_MODEL } from '../constants/openaiConfig';

// Mute flag — set externally by the user store to avoid circular imports
let _muted = false;
export function setAudioMutedFlag(muted: boolean) { _muted = muted; }
export function isAudioMuted() { return _muted; }

/**
 * Between cues the heartbeat uses mixWithOthers so Spotify / Apple Music play
 * at full volume. Just before each cue we switch to duckOthers — iOS lowers
 * other apps while the voice plays — then restore mixWithOthers immediately
 * after the clip finishes so music returns to full volume.
 */
const RUN_IDLE_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'mixWithOthers' as const,
  allowsRecording: false,
};

const RUN_CUE_MODE = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'duckOthers' as const,
  allowsRecording: false,
};

// Count of cues currently playing. When it drops to zero we restore idle mode.
let _activeCues = 0;

function _onCueFinished(): void {
  _activeCues = Math.max(0, _activeCues - 1);
  if (_activeCues === 0 && _runHeartbeat) {
    setAudioModeAsync(RUN_IDLE_MODE).catch(() => {});
  }
}

/** Keep session alive between short clips so iOS doesn't tear it down mid-run. */
const RUN_CUE_PLAYER_OPTIONS = { keepAudioSessionActive: true as const };

function releaseRunAudioPlayer(
  player: ReturnType<typeof createAudioPlayer>,
  delayMs: number,
  tempFile?: string,
): void {
  setTimeout(async () => {
    try {
      player.release();
    } catch {
      // ignore
    }
    if (tempFile) {
      try {
        await FileSystem.deleteAsync(tempFile, { idempotent: true });
      } catch {
        // ignore
      }
    }
  }, delayMs);
}

// ─── Run audio session heartbeat ────────────────────────────────────────────
// A near-silent looping player keeps AVAudioSession legitimately alive for the
// entire run. Without it, iOS suspends the audio session between cues and the
// next cue can't start from the background / locked screen.

let _runHeartbeat: ReturnType<typeof createAudioPlayer> | null = null;

/**
 * Call when a run starts. Configures the audio mode AND starts a near-silent
 * looping heartbeat that holds AVAudioSession open so cues can play at any time,
 * even when the screen is locked or the app is minimised.
 */
export async function ensureRunPlaybackAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync(RUN_IDLE_MODE);
  } catch {
    return;
  }

  if (_runHeartbeat) return; // already running
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _runHeartbeat = createAudioPlayer(require('../../assets/sounds/silence.wav'), {
      keepAudioSessionActive: true,
    });
    _runHeartbeat.loop = true;
    _runHeartbeat.volume = 0;
    _runHeartbeat.play();
  } catch {
    _runHeartbeat = null;
  }
}

/** Call when the run ends / is aborted to release the session heartbeat. */
export function stopRunPlaybackAudioMode(): void {
  if (!_runHeartbeat) return;
  try {
    _runHeartbeat.pause();
    _runHeartbeat.release();
  } catch {
    // ignore
  }
  _runHeartbeat = null;
}

let onboardingAmbientPlayer: ReturnType<typeof createAudioPlayer> | null = null;
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
    await setAudioModeAsync(RUN_CUE_MODE);
    _activeCues++;

    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/goal_reached.wav'),
      RUN_CUE_PLAYER_OPTIONS,
    );

    player.play();
    releaseRunAudioPlayer(player, 2000);
    setTimeout(_onCueFinished, 2000);
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
    await setAudioModeAsync(RUN_CUE_MODE);
    _activeCues++;
    const player = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/sounds/goal_reached.wav'),
      RUN_CUE_PLAYER_OPTIONS,
    );
    player.volume = 0.35;
    player.play();
    releaseRunAudioPlayer(player, 2000);
    setTimeout(_onCueFinished, 2000);
  } catch {
    // ignore
  }
}

/**
 * In-run voice cue: bundled MP3 when the line matches `bundledRunCueStrings`, else OpenAI TTS (if key set).
 * Silent-fails on any error so it never disrupts the run screen.
 */
const MAX_TTS_CHARS = 220;

export async function speakRunCue(line: string): Promise<void> {
  if (_muted) return;

  const bundledIdx = getBundledRunCueIndex(line);

  if (bundledIdx !== undefined) {
    const source = RUN_CUE_REQUIRES[bundledIdx];
    if (source !== undefined) {
      try {
        await setAudioModeAsync(RUN_CUE_MODE);
        _activeCues++;
        const player = createAudioPlayer(source, RUN_CUE_PLAYER_OPTIONS);
        player.play();
        releaseRunAudioPlayer(player, 6000);
        setTimeout(_onCueFinished, 6000);
        return;
      } catch {
        // fall through to network TTS
      }
    }
  }

  if (!OPENAI_API_KEY) {
    return;
  }

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
    await setAudioModeAsync(RUN_CUE_MODE);
    _activeCues++;
    const player = createAudioPlayer({ uri: tempPath }, RUN_CUE_PLAYER_OPTIONS);
    player.play();
    releaseRunAudioPlayer(player, 5000, tempPath);
    setTimeout(_onCueFinished, 5000);

  } catch {
    // ignore
  }
}
