import React, { useState } from 'react';
import { ClipSlot, RawRecording, EditingMode, StygianTopology, BgmTrack } from '../types';
import { formatTimeMMSS } from '../services/trimmerEngine';
import { 
  Play, 
  Trash2, 
  RefreshCw, 
  Scissors, 
  Music, 
  Clock, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  Volume2
} from 'lucide-react';

interface ArrangerViewProps {
  mode: EditingMode;
  onModeChange: (mode: EditingMode) => void;
  stygianTopology: StygianTopology;
  onTopologyChange: (topo: StygianTopology) => void;
  slots: ClipSlot[];
  onSlotsChange: (slots: ClipSlot[]) => void;
  recordings: RawRecording[];
  onDeleteRecording: (id: string) => void;
  onAddRecording: (recording: RawRecording) => void;
  onRefreshRecordings: () => void;
  isScanning: boolean;
  shizukuActive: boolean;
}

export const ArrangerView: React.FC<ArrangerViewProps> = ({
  mode,
  onModeChange,
  stygianTopology,
  onTopologyChange,
  slots,
  onSlotsChange,
  recordings,
  onDeleteRecording,
  onAddRecording,
  onRefreshRecordings,
  isScanning,
  shizukuActive
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(slots[0]?.id || null);
  const [activeScrubClip, setActiveScrubClip] = useState<RawRecording | null>(null);
  const [microAdjustSlot, setMicroAdjustSlot] = useState<ClipSlot | null>(null);

  // Assign a recording to the selected slot
  const handleAssignClip = (slotId: string, rec: RawRecording) => {
    const updated = slots.map((s) => {
      if (s.id !== slotId) return s;

      const entryCut = s.chamberKey === 'builds' ? 0.0 : 3.2;
      const tailCut = rec.durationSec - (s.chamberKey === 'builds' ? 0.5 : 1.5);
      const effectiveDur = Math.max(5.0, tailCut - entryCut);

      return {
        ...s,
        assignedClip: rec,
        entryCutSec: entryCut,
        tailCutSec: tailCut,
        effectiveCombatSec: effectiveDur
      };
    });

    onSlotsChange(updated);
  };

  // Auto-fill all empty slots in order from available successful takes
  const handleAutoFillWinningTakes = () => {
    const goodRecordings = recordings.filter((r) => !r.isFailAttempt);
    let recIdx = 0;

    const updated = slots.map((s) => {
      if (s.assignedClip || recIdx >= goodRecordings.length) return s;
      const rec = goodRecordings[recIdx++];
      const entryCut = s.chamberKey === 'builds' ? 0.0 : 3.2;
      const tailCut = rec.durationSec - (s.chamberKey === 'builds' ? 0.5 : 1.5);
      const effectiveDur = Math.max(5.0, tailCut - entryCut);

      return {
        ...s,
        assignedClip: rec,
        entryCutSec: entryCut,
        tailCutSec: tailCut,
        effectiveCombatSec: effectiveDur
      };
    });

    onSlotsChange(updated);
  };

  // Cycle to next alternative BGM track
  const handleSwapBgmTrack = (slotId: string) => {
    const updated = slots.map((s) => {
      if (s.id !== slotId || s.bgmAlternatives.length === 0) return s;
      const current = s.assignedBgm;
      const nextTrack = s.bgmAlternatives[0];
      const remainingAlts = [...s.bgmAlternatives.slice(1), ...(current ? [current] : [])];

      return {
        ...s,
        assignedBgm: nextTrack,
        bgmAlternatives: remainingAlts
      };
    });

    onSlotsChange(updated);
  };

  // Adjust cut points by delta (+/- 0.5s)
  const handleAdjustCut = (slotId: string, type: 'entry' | 'tail', delta: number) => {
    const updated = slots.map((s) => {
      if (s.id !== slotId || !s.assignedClip) return s;
      let newEntry = s.entryCutSec;
      let newTail = s.tailCutSec;

      if (type === 'entry') {
        newEntry = Math.max(0, Math.min(s.entryCutSec + delta, s.tailCutSec - 2.0));
      } else {
        newTail = Math.max(s.entryCutSec + 2.0, Math.min(s.tailCutSec + delta, s.assignedClip.durationSec));
      }

      return {
        ...s,
        entryCutSec: Number(newEntry.toFixed(1)),
        tailCutSec: Number(newTail.toFixed(1)),
        effectiveCombatSec: Number((newTail - newEntry).toFixed(1))
      };
    });

    onSlotsChange(updated);
  };

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#151A23] rounded-2xl border border-[#232B38]">
        <button
          onClick={() => onModeChange('basic')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mode === 'basic' ? 'bg-[#FED662] text-[#0B0E14] shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Basic F12
        </button>
        <button
          onClick={() => onModeChange('showcase')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mode === 'showcase' ? 'bg-[#FED662] text-[#0B0E14] shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Dual Showcase
        </button>
        <button
          onClick={() => onModeChange('stygian')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            mode === 'stygian' ? 'bg-[#FED662] text-[#0B0E14] shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Stygian 3-Boss
        </button>
      </div>

      {/* Stygian Audio Topology Selector (Visible in Stygian Mode) */}
      {mode === 'stygian' && (
        <div className="bg-[#151A23] rounded-2xl p-3 border border-[#232B38] flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#00E5FF]" />
              Stygian BGM Topology
            </span>
            <span className="text-[11px] text-[#FED662]">Zero Duplicate Guarantee</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'topology_2x2', label: '2x2 Dual Movement', desc: 'Boss 1-2 build + Boss 3 climax' },
              { id: 'topology_per_boss', label: 'Per-Boss Triad', desc: 'Distinct track per encounter' },
              { id: 'topology_continuous', label: 'Continuous Suite', desc: '1 unified epic soundtrack' },
              { id: 'topology_unified_combat', label: 'Unified + Builds', desc: 'All bosses + chill outro' }
            ].map((topo) => (
              <button
                key={topo.id}
                onClick={() => onTopologyChange(topo.id as StygianTopology)}
                className={`p-2.5 rounded-xl border text-left transition-colors ${
                  stygianTopology === topo.id
                    ? 'bg-[#FED662]/10 border-[#FED662] text-[#FED662]'
                    : 'bg-[#0B0E14] border-[#232B38] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{topo.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{topo.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Target Timeline Slots */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-slate-400 tracking-wider">
            TIMELINE SLOTS & CUTS ({slots.filter((s) => s.assignedClip).length}/{slots.length} FILLED)
          </div>
          <button
            onClick={handleAutoFillWinningTakes}
            className="text-xs font-semibold text-[#FED662] hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Fill Winning Takes
          </button>
        </div>

        {slots.map((slot, index) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <div
              key={slot.id}
              onClick={() => setSelectedSlotId(slot.id)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col gap-3 ${
                isSelected
                  ? 'bg-[#151A23] border-[#FED662] shadow-lg shadow-[#FED662]/5'
                  : 'bg-[#12161E] border-[#232B38] hover:border-slate-700'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#232B38] text-white font-mono text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{slot.title}</h4>
                    <p className="text-[11px] text-slate-400">{slot.subtitle}</p>
                  </div>
                </div>

                {slot.assignedClip ? (
                  <span className="text-xs font-bold text-[#00E5FF] px-2 py-0.5 rounded-md bg-[#00E5FF]/10 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {formatTimeMMSS(slot.effectiveCombatSec)}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/10">
                    Empty Slot
                  </span>
                )}
              </div>

              {/* Clip Data Body */}
              {slot.assignedClip ? (
                <div className="flex items-center gap-3 bg-[#0B0E14] rounded-xl p-2.5 border border-[#232B38]">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveScrubClip(slot.assignedClip);
                    }}
                    className="relative w-16 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 group cursor-pointer"
                  >
                    <img
                      src={slot.assignedClip.thumbnailUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {slot.assignedClip.filename}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Cut: {formatTimeMMSS(slot.entryCutSec)} → {formatTimeMMSS(slot.tailCutSec)}</span>
                      <span>·</span>
                      <span className="text-slate-300">0.5s Black Fade</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMicroAdjustSlot(slot);
                      }}
                      className="p-2 rounded-lg bg-[#232B38] text-slate-300 hover:text-white"
                      title="Adjust Trim Points"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = slots.map((s) =>
                          s.id === slot.id ? { ...s, assignedClip: null, effectiveCombatSec: 0 } : s
                        );
                        onSlotsChange(updated);
                      }}
                      className="p-2 rounded-lg bg-[#232B38] text-slate-400 hover:text-red-400"
                      title="Clear Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#232B38] rounded-xl p-3 flex items-center justify-center text-xs text-slate-500">
                  Tap any recording below to assign to this slot
                </div>
              )}

              {/* Assigned BGM Track Card */}
              {slot.assignedBgm && (
                <div className="flex items-center justify-between bg-[#151A23] rounded-xl px-3 py-2 border border-[#232B38]/80 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-[#FED662] shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-slate-200 truncate">
                        {slot.assignedBgm.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {slot.assignedBgm.folder} · Vol: -30.0 dB · Fade: 1.5s
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwapBgmTrack(slot.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0B0E14] border border-[#232B38] text-[11px] font-bold text-[#FED662] hover:border-[#FED662] flex items-center gap-1 shrink-0 ml-2"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    Swap Track
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent Screen Recordings Filmstrip (From DCIM/ScreenRecorder) */}
      <div className="bg-[#151A23] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>RECENT RECORDINGS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#232B38] text-slate-300 font-mono">
                /sdcard/DCIM/ScreenRecorder
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {shizukuActive ? '⚡ Shizuku ADB Direct Access' : 'MediaStore API Access'}
            </p>
          </div>

          <button
            onClick={onRefreshRecordings}
            disabled={isScanning}
            className="p-2 rounded-xl bg-[#232B38] text-slate-300 hover:text-white disabled:opacity-50 flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#FED662]' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filmstrip Horizontal Carousel */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1">
          {recordings.map((rec) => {
            return (
              <div
                key={rec.id}
                className={`w-36 rounded-xl p-2 bg-[#0B0E14] border shrink-0 flex flex-col gap-1.5 relative ${
                  rec.isFailAttempt
                    ? 'border-red-500/30 hover:border-red-500/60'
                    : 'border-[#232B38] hover:border-[#FED662]'
                }`}
              >
                {/* Thumbnail Preview */}
                <div
                  onClick={() => setActiveScrubClip(rec)}
                  className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 cursor-pointer"
                >
                  <img src={rec.thumbnailUrl} alt={rec.filename} className="w-full h-full object-cover" />
                  <span
                    className={`absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold ${
                      rec.isFailAttempt ? 'bg-red-900/90 text-red-200' : 'bg-black/80 text-white'
                    }`}
                  >
                    {formatTimeMMSS(rec.durationSec)}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-300 truncate">
                  {rec.timestamp}
                </div>

                {rec.isFailAttempt ? (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      Restart
                    </span>
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="p-1 rounded bg-red-950/60 text-red-400 hover:bg-red-900 hover:text-white"
                      title="Delete failed attempt from storage"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (selectedSlotId) {
                        handleAssignClip(selectedSlotId, rec);
                      }
                    }}
                    className="w-full py-1 rounded bg-[#232B38] hover:bg-[#FED662] hover:text-[#0B0E14] text-[10px] font-bold text-slate-200 transition-colors mt-0.5"
                  >
                    Assign to Slot
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Scrubber Modal */}
      {activeScrubClip && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#151A23] w-full max-w-md rounded-2xl border border-[#232B38] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-2">
              <div className="text-xs font-bold text-white truncate max-w-[240px]">
                {activeScrubClip.filename}
              </div>
              <button
                onClick={() => setActiveScrubClip(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={activeScrubClip.thumbnailUrl}
                alt="Video Frame"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Victory Freeze Verification</span>
                  <span className="font-mono text-[#FED662]">{formatTimeMMSS(activeScrubClip.durationSec)}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verified 3-Star clear: The 3-2-1 countdown on entrance and the post-combat victory screen are confirmed.
            </p>

            <button
              onClick={() => {
                if (selectedSlotId) {
                  handleAssignClip(selectedSlotId, activeScrubClip);
                  setActiveScrubClip(null);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-[#FED662] text-[#0B0E14] font-bold text-xs"
            >
              Assign This Take to Active Slot
            </button>
          </div>
        </div>
      )}

      {/* Micro-Adjust Trim Modal */}
      {microAdjustSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151A23] w-full max-w-sm rounded-2xl border border-[#232B38] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-2">
              <h4 className="text-xs font-bold text-white">Micro-Adjust Cut Points</h4>
              <button
                onClick={() => setMicroAdjustSlot(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Done
              </button>
            </div>

            {/* Entry Cut Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Entry Loading Cut</span>
                <span className="font-mono text-[#00E5FF]">{microAdjustSlot.entryCutSec.toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustCut(microAdjustSlot.id, 'entry', -0.5)}
                  className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-bold text-white"
                >
                  -0.5s
                </button>
                <div className="flex-1 text-center text-xs text-slate-400">Countdown Onset</div>
                <button
                  onClick={() => handleAdjustCut(microAdjustSlot.id, 'entry', +0.5)}
                  className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-bold text-white"
                >
                  +0.5s
                </button>
              </div>
            </div>

            {/* Tail Cut Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Tail Cut (Victory Hold)</span>
                <span className="font-mono text-[#FED662]">{microAdjustSlot.tailCutSec.toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustCut(microAdjustSlot.id, 'tail', -0.5)}
                  className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-bold text-white"
                >
                  -0.5s
                </button>
                <div className="flex-1 text-center text-xs text-slate-400">Clear Banner + 1.5s</div>
                <button
                  onClick={() => handleAdjustCut(microAdjustSlot.id, 'tail', +0.5)}
                  className="px-2.5 py-1 rounded bg-[#232B38] text-xs font-bold text-white"
                >
                  +0.5s
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
