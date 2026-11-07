import React, { useState, useRef, useEffect } from 'react';
import { BgmTrack } from '../types';
import { formatTimeMMSS } from '../services/trimmerEngine';
import { extractAudioMetadata } from '../services/musicRecommender';
import { autoScanMusic, isNativeAndroid } from '../services/nativeBridge';
import { Music, Play, Pause, Folder, Plus, Volume2, Upload, Trash2, FolderOpen, RefreshCw, ChevronDown } from 'lucide-react';

interface BgmManagerViewProps {
  tracks: BgmTrack[];
  onAddTracks: (tracks: BgmTrack[]) => void;
  onDeleteTrack: (id: string) => void;
}

const COMMON_DIRECTORIES = [
  { label: 'Entire Music Library (/sdcard/Music)', path: '/sdcard/Music' },
  { label: 'Genshin OST (/sdcard/Music/Genshin Impact)', path: '/sdcard/Music/Genshin Impact' },
  { label: 'NCS Music (/sdcard/Music/NCS Music)', path: '/sdcard/Music/NCS Music' },
  { label: 'Downloads (/sdcard/Download)', path: '/sdcard/Download' }
];

export const BgmManagerView: React.FC<BgmManagerViewProps> = ({
  tracks,
  onAddTracks,
  onDeleteTrack
}) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPath, setCustomPath] = useState<string>('/sdcard/Music');
  const [showPathDropdown, setShowPathDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scan /sdcard/Music on mount if tracks are empty
  useEffect(() => {
    if (isNativeAndroid && tracks.length === 0) {
      handleScanMusicFolder('/sdcard/Music');
    }
  }, []);

  const handleScanMusicFolder = async (targetPath: string = customPath) => {
    if (isNativeAndroid) {
      setIsProcessing(true);
      try {
        const scanned = await autoScanMusic(targetPath);
        if (scanned && scanned.length > 0) {
          onAddTracks(scanned);
        }
      } catch (err) {
        console.warn('Scan music error:', err);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    fileInputRef.current?.click();
  };

  // Extract unique subfolders
  const rawFolders = Array.from(new Set(tracks.map((t) => t.folder || 'Music')));
  const folders = ['all', ...rawFolders];

  // Process user selected audio files
  const handleAudioFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newTracks: BgmTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.flac') || file.name.endsWith('.wav') || file.name.endsWith('.ogg') || file.name.endsWith('.m4a')) {
        const track = await extractAudioMetadata(file);
        newTracks.push(track);
      }
    }

    if (newTracks.length > 0) {
      onAddTracks(newTracks);
    }
    setIsProcessing(false);
    e.target.value = '';
  };

  // Play / Pause real audio track with volume normalization
  const handlePlayToggle = (track: BgmTrack) => {
    if (playingTrackId === track.id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingTrackId(null);
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }

      if (track.audioUrl) {
        const audio = new Audio(track.audioUrl);
        audio.volume = 0.35; // Normalized audition volume
        audio.play().catch((err) => {
          console.warn('Audio playback error:', err);
        });
        audio.onended = () => setPlayingTrackId(null);
        currentAudioRef.current = audio;
        setPlayingTrackId(track.id);
      } else {
        setPlayingTrackId(track.id);
        setTimeout(() => setPlayingTrackId(null), 1500);
      }
    }
  };

  const filteredTracks = tracks.filter((t) => {
    return selectedFolder === 'all' || t.folder === selectedFolder;
  });

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Hidden file input for music files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAudioFilesSelected}
        multiple
        accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a"
        className="hidden"
      />

      {/* Directory Status Header */}
      <div className="bg-[#151A23] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-[#FED662]" />
              <span>BGM LIBRARY CRAWLER</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#232B38] text-slate-300 font-mono">
                {tracks.length} Tracks
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Recursive scanner for <code className="text-[#00E5FF]">{customPath}/**</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-2.5 py-1.5 rounded-xl bg-[#232B38] text-white text-xs font-bold hover:bg-[#2C3646] flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[#FED662]" />
              <span className="hidden sm:inline">Pick Files</span>
            </button>
            <button
              onClick={() => handleScanMusicFolder(customPath)}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-[#FED662] text-[#0B0E14] text-xs font-black hover:brightness-110 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Crawling...' : 'Scan Folder'}</span>
            </button>
          </div>
        </div>

        {/* Path Selection / Custom Path Box */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[#232B38]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/sdcard/Music"
              className="flex-1 bg-[#0B0E14] border border-[#232B38] rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#FED662]"
            />
            <button
              onClick={() => setShowPathDropdown(!showPathDropdown)}
              className="px-2 py-1.5 rounded-xl bg-[#232B38] text-slate-300 hover:text-white flex items-center gap-1 text-xs"
              title="Common Folders"
            >
              <span>Presets</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {showPathDropdown && (
            <div className="bg-[#0B0E14] border border-[#232B38] rounded-xl p-1.5 flex flex-col gap-1 shadow-xl">
              {COMMON_DIRECTORIES.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => {
                    setCustomPath(dir.path);
                    setShowPathDropdown(false);
                    handleScanMusicFolder(dir.path);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    customPath === dir.path
                      ? 'bg-[#FED662] text-[#0B0E14] font-bold'
                      : 'text-slate-300 hover:bg-[#1A212D]'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Folder Filter Chips */}
        {folders.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pt-1 no-scrollbar">
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
                {f === 'all' ? 'ALL SUBFOLDERS' : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracks List */}
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-bold text-slate-400 px-1">
          INDEXED BGM TRACKS ({filteredTracks.length}) · NORMALIZED (-30.0 dB)
        </div>

        {filteredTracks.length === 0 ? (
          <div 
            onClick={() => handleScanMusicFolder(customPath)}
            className="border-2 border-dashed border-[#232B38] hover:border-[#FED662]/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#0B0E14]/50 text-center"
          >
            <Music className="w-8 h-8 text-slate-500" />
            <div className="text-xs font-bold text-slate-200">No BGM tracks indexed yet</div>
            <div className="text-[11px] text-slate-400 max-w-xs">
              Tap here to scan <code className="text-[#00E5FF]">{customPath}</code>. All subfolders are crawled recursively with zero manual imports needed.
            </div>
          </div>
        ) : (
          filteredTracks.map((track) => {
            const isPlaying = playingTrackId === track.id;
            return (
              <div
                key={track.id}
                className="bg-[#12161E] rounded-xl p-3 border border-[#232B38] flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handlePlayToggle(track)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      isPlaying
                        ? 'bg-[#FED662] text-[#0B0E14]'
                        : 'bg-[#232B38] text-slate-300 hover:text-white'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{track.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="text-[#FED662] truncate max-w-[130px]">{track.folder}</span>
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
                      <span>·</span>
                      <span>Vol: -30 dB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-slate-300">
                    {formatTimeMMSS(track.durationSec)}
                  </span>
                  <button
                    onClick={() => onDeleteTrack(track.id)}
                    className="p-1.5 rounded-lg bg-[#232B38] text-slate-400 hover:text-red-400"
                    title="Remove Track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
