import { registerPlugin, Capacitor } from '@capacitor/core';
import { RawRecording, BgmTrack } from '../types';

export interface AbyssNativePlugin {
  requestPermissions(): Promise<{ mediaGranted: boolean; allFilesGranted: boolean }>;
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
  executeShizukuCommand(options: { command: string }): Promise<{ started: boolean }>;
  startSaveVideo(options: { fileName: string }): Promise<{ started: boolean; targetPath: string }>;
  appendVideoChunk(options: { chunkBase64: string }): Promise<{ bytesWritten: number }>;
  finishSaveVideo(options: { fileName: string }): Promise<{ success: boolean; savedPath: string; fileSizeMb: number }>;
}

export const AbyssNative = registerPlugin<AbyssNativePlugin>('AbyssNative');

export const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Requests device storage permissions (media & all-files access)
 */
export async function checkAndRequestPermissions(): Promise<{ mediaGranted: boolean; allFilesGranted: boolean }> {
  if (!isNativeAndroid) {
    return { mediaGranted: true, allFilesGranted: true };
  }
  try {
    return await AbyssNative.requestPermissions();
  } catch (err) {
    console.warn('[NativeBridge] requestPermissions error:', err);
    return { mediaGranted: false, allFilesGranted: false };
  }
}

/**
 * Automatically scans device screen recordings from storage
 */
export async function autoScanRecordings(path: string = '/sdcard/DCIM/ScreenRecorder'): Promise<RawRecording[]> {
  if (!isNativeAndroid) {
    console.log('[NativeBridge] Running in browser - auto-scan skipped (use file picker)');
    return [];
  }

  try {
    const res = await AbyssNative.scanRecordings({ path });
    console.log(`[NativeBridge] Auto-scanned ${res.recordings?.length || 0} recordings from ${res.scannedPath}`);
    const items = res.recordings || [];
    return items.map((r) => ({
      ...r,
      objectUrl: Capacitor.convertFileSrc(r.path)
    }));
  } catch (err) {
    console.warn('[NativeBridge] Scan recordings error:', err);
    return [];
  }
}

/**
 * Recursively crawls and indexes music files from storage with subfolders
 */
export async function autoScanMusic(path: string = '/sdcard/Music'): Promise<BgmTrack[]> {
  if (!isNativeAndroid) {
    console.log('[NativeBridge] Running in browser - music scan skipped (use file picker)');
    return [];
  }

  try {
    const res = await AbyssNative.scanMusic({ path });
    console.log(`[NativeBridge] Auto-scanned ${res.tracks?.length || 0} BGM tracks from ${res.scannedPath}`);
    const items = res.tracks || [];
    return items.map((t) => ({
      ...t,
      audioUrl: Capacitor.convertFileSrc(t.path)
    }));
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
 * Executes a hardware script directly via Shizuku shell
 */
export async function executeShizukuScript(command: string): Promise<boolean> {
  if (!isNativeAndroid) {
    console.log('[NativeBridge] Web execution emulated for Shizuku:', command);
    return true;
  }
  try {
    const res = await AbyssNative.executeShizukuCommand({ command });
    return res.started;
  } catch (err) {
    console.error('[NativeBridge] Execute Shizuku script error:', err);
    throw err;
  }
}

/**
 * Saves a rendered video Blob directly to Android Gallery in 2MB chunks.
 * Eliminates JavaScript heap memory leaks and prevents Android WebView out-of-memory crashes.
 */
export async function saveRenderedVideoToGallery(
  blob: Blob,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<string> {
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

  const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB slices
  const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);

  // Initialize native file writer
  await AbyssNative.startSaveVideo({ fileName });

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, blob.size);
    const slice = blob.slice(start, end);

    const base64Chunk = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        // Strip data:*;base64, header
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.substring(commaIdx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(slice);
    });

    await AbyssNative.appendVideoChunk({ chunkBase64: base64Chunk });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  const finalRes = await AbyssNative.finishSaveVideo({ fileName });
  return finalRes.savedPath;
}
