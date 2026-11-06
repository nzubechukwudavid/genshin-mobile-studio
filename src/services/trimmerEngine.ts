import { RawRecording, ClipSlot, EditingMode } from '../types';

export const INITIAL_RECORDINGS: RawRecording[] = [];

/**
 * Extracts metadata and real video snapshot thumbnail from a user-selected video file
 */
export async function extractVideoMetadata(file: File): Promise<RawRecording> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      const durationSec = Math.round(video.duration) || 60;
      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;
      const isFailAttempt = durationSec < 30; // Under 30s is classified as restart / fail take

      // Seek to capture a real preview thumbnail frame
      const seekTime = Math.min(durationSec * 0.25, 10);
      video.currentTime = seekTime;

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            const timestamp = new Date(file.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            resolve({
              id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              filename: file.name,
              path: `/sdcard/DCIM/ScreenRecorder/${file.name}`,
              durationSec,
              timestamp,
              isFailAttempt,
              thumbnailUrl,
              fileSizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
              file,
              objectUrl,
              width,
              height
            });
            return;
          }
        } catch {
          // Fallback if canvas capture encounters a security restriction
        }

        resolve({
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          filename: file.name,
          path: `/sdcard/DCIM/ScreenRecorder/${file.name}`,
          durationSec,
          timestamp: new Date(file.lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFailAttempt,
          thumbnailUrl: '',
          fileSizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
          file,
          objectUrl,
          width,
          height
        });
      };
    };

    video.onerror = () => {
      resolve({
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filename: file.name,
        path: `/sdcard/DCIM/ScreenRecorder/${file.name}`,
        durationSec: 120,
        timestamp: 'Now',
        isFailAttempt: false,
        thumbnailUrl: '',
        fileSizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
        file,
        objectUrl
      });
    };
  });
}

/**
 * Creates empty timeline slots for the chosen mode
 */
export function createInitialSlots(mode: EditingMode): ClipSlot[] {
  if (mode === 'stygian') {
    return [
      {
        id: 'slot_boss_1',
        chamberKey: 'boss_1',
        title: 'Battlefield 1: Boss Take',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 3.0,
        tailCutSec: 120.0,
        effectiveCombatSec: 117.0,
        assignedBgm: null,
        bgmAlternatives: []
      },
      {
        id: 'slot_boss_2',
        chamberKey: 'boss_2',
        title: 'Battlefield 2: Boss Take',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 3.0,
        tailCutSec: 120.0,
        effectiveCombatSec: 117.0,
        assignedBgm: null,
        bgmAlternatives: []
      },
      {
        id: 'slot_boss_3',
        chamberKey: 'boss_3',
        title: 'Battlefield 3: Boss Take',
        subtitle: 'Entry countdown -> Victory screen (+2.0s hold)',
        assignedClip: null,
        entryCutSec: 3.0,
        tailCutSec: 120.0,
        effectiveCombatSec: 117.0,
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

  // Standard Basic F12 (12-1, 12-2, 12-3, Builds)
  return [
    {
      id: 'slot_c12_1',
      chamberKey: 'chamber_1',
      title: 'Chamber 12-1 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (3-Star Victory Freeze)',
      assignedClip: null,
      entryCutSec: 3.2,
      tailCutSec: 120.0,
      intermissionStartSec: 60.0,
      intermissionEndSec: 63.5,
      effectiveCombatSec: 113.3,
      assignedBgm: null,
      bgmAlternatives: []
    },
    {
      id: 'slot_c12_2',
      chamberKey: 'chamber_2',
      title: 'Chamber 12-2 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (3-Star Victory Freeze)',
      assignedClip: null,
      entryCutSec: 3.0,
      tailCutSec: 120.0,
      intermissionStartSec: 60.0,
      intermissionEndSec: 63.5,
      effectiveCombatSec: 113.5,
      assignedBgm: null,
      bgmAlternatives: []
    },
    {
      id: 'slot_c12_3',
      chamberKey: 'chamber_3',
      title: 'Chamber 12-3 (Side 1 & 2)',
      subtitle: 'Side 1 -> Intermission -> Side 2 (Floor 12 36★ Complete)',
      assignedClip: null,
      entryCutSec: 3.2,
      tailCutSec: 120.0,
      intermissionStartSec: 60.0,
      intermissionEndSec: 63.5,
      effectiveCombatSec: 113.3,
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
