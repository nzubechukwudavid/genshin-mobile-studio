import { registerPlugin, Capacitor } from '@capacitor/core';
import { RawRecording, BgmTrack } from '../types';

export interface AbyssNativePlugin {
  scanRecordings(options: { path?: string }): Promise<{
    recordings: RawRecording[];
    scannedPath: string;
    totalFound: number;
    error?: string;
  }>;
  scanMusic(options: { path?: string }): Promise<{
    tracks: BgmTrack[];
    scannedPath: string;
    totalFound: number;
    error?: string;
  }>;
  checkShizuku(): Promise<{ isRunning: boolean; isGranted: boolean }>;
  requestShizuku(): Promise<{ requested: boolean }>;
  saveVideoToGallery(options: {
    base64Data: string;
    fileName: string;
  }): Promise<{ success: boolean; savedPath: string }>;
}

export const AbyssNative = registerPlugin<AbyssNativePlugin>('AbyssNative');

export const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Automatically scans device screen recordings from /sdcard/DCIM/ScreenRecorder
 */
export async function autoScanRecordings(path: string = '/sdcard/DCIM/ScreenRecorder'): Promise<RawRecording[]> {
  if (!isNativeAndroid) {
    console.log('[NativeBridge] Running in browser - auto-scan skipped (use file picker)');
    return [];
  }

  try {
    const res = await AbyssNative.scanRecordings({ path });
    console.log(`[NativeBridge] Auto-scanned ${res.recordings.length} recordings from ${res.scannedPath}`);
    return res.recordings || [];
  } catch (err) {
    console.warn('[NativeBridge] Scan recordings error:', err);
    return [];
  }
}

/**
 * Recursively crawls and indexes music files from /sdcard/Music
 */
export async function autoScanMusic(path: string = '/sdcard/Music'): Promise<BgmTrack[]> {
  if (!isNativeAndroid) {
    console.log('[NativeBridge] Running in browser - music scan skipped (use file picker)');
    return [];
  }

  try {
    const res = await AbyssNative.scanMusic({ path });
    console.log(`[NativeBridge] Auto-scanned ${res.tracks.length} BGM tracks from ${res.scannedPath}`);
    return res.tracks || [];
  } catch (err) {
    console.warn('[NativeBridge] Scan music error:', err);
    return [];
  }
}

/**
 * Checks and requests real Shizuku binder permissions
 */
export async function checkAndRequestShizuku(): Promise<{ isRunning: boolean; isGranted: boolean }> {
  if (!isNativeAndroid) {
    return { isRunning: true, isGranted: true }; // Emulated in web
  }

  try {
    const status = await AbyssNative.checkShizuku();
    if (status.isRunning && !status.isGranted) {
      await AbyssNative.requestShizuku();
    }
    return status;
  } catch (err) {
    console.warn('[NativeBridge] Shizuku check error:', err);
    return { isRunning: false, isGranted: false };
  }
}

/**
 * Saves a rendered video Blob directly to Android Gallery (Movies/GenshinMobileStudio/)
 */
export async function saveRenderedVideoToGallery(blob: Blob, fileName: string): Promise<string> {
  if (!isNativeAndroid) {
    // Web fallback: trigger browser download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return url;
  }

  // Convert blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await AbyssNative.saveVideoToGallery({ base64Data, fileName });
        resolve(res.savedPath);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
