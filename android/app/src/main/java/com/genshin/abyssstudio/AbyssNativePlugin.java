package com.genshin.abyssstudio;

import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import rikka.shizuku.Shizuku;

@CapacitorPlugin(name = "AbyssNative")
public class AbyssNativePlugin extends Plugin {
    private static final String TAG = "AbyssNative";

    @PluginMethod
    public void scanRecordings(PluginCall call) {
        String customPath = call.getString("path", "/sdcard/DCIM/ScreenRecorder");
        File dir = new File(customPath);

        // Fallback directory checks if default does not exist
        if (!dir.exists() || !dir.isDirectory()) {
            File alt1 = new File("/sdcard/Movies/Screenrecorder");
            File alt2 = new File("/sdcard/DCIM");
            if (alt1.exists() && alt1.isDirectory()) {
                dir = alt1;
            } else if (alt2.exists() && alt2.isDirectory()) {
                dir = alt2;
            }
        }

        if (!dir.exists()) {
            JSObject ret = new JSObject();
            ret.put("recordings", new JSArray());
            ret.put("scannedPath", dir.getAbsolutePath());
            ret.put("error", "Directory does not exist: " + customPath);
            call.resolve(ret);
            return;
        }

        File[] files = dir.listFiles((d, name) -> {
            String lower = name.toLowerCase(Locale.ROOT);
            return lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".mov");
        });

        if (files == null || files.length == 0) {
            JSObject ret = new JSObject();
            ret.put("recordings", new JSArray());
            ret.put("scannedPath", dir.getAbsolutePath());
            call.resolve(ret);
            return;
        }

        List<File> fileList = new ArrayList<>();
        Collections.addAll(fileList, files);
        // Sort descending: newest recordings first
        fileList.sort((f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));

        JSArray recordings = new JSArray();
        SimpleDateFormat timeFmt = new SimpleDateFormat("HH:mm", Locale.getDefault());
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();

        int maxProcess = Math.min(fileList.size(), 30);
        for (int i = 0; i < maxProcess; i++) {
            File f = fileList.get(i);
            try {
                retriever.setDataSource(f.getAbsolutePath());
                String durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
                String wStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH);
                String hStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT);

                long durMs = durStr != null ? Long.parseLong(durStr) : 0;
                int durationSec = (int) Math.round(durMs / 1000.0);
                int width = wStr != null ? Integer.parseInt(wStr) : 2712;
                int height = hStr != null ? Integer.parseInt(hStr) : 1220;
                boolean isFail = durationSec < 30;

                // Extract frame for preview thumbnail (10% into clip or at 2s)
                String thumbBase64 = "";
                try {
                    long targetMicros = Math.min(durMs * 100, 2000000L);
                    Bitmap frame = retriever.getFrameAtTime(targetMicros, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    if (frame != null) {
                        // Scale to 20:9 thumbnail 320x144
                        Bitmap thumb = Bitmap.createScaledBitmap(frame, 320, 144, true);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        thumb.compress(Bitmap.CompressFormat.JPEG, 65, baos);
                        thumbBase64 = "data:image/jpeg;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
                        thumb.recycle();
                        frame.recycle();
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Thumbnail extraction skipped for " + f.getName());
                }

                JSObject rec = new JSObject();
                rec.put("id", "rec_" + f.lastModified() + "_" + i);
                rec.put("filename", f.getName());
                rec.put("path", f.getAbsolutePath());
                rec.put("durationSec", durationSec > 0 ? durationSec : 120);
                rec.put("timestamp", timeFmt.format(new Date(f.lastModified())));
                rec.put("isFailAttempt", isFail);
                rec.put("thumbnailUrl", thumbBase64);
                rec.put("fileSizeMb", Math.round((f.length() / (1024.0 * 1024.0)) * 10.0) / 10.0);
                rec.put("width", width);
                rec.put("height", height);

                recordings.put(rec);
            } catch (Exception e) {
                // Fallback entry if metadata retrieval fails
                JSObject rec = new JSObject();
                rec.put("id", "rec_" + f.lastModified() + "_" + i);
                rec.put("filename", f.getName());
                rec.put("path", f.getAbsolutePath());
                rec.put("durationSec", 120);
                rec.put("timestamp", timeFmt.format(new Date(f.lastModified())));
                rec.put("isFailAttempt", false);
                rec.put("thumbnailUrl", "");
                rec.put("fileSizeMb", Math.round((f.length() / (1024.0 * 1024.0)) * 10.0) / 10.0);
                rec.put("width", 2712);
                rec.put("height", 1220);
                recordings.put(rec);
            }
        }

        try {
            retriever.release();
        } catch (Exception ignored) {}

