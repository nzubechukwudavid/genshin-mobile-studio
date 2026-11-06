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
  isFailAttempt: boolean; // < 30s or aborted
  thumbnailUrl: string;
  fileSizeMb: number;
}

export interface BgmTrack {
  id: string;
  title: string;
  artist: string;
  folder: string;
  durationSec: number;
  energyHint: 'high' | 'chill' | 'general';
  path: string;
  volumeGain: number; // e.g. 0.0316 (-30dB)
  fadeInSec: number;
  fadeOutSec: number;
  inPointSec: number;
  score?: number;
  deltaSec?: number;
  audioUrl?: string;
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

export interface CharacterEntry {
  name: string;
  element: 'Pyro' | 'Hydro' | 'Anemo' | 'Electro' | 'Dendro' | 'Cryo' | 'Geo';
  rarity: 4 | 5;
  weapon: string;
  avatarUrl: string;
  artUrl: string;
  splashUrl?: string;
  cardUrl?: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
}

export interface SlotCharacterState {
  character: string;
  element: string;
  constellation: string;
  archetype: string;
  customName: string;
  artUrl: string;
  scale: number;
  panX: number;
  panY: number;
  mirror: boolean;
  teammates: string[];
}

export interface ThumbnailStudioState {
  layoutMode: 'dual' | 'spotlight';
  side1: SlotCharacterState;
  side2: SlotCharacterState;
  centerStyle: 'spire' | 'rosette' | 'divider';
  floor: '12' | '11' | '10' | '9';
  hookText: string;
  showHook: boolean;
  starBadge: {
    enabled: boolean;
    text: string;
  };
  watermark: {
    enabled: boolean;
    text: string;
  };
  overlays: TextOverlay[];
  activeSlot: 1 | 2;
  showEyeGuide: boolean;
}

export interface YouTubeChapter {
  timestamp: string;
  seconds: number;
  title: string;
}
