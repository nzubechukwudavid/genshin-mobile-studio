import { ClipSlot, YouTubeChapter, ThumbnailStudioState } from '../types';
import { formatTimeMMSS } from './trimmerEngine';

export function calculateChapters(
  slots: ClipSlot[],
  thumbnailState: ThumbnailStudioState
): { chapters: YouTubeChapter[]; totalDurationSec: number } {
  const chapters: YouTubeChapter[] = [];
  let currentTime = 0;

  for (const slot of slots) {
    if (!slot.assignedClip) continue;

    let title = slot.title;
    if (slot.chamberKey === 'chamber_1') {
      title = `Chamber 12-1 (${thumbnailState.side1.character} ${thumbnailState.side1.archetype})`;
    } else if (slot.chamberKey === 'chamber_2') {
      title = `Chamber 12-2 (${thumbnailState.side2.character} ${thumbnailState.side2.archetype})`;
    } else if (slot.chamberKey === 'chamber_3') {
      title = `Chamber 12-3 (36★ Clear)`;
    } else if (slot.chamberKey === 'builds') {
      title = `Character Builds, Weapons & Artifacts`;
    }

    chapters.push({
      timestamp: formatTimeMMSS(currentTime),
      seconds: currentTime,
      title
    });

    currentTime += slot.effectiveCombatSec;
  }

  return { chapters, totalDurationSec: currentTime };
}

export function generateYouTubeDescription(
  slots: ClipSlot[],
  thumbnailState: ThumbnailStudioState,
  patchVersion: string = '7.1'
): string {
  const { chapters } = calculateChapters(slots, thumbnailState);

  const timestampLines = chapters.map((c) => `${c.timestamp} - ${c.title}`).join('\n');

  // Music credits
  const musicLines = slots
    .filter((s) => s.assignedBgm && s.assignedClip)
    .map((s) => {
      const ch = chapters.find((c) => c.title.includes(s.title) || s.title.includes(c.title));
      const ts = ch ? ch.timestamp : '00:00';
      return `${ts} - ${s.assignedBgm?.title} (${s.assignedBgm?.artist})`;
    })
    .join('\n');

  return `Genshin Impact Spiral Abyss Version ${patchVersion} Floor 12 Showcase!
Featuring ${thumbnailState.side1.constellation} ${thumbnailState.side1.character} (${thumbnailState.side1.archetype}) & ${thumbnailState.side2.constellation} ${thumbnailState.side2.character} (${thumbnailState.side2.archetype}).

⏱️ TIMESTAMPS:
${timestampLines || '00:00 - Full Run'}

🎵 BACKGROUND MUSIC:
${musicLines || 'HOYO-MiX Official Battle Tracks'}

Team Lineup:
• Side 1: ${thumbnailState.side1.teammates.join(' · ')}
• Side 2: ${thumbnailState.side2.teammates.join(' · ')}

Recorded directly on Xiaomi 13T Pro (1080p 60fps).
Edited & Assembled with Android Auto-Editor (Genshin Abyss Studio Mobile).

#GenshinImpact #SpiralAbyss #Floor12 #Mavuika #Chasca #GenshinShowcase`;
}
