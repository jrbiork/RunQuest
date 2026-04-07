import { RefObject } from 'react';
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';

export type ShareCardOptions = {
  /** Wait before capture (e.g. let MapView tiles render). */
  delayMs?: number;
};

/**
 * Captures a ViewShot ref as a PNG, optionally saves it to the camera roll,
 * then opens the native share sheet (or Instagram Stories deep-link on iOS).
 */
export async function shareCard(
  viewShotRef: RefObject<ViewShot | null>,
  options?: ShareCardOptions,
): Promise<void> {
  const delayMs = options?.delayMs ?? 0;
  if (delayMs > 0) {
    await new Promise((r) => setTimeout(r, delayMs));
  }

  const shot = viewShotRef.current;
  if (!shot?.capture) {
    Alert.alert('Share failed', 'Share card is not ready yet. Please try again.');
    return;
  }

  let uri: string;
  try {
    uri = await shot.capture();
  } catch {
    Alert.alert('Share failed', 'Could not capture the share card. Please try again.');
    return;
  }

  // Try to save to camera roll (request permission first; silently skip if denied)
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(uri);
    }
  } catch {
    // Non-fatal — media library might not be available in all envs
  }

  // Check if sharing is available
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert(
      'Sharing not available',
      'Image saved to your camera roll instead.',
    );
    return;
  }

  // On iOS, attempt to open Instagram Stories deep-link first
  if (Platform.OS === 'ios') {
    try {
      const { Linking } = await import('react-native');
      const igUrl = `instagram-stories://share?backgroundImage=${encodeURIComponent(uri)}`;
      const canOpenIG = await Linking.canOpenURL(igUrl);
      if (canOpenIG) {
        await Linking.openURL(igUrl);
        return;
      }
    } catch {
      // Fall through to system share sheet
    }
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Share your run with RunQuest',
    UTI: 'public.png',
  });
}
