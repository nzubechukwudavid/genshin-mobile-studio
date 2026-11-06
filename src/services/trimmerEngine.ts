import { RawRecording, ClipSlot, EditingMode } from '../types';

export const INITIAL_RECORDINGS: RawRecording[] = [
  {
    id: 'rec_01_c12_1',
    filename: 'Screenrecorder-2026-11-06-14-22-10-128.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-22-10-128.mp4',
    durationSec: 134, // 2:14
    timestamp: '14:22',
    isFailAttempt: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 428
  },
  {
    id: 'rec_fail_01',
    filename: 'Screenrecorder-2026-11-06-14-25-02-094.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-25-02-094.mp4',
    durationSec: 28, // 0:28 - Failed take (Bennett died)
    timestamp: '14:25',
    isFailAttempt: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 88
  },
  {
    id: 'rec_02_c12_2',
    filename: 'Screenrecorder-2026-11-06-14-27-44-512.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-27-44-512.mp4',
    durationSec: 112, // 1:52
    timestamp: '14:27',
    isFailAttempt: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 356
  },
  {
    id: 'rec_fail_02',
    filename: 'Screenrecorder-2026-11-06-14-31-15-778.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-31-15-778.mp4',
    durationSec: 19, // 0:19 - Misclicked rotation
    timestamp: '14:31',
    isFailAttempt: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 60
  },
  {
    id: 'rec_03_c12_3',
    filename: 'Screenrecorder-2026-11-06-14-33-58-204.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-33-58-204.mp4',
    durationSec: 148, // 2:28
    timestamp: '14:33',
    isFailAttempt: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 472
  },
  {
    id: 'rec_04_builds',
    filename: 'Screenrecorder-2026-11-06-14-38-40-662.mp4',
    path: '/sdcard/DCIM/ScreenRecorder/Screenrecorder-2026-11-06-14-38-40-662.mp4',
    durationSec: 90, // 1:30 - Character builds showcase
    timestamp: '14:38',
    isFailAttempt: false,
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320&auto=format&fit=crop&q=80',
    fileSizeMb: 288
  }
];

export function createInitialSlots(mode: EditingMode): ClipSlot[] {
  if (mode === 'stygian') {
    return [
      {
        id: 'slot_boss_1',
        chamberKey: 'boss_1',
        title: 'Battlefield 1: Domovoy Sculptor',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 3.0,
        tailCutSec: 130.0,
        effectiveCombatSec: 127.0,
        assignedBgm: null,
        bgmAlternatives: []
      },
      {
        id: 'slot_boss_2',
        chamberKey: 'boss_2',
        title: 'Battlefield 2: Overseer Device',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 2.8,
        tailCutSec: 110.0,
        effectiveCombatSec: 107.2,
        assignedBgm: null,
        bgmAlternatives: []
      },
      {
        id: 'slot_boss_3',
        chamberKey: 'boss_3',
        title: 'Battlefield 3: Guardian Blade',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 3.2,
        tailCutSec: 144.0,
        effectiveCombatSec: 140.8,
        assignedBgm: null,
        bgmAlternatives: []
      },
      {
        id: 'slot_builds',
        chamberKey: 'builds',
        title: 'Character Builds & Artifacts',
        subtitle: 'Weapons, artifacts, and constellation showcase',
        assignedClip: null,
        entryCutSec: 0.0,
        tailCutSec: 90.0,
        effectiveCombatSec: 90.0,
        assignedBgm: null,
        bgmAlternatives: []
      }
    ];
  }

  // Standard Basic F12 & Showcase
  return [
    {
      id: 'slot_c12_1',
      chamberKey: 'chamber_1',
      title: 'Chamber 12-1 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (3-Star Victory Freeze)',
      assignedClip: null,
      entryCutSec: 3.2,
      tailCutSec: 131.0,
      intermissionStartSec: 64.0,
      intermissionEndSec: 67.5,
      effectiveCombatSec: 124.3,
      assignedBgm: null,
      bgmAlternatives: []
    },
    {
      id: 'slot_c12_2',
      chamberKey: 'chamber_2',
      title: 'Chamber 12-2 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (3-Star Victory Freeze)',
      assignedClip: null,
      entryCutSec: 2.9,
      tailCutSec: 109.5,
      intermissionStartSec: 52.0,
      intermissionEndSec: 55.2,
      effectiveCombatSec: 103.4,
      assignedBgm: null,
      bgmAlternatives: []
    },
    {
      id: 'slot_c12_3',
      chamberKey: 'chamber_3',
      title: 'Chamber 12-3 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (Floor 12 36★ Complete)',
      assignedClip: null,
      entryCutSec: 3.4,
      tailCutSec: 144.0,
      intermissionStartSec: 71.0,
      intermissionEndSec: 74.5,
      effectiveCombatSec: 137.1,
      assignedBgm: null,
      bgmAlternatives: []
    },
    {
      id: 'slot_builds',
      chamberKey: 'builds',
      title: 'Character Builds & Artifacts',
      subtitle: 'Weapons, artifacts, stats, and talent levels',
      assignedClip: null,
      entryCutSec: 0.0,
      tailCutSec: 90.0,
      effectiveCombatSec: 90.0,
      assignedBgm: null,
      bgmAlternatives: []
    }
  ];
}

export function formatTimeMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