        JSObject res = new JSObject();
        res.put("recordings", recordings);
        res.put("scannedPath", dir.getAbsolutePath());
        res.put("totalFound", fileList.size());
        call.resolve(res);
    }

    @PluginMethod
    public void scanMusic(PluginCall call) {
        String rootPath = call.getString("path", "/sdcard/Music");
        File dir = new File(rootPath);

        if (!dir.exists() || !dir.isDirectory()) {
            JSObject ret = new JSObject();
            ret.put("tracks", new JSArray());
            ret.put("scannedPath", rootPath);
            ret.put("error", "Music directory does not exist: " + rootPath);
            call.resolve(ret);
            return;
        }

        List<File> audioFiles = new ArrayList<>();
        crawlMusicFiles(dir, audioFiles);

        JSArray tracks = new JSArray();
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();

        int maxProcess = Math.min(audioFiles.size(), 200);
        for (int i = 0; i < maxProcess; i++) {
            File f = audioFiles.get(i);
            try {
                retriever.setDataSource(f.getAbsolutePath());
                String title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
                String artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
                String durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);

                if (title == null || title.trim().isEmpty()) {
                    title = f.getName().replaceFirst("[.][^.]+$", "").replace("_", " ");
                }
                if (artist == null || artist.trim().isEmpty()) {
                    artist = "Genshin Impact OST";
                }

                long durMs = durStr != null ? Long.parseLong(durStr) : 120000;
                int durationSec = (int) Math.round(durMs / 1000.0);

                // Subfolder determination
                String parentName = f.getParentFile() != null ? f.getParentFile().getName() : "Music";

                String lower = title.toLowerCase(Locale.ROOT) + " " + parentName.toLowerCase(Locale.ROOT);
                String energyHint = "general";
                if (lower.contains("battle") || lower.contains("boss") || lower.contains("duel") || lower.contains("combat") || lower.contains("climax")) {
                    energyHint = "high";
                } else if (lower.contains("chill") || lower.contains("peace") || lower.contains("town") || lower.contains("night") || lower.contains("soft")) {
                    energyHint = "chill";
                }

                JSObject track = new JSObject();
                track.put("id", "bgm_" + f.lastModified() + "_" + i);
                track.put("title", title);
                track.put("artist", artist);
                track.put("folder", parentName);
                track.put("durationSec", durationSec > 0 ? durationSec : 120);
                track.put("energyHint", energyHint);
                track.put("path", f.getAbsolutePath());
                track.put("volumeGain", 0.0316);
                track.put("fadeInSec", 0.2);
                track.put("fadeOutSec", 1.5);
                track.put("inPointSec", 0);

                tracks.put(track);
            } catch (Exception e) {
                String fallbackTitle = f.getName().replaceFirst("[.][^.]+$", "").replace("_", " ");
                JSObject track = new JSObject();
                track.put("id", "bgm_" + f.lastModified() + "_" + i);
                track.put("title", fallbackTitle);
                track.put("artist", "Local Track");
                track.put("folder", f.getParentFile() != null ? f.getParentFile().getName() : "Music");
                track.put("durationSec", 120);
                track.put("energyHint", "general");
                track.put("path", f.getAbsolutePath());
                track.put("volumeGain", 0.0316);
                track.put("fadeInSec", 0.2);
                track.put("fadeOutSec", 1.5);
                track.put("inPointSec", 0);
                tracks.put(track);
            }
        }

        try {
            retriever.release();
        } catch (Exception ignored) {}

        JSObject res = new JSObject();
        res.put("tracks", tracks);
        res.put("scannedPath", dir.getAbsolutePath());
        res.put("totalFound", audioFiles.size());
        call.resolve(res);
    }

    private void crawlMusicFiles(File dir, List<File> result) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;
        File[] entries = dir.listFiles();
        if (entries == null) return;

        for (File entry : entries) {
            if (entry.isDirectory() && !entry.getName().startsWith(".")) {
                crawlMusicFiles(entry, result);
            } else if (entry.isFile()) {
                String lower = entry.getName().toLowerCase(Locale.ROOT);
                if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".flac") || lower.endsWith(".wav") || lower.endsWith(".ogg")) {
                    result.add(entry);
                }
            }
        }
    }

    @PluginMethod
    public void checkShizuku(PluginCall call) {
        boolean isRunning = false;
        boolean isGranted = false;

        try {
            isRunning = Shizuku.pingBinder();
            if (isRunning) {
                isGranted = Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED;
            }
        } catch (Throwable t) {
            Log.w(TAG, "Shizuku ping error: " + t.getMessage());
        }

        JSObject res = new JSObject();
        res.put("isRunning", isRunning);
        res.put("isGranted", isGranted);
        call.resolve(res);
    }

    @PluginMethod
    public void requestShizuku(PluginCall call) {
        boolean requested = false;
        try {
            if (Shizuku.pingBinder()) {
                if (Shizuku.checkSelfPermission() != PackageManager.PERMISSION_GRANTED) {
                    Shizuku.requestPermission(1001);
                    requested = true;
                } else {
                    requested = true;
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Shizuku request error: " + t.getMessage());
        }

        JSObject res = new JSObject();
        res.put("requested", requested);
        call.resolve(res);
    }

    @PluginMethod
    public void saveVideoToGallery(PluginCall call) {
        String base64Data = call.getString("base64Data", "");
        String fileName = call.getString("fileName", "Abyss_Showcase_Rendered.mp4");

        if (base64Data.isEmpty()) {
            call.reject("base64Data is required");
            return;
        }

        try {
            // Strip data:video/mp4;base64, header if present
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

            File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File outDir = new File(moviesDir, "GenshinMobileStudio");
            if (!outDir.exists()) {
                outDir.mkdirs();
            }

            File targetFile = new File(outDir, fileName);
            FileOutputStream fos = new FileOutputStream(targetFile);
            fos.write(bytes);
            fos.flush();
            fos.close();

            // Notify Android MediaStore scanner so it instantly shows in Xiaomi Gallery
            MediaScannerConnection.scanFile(
                getContext(),
                new String[]{targetFile.getAbsolutePath()},
                new String[]{"video/mp4"},
                (path, uri) -> Log.i(TAG, "MediaScanner indexed: " + path + " -> " + uri)
            );

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("savedPath", targetFile.getAbsolutePath());
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Failed saving video to gallery", e);
            call.reject("Save failed: " + e.getMessage());
        }
    }
}
