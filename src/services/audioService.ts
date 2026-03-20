import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * Play the goal-reached chime and trigger haptic feedback.
 * Gracefully handles missing file or permission issues so the run
 * screen is never broken by audio errors.
 */
export async function playGoalReachedSound(): Promise<void> {
  // Haptic first — always works, no permissions needed
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }

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
