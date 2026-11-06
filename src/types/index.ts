export type EditingMode = 'basic' | 'showcase' | 'stygian';

export type StygianTopology = 
  | 'topology_2x2' 
  | 'topology_continuous' 
  | 'topology_per_boss' 
  | 'topology_unified_combat';

export interface RawRecording {
  id: string;
  filename: string;
  path: string;
  durationSec: number;
  timestamp: string;
  isFailAttempt: boolean; // < 30s or aborted take
  thumbnailUrl: string;
  fileSizeMb: number;
  file?: File;
  objectUrl?: string;
  width?: number;
  height?: number;
}

export interface BgmTrack {
  id: string;
  title: string;
  artist: string;
  folder: string;
  durationSec: number;
  energyHint: 'high' | 'chill' | 'general';
  path: string;
  volumeGain: number; // 0.0316 (-30dB)
  fadeInSec: number;
  fadeOutSec: number;
  inPointSec: number;
  score?: number;
  deltaSec?: number;
  audioUrl?: string;
  file?: File;
}

export interface ClipSlot {
  id: string;
  chamberKey: string;
  title: string;
  subtitle: string;
  assignedClip: RawRecording | null;
  entryCutSec: number;
  tailCutSec: number;
  intermissionStartSec?: number;
  intermissionEndSec?: number;
  effectiveCombatSec: number;
  assignedBgm: BgmTrack | null;
  bgmAlternatives: BgmTrack[];
}

export interface YouTubeChapter {
  timestamp: string;
  seconds: number;
  title: string;
}
