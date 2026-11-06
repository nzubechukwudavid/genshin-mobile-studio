import React, { useState } from 'react';
import { BgmTrack } from '../types';
import { formatTimeMMSS } from '../services/trimmerEngine';
import { Music, Play, Pause, Folder, Sparkles, Plus, Volume2 } from 'lucide-react';

interface BgmManagerViewProps {
  tracks: BgmTrack[];
  onAddTrack: (track: BgmTrack) => void;
}

export const BgmManagerView: React.FC<BgmManagerViewProps> = ({ tracks, onAddTrack }) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackFolder, setNewTrackFolder] = useState('Music/Combat');
  const [newTrackDuration, setNewTrackDuration] = useState(120);

  // Extract unique subfolders
  const folders = ['all', ...Array.from(new Set(tracks.map((t) => t.folder)))];

  const handlePlayToggle = (track: BgmTrack) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(track.id);
      // Play brief simulated sound beep or preview
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = track.energyHint === 'chill' ? 330 : 520;
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        setTimeout(() => {
          osc.stop();
          audioCtx.close();
        }, 800);
      } catch {}
    }
  };

  const handleCreateCustomTrack = () => {
    if (!newTrackTitle) return;
    const isChill = newTrackFolder.toLowerCase().includes('chill');
    const custom: BgmTrack = {
      id: `custom_${Date.now()}`,
      title: newTrackTitle,
      artist: 'Custom User Track',
      folder: newTrackFolder,
      durationSec: newTrackDuration,
      energyHint: isChill ? 'chill' : 'high',
      path: `/sdcard/${newTrackFolder}/${newTrackTitle.replace(/\s+/g, '_')}.mp3`,
      volumeGain: 0.0316,
      fadeInSec: 0.1,
      fadeOutSec: 1.5,
      inPointSec: 0
    };
    onAddTrack(custom);
    setNewTrackTitle('');
    setIsAddModalOpen(false);
  };

  const filteredTracks = tracks.filter((t) => {
    return selectedFolder === 'all' || t.folder === selectedFolder;
  });

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Directory Status Header */}
      <div className="bg-[#151A23] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-[#FED662]" />
              <span>LOCAL MUSIC LIBRARY</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Recursive scan of <code className="text-[#00E5FF]">/sdcard/Music/**</code>
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#232B38] text-white text-xs font-semibold hover:bg-[#2C3646] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Track
          </button>
        </div>

        {/* Folder Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pt-1">
          {folders.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFolder === f
                  ? 'bg-[#FED662] text-[#0B0E14] font-bold'
                  : 'bg-[#0B0E14] text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'ALL SUBFOLDERS' : f.replace('Music/', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-bold text-slate-400 px-1">
          INDEXED TRACKS ({filteredTracks.length}) · BROADCAST NORMALIZED (-30 dB)
        </div>

        {filteredTracks.map((track) => {
          const isPlaying = playingTrackId === track.id;
          return (
            <div
              key={track.id}
              className="bg-[#12161E] rounded-xl p-3 border border-[#232B38] flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handlePlayToggle(track)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isPlaying
                      ? 'bg-[#FED662] text-[#0B0E14]'
                      : 'bg-[#232B38] text-slate-300 hover:text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{track.title}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{track.artist}</span>
                    <span>·</span>
                    <span className="text-[#FED662]">{track.folder.replace('Music/', '')}</span>
                    <span>·</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        track.energyHint === 'high'
                          ? 'bg-orange-500/10 text-orange-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {track.energyHint} energy
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs text-slate-300">
                  {formatTimeMMSS(track.durationSec)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Track Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151A23] w-full max-w-sm rounded-2xl border border-[#232B38] p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white">Add Music Track</h4>

            <div>
              <label className="text-xs text-slate-400">Song Title</label>
              <input
                type="text"
                placeholder="e.g. Die Mittsommernacht-Fantasie"
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                className="w-full bg-[#0B0E14] border border-[#232B38] rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-[#FED662]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Subfolder</label>
              <select
                value={newTrackFolder}
                onChange={(e) => setNewTrackFolder(e.target.value)}
                className="w-full bg-[#0B0E14] border border-[#232B38] rounded-xl px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-[#FED662]"
              >
                <option value="Music/Combat/Liyue">Music/Combat/Liyue (High Energy)</option>
                <option value="Music/Combat/Inazuma">Music/Combat/Inazuma (High Energy)</option>
                <option value="Music/Boss/Natlan">Music/Boss/Natlan (Climax)</option>
                <option value="Music/Chill/Towns">Music/Chill/Towns (Builds Outro)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400">Duration (Seconds)</label>
              <input
                type="number"
                min="30"
                max="600"
                value={newTrackDuration}
                onChange={(e) => setNewTrackDuration(parseInt(e.target.value) || 120)}
                className="w-full bg-[#0B0E14] border border-[#232B38] rounded-xl px-3 py-2 text-xs text-white mt-1 font-mono focus:outline-none focus:border-[#FED662]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#232B38] text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomTrack}
                className="flex-1 py-2 rounded-xl bg-[#FED662] text-xs font-bold text-[#0B0E14]"
              >
                Save Track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
