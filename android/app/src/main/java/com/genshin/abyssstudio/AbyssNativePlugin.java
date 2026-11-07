package com.genshin.abyssstudio;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
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

    // Streaming video save state (prevents Out-Of-Memory on 1GB+ renders)
    private FileOutputStream currentSaveStream = null;
    private File currentSaveFile = null;

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Context context = getContext();
        List<String> needed = new ArrayList<>();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_VIDEO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_VIDEO);
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_AUDIO);
            }
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        if (!needed.isEmpty() && getActivity() != null) {
            ActivityCompat.requestPermissions(getActivity(), needed.toArray(new String[0]), 2001);
        }

        boolean allFilesGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            allFilesGranted = Environment.isExternalStorageManager();
            if (!allFilesGranted && getActivity() != null) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    getActivity().startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        getActivity().startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }
        }

        JSObject res = new JSObject();
        res.put("mediaGranted", needed.isEmpty());
        res.put("allFilesGranted", allFilesGranted);
        call.resolve(res);
    }

    @PluginMethod
    public void scanRecordings(PluginCall call) {
        String customPath = call.getString("path", "/sdcard/DCIM/ScreenRecorder");
        File dir = new File(customPath);

        // Fallback checks
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
            return (lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".mov")) && !name.startsWith(".");
        });

        if (files == null || files.length == 0) {
            JSObject ret = new JSObject();
            ret.put("recordings", new JSArray());
            ret.put("scannedPath", dir.getAbsolutePath());
            ret.put("totalFound", 0);
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

        int maxProcess = Math.min(fileList.size(), 40);
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

                // Extract frame thumbnail (at 2s or 10% into clip)
                String thumbBase64 = "";
                try {
                    long targetMicros = Math.min(durMs * 100, 2000000L);
                    Bitmap frame = retriever.getFrameAtTime(targetMicros, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
                    if (frame != null) {
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
        crawlMusicFiles(dir, audioFiles, 5, 0);

        JSArray tracks = new JSArray();
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();

        int maxProcess = Math.min(audioFiles.size(), 300);
        for (int i = 0; i < maxProcess; i++) {
            File f = audioFiles.get(i);
            try {
                retriever.setDataSource(f.getAbsolutePath());
                String title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
                String artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
                String durStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);

                if (title == null || title.trim().isEmpty()) {
                    title = cleanTrackTitle(f.getName());
                } else {
                    title = cleanTrackTitle(title);
                }

                if (artist == null || artist.trim().isEmpty()) {
                    artist = "Genshin Impact OST";
                }

                long durMs = durStr != null ? Long.parseLong(durStr) : 120000;
                int durationSec = (int) Math.round(durMs / 1000.0);

                // Compute relative folder name from rootPath
                String relFolder = "Music";
                try {
                    String fullPath = f.getParentFile() != null ? f.getParentFile().getAbsolutePath() : "";
                    if (fullPath.startsWith(dir.getAbsolutePath())) {
                        String sub = fullPath.substring(dir.getAbsolutePath().length());
                        if (sub.startsWith("/") || sub.startsWith("\\")) {
                            sub = sub.substring(1);
                        }
                        if (!sub.isEmpty()) {
                            relFolder = sub.replace("\\", "/");
                        }
                    }
                } catch (Exception ignored) {}

                String lower = (title + " " + relFolder).toLowerCase(Locale.ROOT);
                String energyHint = "general";
                if (lower.contains("battle") || lower.contains("boss") || lower.contains("duel") || lower.contains("combat") || lower.contains("climax") || lower.contains("intense") || lower.contains("rock") || lower.contains("metal")) {
                    energyHint = "high";
                } else if (lower.contains("chill") || lower.contains("peace") || lower.contains("town") || lower.contains("night") || lower.contains("soft") || lower.contains("relax") || lower.contains("teapot") || lower.contains("winery")) {
                    energyHint = "chill";
                }

                JSObject track = new JSObject();
                track.put("id", "bgm_" + f.lastModified() + "_" + i);
                track.put("title", title);
                track.put("artist", artist);
                track.put("folder", relFolder);
                track.put("durationSec", durationSec > 0 ? durationSec : 120);
                track.put("energyHint", energyHint);
                track.put("path", f.getAbsolutePath());
                track.put("volumeGain", 0.0316);
                track.put("fadeInSec", 0.2);
                track.put("fadeOutSec", 1.5);
                track.put("inPointSec", 0);

                tracks.put(track);
            } catch (Exception e) {
                String fallbackTitle = cleanTrackTitle(f.getName());
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

    private void crawlMusicFiles(File dir, List<File> result, int maxDepth, int currentDepth) {
        if (dir == null || !dir.exists() || !dir.isDirectory() || currentDepth > maxDepth) return;
        File[] entries = dir.listFiles();
        if (entries == null) return;

        for (File entry : entries) {
            if (entry.isDirectory() && !entry.getName().startsWith(".") && !entry.getName().equalsIgnoreCase("Android")) {
                crawlMusicFiles(entry, result, maxDepth, currentDepth + 1);
            } else if (entry.isFile()) {
                String lower = entry.getName().toLowerCase(Locale.ROOT);
                if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".flac") || lower.endsWith(".wav") || lower.endsWith(".ogg")) {
                    result.add(entry);
                }
            }
        }
    }

    private String cleanTrackTitle(String name) {
        String base = name.replaceFirst("[.][^.]+$", "");
        return base.replaceAll("(?i)\\[NCS Release\\]|\\[NCS\\]|\\(Official Video\\)|\\(320k\\)|\\[320kbps\\]", "")
                   .replace("_", " ")
                   .trim();
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
    public void executeShizukuCommand(PluginCall call) {
        String script = call.getString("command", "");
        if (script.isEmpty()) {
            call.reject("command is required");
            return;
        }

        try {
            if (!Shizuku.pingBinder()) {
                call.reject("Shizuku is not running");
                return;
            }
            if (Shizuku.checkSelfPermission() != PackageManager.PERMISSION_GRANTED) {
                call.reject("Shizuku permission not granted");
                return;
            }

            // Execute shell process via Shizuku reflection or fallback
            Process process = null;
            try {
                java.lang.reflect.Method m = Shizuku.class.getMethod("newProcess", String[].class, String[].class, String.class);
                process = (Process) m.invoke(null, new String[]{"sh", "-c", script}, null, null);
            } catch (Throwable t) {
                process = Runtime.getRuntime().exec(new String[]{"sh", "-c", script});
            }

            new Thread(() -> {
                try {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        Log.i(TAG, "[Shizuku-Out] " + line);
                    }
                    int code = process.waitFor();
                    Log.i(TAG, "[Shizuku] Process finished with exit code: " + code);
                } catch (Exception e) {
                    Log.e(TAG, "[Shizuku-Err]", e);
                }
            }).start();

            JSObject res = new JSObject();
            res.put("started", true);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Failed executing Shizuku command", e);
            call.reject("Execution failed: " + e.getMessage());
        }
    }

    /**
     * Chunked Video Saving Methods
     * Prevents Android WebView out-of-memory crashes on large 1GB+ files
     */
    @PluginMethod
    public void startSaveVideo(PluginCall call) {
        String fileName = call.getString("fileName", "Abyss_Showcase_" + System.currentTimeMillis() + ".mp4");

        try {
            if (currentSaveStream != null) {
                try {
                    currentSaveStream.close();
                } catch (Exception ignored) {}
                currentSaveStream = null;
            }

            File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File outDir = new File(moviesDir, "GenshinMobileStudio");
            if (!outDir.exists()) {
                outDir.mkdirs();
            }

            currentSaveFile = new File(outDir, fileName);
            currentSaveStream = new FileOutputStream(currentSaveFile, false);

            JSObject res = new JSObject();
            res.put("started", true);
            res.put("targetPath", currentSaveFile.getAbsolutePath());
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Failed starting chunked video save", e);
            call.reject("Start save failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void appendVideoChunk(PluginCall call) {
        String chunkBase64 = call.getString("chunkBase64", "");
        if (chunkBase64.isEmpty()) {
            call.resolve();
            return;
        }

        try {
            if (currentSaveStream == null) {
                call.reject("Video stream not started. Call startSaveVideo first.");
                return;
            }

            if (chunkBase64.contains(",")) {
                chunkBase64 = chunkBase64.substring(chunkBase64.indexOf(",") + 1);
            }

            byte[] bytes = Base64.decode(chunkBase64, Base64.NO_WRAP);
            currentSaveStream.write(bytes);

            JSObject res = new JSObject();
            res.put("bytesWritten", bytes.length);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Failed appending video chunk", e);
            call.reject("Append chunk failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void finishSaveVideo(PluginCall call) {
        try {
            if (currentSaveStream != null) {
                currentSaveStream.flush();
                currentSaveStream.close();
                currentSaveStream = null;
            }

            if (currentSaveFile == null || !currentSaveFile.exists()) {
                call.reject("Target file does not exist");
                return;
            }

            String savedPath = currentSaveFile.getAbsolutePath();

            // Trigger MediaScanner so it instantly shows in Xiaomi Gallery
            MediaScannerConnection.scanFile(
                getContext(),
                new String[]{savedPath},
                new String[]{"video/mp4"},
                (path, uri) -> Log.i(TAG, "MediaScanner indexed: " + path + " -> " + uri)
            );

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("savedPath", savedPath);
            res.put("fileSizeMb", Math.round((currentSaveFile.length() / (1024.0 * 1024.0)) * 10.0) / 10.0);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Failed finishing video save", e);
            call.reject("Finish save failed: " + e.getMessage());
        }
    }
}
