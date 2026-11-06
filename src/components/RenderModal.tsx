import React, { useState, useEffect } from 'react';
import { ClipSlot, ThumbnailStudioState } from '../types';
import { calculateChapters, generateYouTubeDescription } from '../services/chapterGenerator';
import { formatTimeMMSS } from '../services/trimmerEngine';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Share2, 
  Sparkles, 
  Film, 
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-react';

interface RenderModalProps {
  slots: ClipSlot[];
  thumbnailState: ThumbnailStudioState;
  onClose: () => void;
  shizukuActive: boolean;
}

export const RenderModal: React.FC<RenderModalProps> = ({
  slots,
  thumbnailState,
  onClose,
  shizukuActive
}) => {
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Initializing Media3 Transformer...');
  const [isRenderComplete, setIsRenderComplete] = useState(false);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [capcutPushed, setCapcutPushed] = useState(false);

  const { chapters, totalDurationSec } = calculateChapters(slots, thumbnailState);
  const fullDescription = generateYouTubeDescription(slots, thumbnailState);

  // Simulate hardware MediaCodec 1080p 60fps rendering (~4 seconds simulation of 30s hardware job)
  useEffect(() => {
    const steps = [
      { p: 15, msg: 'Sampling keyframes & trimming loading screens...' },
      { p: 35, msg: 'Compositing 0.5s black fade transitions between chambers...' },
      { p: 60, msg: 'Balancing dual-track audio (-20 dB SFX + -30 dB BGM)...' },
      { p: 85, msg: 'Hardware MediaCodec 1080p 60fps encoding via Dimensity 9200+...' },
      { p: 100, msg: 'Render complete! Saved to /sdcard/DCIM/GenshinAbyssStudio/' }
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setRenderProgress(steps[stepIndex].p);
        setCurrentStep(steps[stepIndex].msg);
        stepIndex++;
      } else {
        clearInterval(interval);
        setIsRenderComplete(true);
      }
    }, 700);

    return () => clearInterval(interval);
  }, []);

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(fullDescription);
    setCopiedDescription(true);
    setTimeout(() => setCopiedDescription(false), 2500);
  };

  const handlePushToCapCut = () => {
    setCapcutPushed(true);
    setTimeout(() => setCapcutPushed(false), 3000);
  };

  const handleDownloadMp4 = () => {
    // Generate a simple dummy MP4 blob download link
    const blob = new Blob(['Genshin Abyss Studio 1080p 60fps Render Output'], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Abyss_F12_${thumbnailState.side1.character}_${thumbnailState.side2.character}_1080p60.mp4`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#151A23] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#232B38] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#232B38] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#FED662]" />
            <h3 className="text-sm font-bold text-white">Media3 Hardware Assembly</h3>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-[#232B38]"
          >
            Close
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Progress Bar / Hardware Status */}
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
                className="h-full bg-gradient-to-r from-[#00E5FF] to-[#FED662] transition-all duration-500 rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>

            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
              <span>Target: 1080p @ 60fps (Constant Frame Rate)</span>
              <span>Total Runtime: {formatTimeMMSS(totalDurationSec)}</span>
            </div>
          </div>

          {/* Render Completed Card */}
          {isRenderComplete && (
            <div className="flex flex-col gap-3">
              {/* Output File Details */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      1080p 60fps MP4 Export Ready
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-mono">
                      /sdcard/DCIM/GenshinAbyssStudio/Abyss_F12_Showcase.mp4
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadMp4}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[#0B0E14] text-xs font-bold shadow-md hover:brightness-110 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>

              {/* YouTube Chapters & Description Box */}
              <div className="bg-[#0B0E14] rounded-xl p-3 border border-[#232B38] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    YouTube Chapters & Metadata
                  </span>
                  <button
                    onClick={handleCopyDescription}
                    className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-semibold text-[#FED662] hover:bg-[#2C3646] flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedDescription ? 'Copied to Clipboard!' : 'Copy All'}
                  </button>
                </div>

                <div className="bg-[#12161E] rounded-lg p-2.5 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                  {fullDescription}
                </div>
              </div>

              {/* Push to CapCut Mobile via Shizuku (Power User Bonus) */}
              <div className="bg-[#151A23] rounded-xl p-3 border border-[#232B38] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>⚡ Push to CapCut Mobile Draft</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-bold">
                      Shizuku ADB
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Injects draft_content.json directly into CapCut mobile's private sandbox
                  </div>
                </div>

                <button
                  onClick={handlePushToCapCut}
                  disabled={!shizukuActive}
                  className="px-3 py-1.5 rounded-lg bg-[#232B38] text-xs font-semibold text-slate-200 hover:text-white disabled:opacity-40"
                >
                  {capcutPushed ? 'Injected!' : 'Push Draft'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
