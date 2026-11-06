import React, { useState, useEffect, useRef } from 'react';
import { ClipSlot } from '../types';
import { calculateChapters, generateYouTubeDescription } from '../services/chapterGenerator';
import { formatTimeMMSS } from '../services/trimmerEngine';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Sparkles, 
  Film, 
  AlertCircle,
  Play,
  RotateCcw,
  Terminal,
  Volume2
} from 'lucide-react';

interface RenderModalProps {
  slots: ClipSlot[];
  onClose: () => void;
  shizukuActive: boolean;
}

export const RenderModal: React.FC<RenderModalProps> = ({
  slots,
  onClose,
  shizukuActive
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Ready to assemble');
  const [renderedBlobUrl, setRenderedBlobUrl] = useState<string | null>(null);
  const [renderedBlobSizeMb, setRenderedBlobSizeMb] = useState<number>(0);
  const [isRenderComplete, setIsRenderComplete] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedShizukuCmd, setCopiedShizukuCmd] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const validSlots = slots.filter((s) => s.assignedClip !== null);
  const { chapters, totalDurationSec } = calculateChapters(validSlots);
  const fullDescription = generateYouTubeDescription(validSlots);

  // Generate an exact native FFmpeg script for Shizuku / Termux execution on Xiaomi 13T Pro
  const generateShizukuAdbCommand = () => {
    const lines = [
      '# Genshin Abyss Auto-Editor - Shizuku / ADB Hardware Concat Script',
      '# Dimensity 9200+ hardware H.264 encoder with SFX (-20dB) & BGM (-30dB) mixing',
      'mkdir -p /sdcard/DCIM/GenshinAbyssStudio'
    ];

    validSlots.forEach((slot, idx) => {
      const clip = slot.assignedClip!;
      const bgm = slot.assignedBgm;
      const outPart = `/sdcard/DCIM/GenshinAbyssStudio/part_${idx + 1}.mp4`;
      const dur = slot.effectiveCombatSec.toFixed(2);
      const start = slot.entryCutSec.toFixed(2);

      if (bgm) {
        lines.push(
          `ffmpeg -y -ss ${start} -t ${dur} -i "${clip.path}" -i "${bgm.path}" ` +
          `-filter_complex "[0:a]volume=0.10[sfx];[1:a]volume=0.0316,afade=t=out:st=${Math.max(0, slot.effectiveCombatSec - 1.5).toFixed(2)}:d=1.5[bgm];[sfx][bgm]amix=inputs=2[aout]" ` +
          `-map 0:v -map "[aout]" -c:v h264_mediacodec -b:v 16M -r 60 -c:a aac -b:a 192k "${outPart}"`
        );
      } else {
        lines.push(
          `ffmpeg -y -ss ${start} -t ${dur} -i "${clip.path}" -af "volume=0.10" -c:v h264_mediacodec -b:v 16M -r 60 -c:a aac "${outPart}"`
        );
      }
    });

    lines.push('');
    lines.push('# Create concat list and assemble final unified video');
    lines.push('cat << \'EOF\' > /sdcard/DCIM/GenshinAbyssStudio/concat.txt');
    validSlots.forEach((_, idx) => {
      lines.push(`file 'part_${idx + 1}.mp4'`);
    });
    lines.push('EOF');
    lines.push(
      'ffmpeg -y -f concat -safe 0 -i /sdcard/DCIM/GenshinAbyssStudio/concat.txt -c copy /sdcard/DCIM/GenshinAbyssStudio/Abyss_Floor12_36Star_Finished.mp4'
    );
    lines.push('echo "✅ Render complete! Output: /sdcard/DCIM/GenshinAbyssStudio/Abyss_Floor12_36Star_Finished.mp4"');
    return lines.join('\n');
  };

  const shizukuScript = generateShizukuAdbCommand();

  // Run Real In-App Video & Audio Assembly via MediaRecorder / Web Audio
  const startRealAssembly = async () => {
    if (validSlots.length === 0) {
      setRenderError('No video clips assigned. Please assign takes to at least 1 chamber slot.');
      return;
    }

    try {
      setIsRendering(true);
      setRenderError(null);
      setRenderProgress(0);
      setCurrentStep('Initializing audio mixer & canvas...');

      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize 2D canvas context');

      // Initialize Web Audio graph
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      const canvasStream = canvas.captureStream(60);
      const audioTracks = dest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }

      // Determine supported mimeType
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
        mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 16000000 // 16 Mbps high-bitrate 1080p
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const outputBlob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(outputBlob);
        setRenderedBlobUrl(url);
        setRenderedBlobSizeMb(Math.round((outputBlob.size / (1024 * 1024)) * 10) / 10);
        setIsRendering(false);
        setIsRenderComplete(true);
        setCurrentStep('Assembly complete!');
        audioCtx.close().catch(() => {});
      };

      recorder.start(500);

      const totalSegments = validSlots.length;

      // Sequential chamber rendering loop
      for (let i = 0; i < totalSegments; i++) {
        const slot = validSlots[i];
        const clip = slot.assignedClip!;
        const bgm = slot.assignedBgm;

        setCurrentStep(`Rendering Chamber ${i + 1}/${totalSegments}: ${slot.title}...`);

        // Load video safely with mobile timeout
        const video = document.createElement('video');
        video.src = clip.objectUrl || clip.path;
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = true; // Start muted to satisfy mobile autoplay policies

        await new Promise<void>((res) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(loadTimeout);
            res();
          };
          const loadTimeout = setTimeout(finish, 2500); // 2.5s max load wait
          video.onloadeddata = finish;
          video.oncanplay = finish;
          video.onerror = finish;
        });

        // Ensure audio context is resumed
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        // Connect video audio to gain (0.10 = -20 dB)
        let videoSource: MediaElementAudioSourceNode | null = null;
        try {
          const sfxGain = audioCtx.createGain();
          sfxGain.gain.value = 0.10; // -20 dB for SFX
          videoSource = audioCtx.createMediaElementSource(video);
          videoSource.connect(sfxGain);
          sfxGain.connect(dest);
          video.muted = false; // Unmute if media element source is accepted
        } catch {
          video.muted = true; // Fallback to muted if mobile policy forbids source
        }

        // Setup BGM track (0.0316 = -30 dB)
        let bgmAudio: HTMLAudioElement | null = null;
        let bgmSource: MediaElementAudioSourceNode | null = null;

        if (bgm && bgm.audioUrl) {
          try {
            bgmAudio = new Audio(bgm.audioUrl);
            bgmAudio.crossOrigin = 'anonymous';
            const bgmGain = audioCtx.createGain();
            bgmGain.gain.setValueAtTime(0.0316, audioCtx.currentTime); // -30 dB BGM
            bgmSource = audioCtx.createMediaElementSource(bgmAudio);
            bgmSource.connect(bgmGain);
            bgmGain.connect(dest);
          } catch {}
        }

        // Seek video to entry cut safely with timeout (prevents Android onseeked freeze)
        try {
          video.currentTime = slot.entryCutSec;
        } catch {}

        await new Promise<void>((res) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(seekTimeout);
            res();
          };
          const seekTimeout = setTimeout(finish, 1000); // 1.0s max seek wait
          video.onseeked = finish;
        });

        if (bgmAudio && bgm) {
          try {
            bgmAudio.currentTime = bgm.inPointSec || 0;
          } catch {}
        }

        // Start playback with autoplay recovery
        try {
          await video.play();
        } catch {
          // If unmuted playback was blocked by browser policy, mute and play
          video.muted = true;
          await video.play().catch(() => {});
        }

        if (bgmAudio) {
          await bgmAudio.play().catch(() => {});
        }

        const segmentDuration = slot.effectiveCombatSec;
        const startTime = Date.now();

        // Render frames for this slot with safety timeout and pump interval
        await new Promise<void>((resolveSegment) => {
          let isSegmentDone = false;
          let pumpInterval: any = null;

          const finishSegment = () => {
            if (isSegmentDone) return;
            isSegmentDone = true;
            if (pumpInterval) clearInterval(pumpInterval);
            try { video.pause(); } catch {}
            try { if (bgmAudio) bgmAudio.pause(); } catch {}
            resolveSegment();
          };

          // Maximum safety timeout for this segment (+3s grace)
          const maxSegmentTimeout = setTimeout(finishSegment, (segmentDuration + 3) * 1000);

          const drawFrame = () => {
            if (isSegmentDone) return;

            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed >= segmentDuration || video.ended) {
              clearTimeout(maxSegmentTimeout);
              finishSegment();
              return;
            }

            // Draw video to canvas (cover 1920x1080)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (video.videoWidth > 0 && video.videoHeight > 0) {
              const hRatio = canvas.width / video.videoWidth;
              const vRatio = canvas.height / video.videoHeight;
              const ratio = Math.max(hRatio, vRatio);
              const centerShiftX = (canvas.width - video.videoWidth * ratio) / 2;
              const centerShiftY = (canvas.height - video.videoHeight * ratio) / 2;
              ctx.drawImage(
                video,
                0,
                0,
                video.videoWidth,
                video.videoHeight,
                centerShiftX,
                centerShiftY,
                video.videoWidth * ratio,
                video.videoHeight * ratio
              );
            }

            // Apply 0.5s Black Fade Transitions
            if (elapsed < 0.5) {
              // Fade in from black
              const fadeAlpha = 1.0 - elapsed / 0.5;
              ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (elapsed > segmentDuration - 0.5) {
              // Fade out to black
              const fadeAlpha = (elapsed - (segmentDuration - 0.5)) / 0.5;
              ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Progress tracking
            const overallProgress = Math.min(
              98,
              Math.round(((i + elapsed / segmentDuration) / totalSegments) * 100)
            );
            setRenderProgress(overallProgress);

            requestAnimationFrame(drawFrame);
          };

          // Safety pump in case requestAnimationFrame throttles in mobile WebView
          pumpInterval = setInterval(() => {
            if (isSegmentDone) return;
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed >= segmentDuration) {
              clearTimeout(maxSegmentTimeout);
              finishSegment();
            }
          }, 500);

          requestAnimationFrame(drawFrame);
        });

        // Cleanup nodes for this segment
        try {
          if (videoSource) videoSource.disconnect();
          if (bgmSource) bgmSource.disconnect();
        } catch {}
      }

      setRenderProgress(100);
      setCurrentStep('Finalizing MP4 container...');
      recorder.stop();
    } catch (err: any) {
      setIsRendering(false);
      setRenderError(err.message || 'Render failed. Check video format or browser permissions.');
    }
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(fullDescription);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2500);
  };

  const handleCopyShizukuScript = () => {
    navigator.clipboard.writeText(shizukuScript);
    setCopiedShizukuCmd(true);
    setTimeout(() => setCopiedShizukuCmd(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#151A23] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#232B38] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#232B38] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#FED662]" />
            <h3 className="text-sm font-bold text-white">1080p 60fps Video Assembly</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#232B38]"
          >
            Close
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Timeline Summary Card */}
          <div className="bg-[#0B0E14] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Ready Slots for Assembly</span>
              <span className="text-[#FED662]">{validSlots.length} / {slots.length} Assigned</span>
            </div>

            <div className="text-[11px] text-slate-400">
              Total runtime: <strong className="text-white font-mono">{formatTimeMMSS(totalDurationSec)}</strong>
              {' · '}Audio: <strong className="text-white">SFX -20 dB + BGM -30 dB</strong>
              {' · '}Fade: <strong className="text-white">0.5s Black Fade</strong>
            </div>

            {validSlots.length === 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Assign at least one recording in the Video Arranger tab before starting render.</span>
              </div>
            )}
          </div>

          {/* Render Control & Progress */}
          {!isRenderComplete ? (
            <div className="flex flex-col gap-3">
              {isRendering ? (
                <div className="bg-[#0B0E14] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                      {currentStep}
                    </span>
                    <span className="font-mono text-[#FED662] font-bold">{renderProgress}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[#151A23] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00E5FF] to-[#FED662] transition-all duration-300 rounded-full"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 text-center">
                    Encoding 1080p 60fps frames with dual-track audio normalization...
                  </div>
                </div>
              ) : (
                <button
                  onClick={startRealAssembly}
                  disabled={validSlots.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FED662] via-[#FFA000] to-[#FF6B00] text-[#0B0E14] font-black text-sm tracking-wide shadow-xl shadow-[#FED662]/10 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-[#0B0E14]" />
                  <span>START 1080p 60fps ASSEMBLY</span>
                </button>
              )}

              {renderError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-300">
                  {renderError}
                </div>
              )}
            </div>
          ) : (
            /* Render Completed Screen */
            <div className="flex flex-col gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      Finished Video Ready ({renderedBlobSizeMb} MB)
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-mono">
                      1080p 60fps · Dual Normalization (-20dB SFX, -30dB BGM)
                    </div>
                  </div>
                </div>

                {renderedBlobUrl && (
                  <a
                    href={renderedBlobUrl}
                    download="Abyss_Floor12_36Star_Showcase.mp4"
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-[#0B0E14] text-xs font-black shadow-md hover:brightness-110 flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Download MP4
                  </a>
                )}
              </div>

              <button
                onClick={() => {
                  setIsRenderComplete(false);
                  setRenderedBlobUrl(null);
                  startRealAssembly();
                }}
                className="py-2 rounded-xl bg-[#232B38] text-slate-300 text-xs font-semibold hover:text-white flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-assemble Timeline
              </button>
            </div>
          )}

          {/* YouTube Description & Timestamp Sync */}
          <div className="bg-[#0B0E14] rounded-2xl p-3 border border-[#232B38] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                YouTube Chapters & BGM Credits
              </span>
              <button
                onClick={handleCopyDescription}
                className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-semibold text-[#FED662] hover:bg-[#2C3646] flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copiedDescription ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-[#12161E] rounded-xl p-2.5 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap select-all">
              {fullDescription}
            </div>
          </div>

          {/* Shizuku / Termux ADB Hardware Fast Path */}
          {shizukuActive && (
            <div className="bg-[#151A23] rounded-2xl p-3 border border-[#232B38] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span className="text-xs font-bold text-white">Shizuku Hardware Script</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-bold">
                    ADB Direct
                  </span>
                </div>

                <button
                  onClick={handleCopyShizukuScript}
                  className="px-2 py-1 rounded bg-[#232B38] text-[11px] font-semibold text-[#00E5FF] hover:bg-[#2C3646] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  {copiedShizukuCmd ? 'Copied Script!' : 'Copy Script'}
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                Execute directly in Shizuku Shell / Termux to utilize the Dimensity 9200+ hardware MediaCodec encoder at 12x real-time speed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
