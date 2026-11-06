import { ClipSlot, YouTubeChapter } from '../types';
import { formatTimeMMSS } from './trimmerEngine';

export function calculateChapters(
  slots: ClipSlot[]
): { chapters: YouTubeChapter[]; totalDurationSec: number } {
  const chapters: YouTubeChapter[] = [];
  let currentTime = 0;

  for (const slot of slots) {
    if (!slot.assignedClip) continue;

    chapters.push({
      timestamp: formatTimeMMSS(currentTime),
      seconds: currentTime,
      title: slot.title
    });

    currentTime += slot.effectiveCombatSec;
  }

  return { chapters, totalDurationSec: currentTime };
}

export function generateYouTubeDescription(
  slots: ClipSlot[],
  patchVersion: string = '5.x'
): string {
  const { chapters } = calculateChapters(slots);

  const timestampLines = chapters.map((c) => `${c.timestamp} - ${c.title}`).join('\n');

  // Music credits from assigned BGMs
  const musicLines = slots
    .filter((s) => s.assignedBgm && s.assignedClip)
    .map((s) => {
      const ch = chapters.find((c) => c.title === s.title);
      const ts = ch ? ch.timestamp : '00:00';
      return `${ts} - ${s.assignedBgm?.title} (${s.assignedBgm?.artist})`;
    })
    .join('\n');

  return `Genshin Impact Spiral Abyss Floor 12 36★ Clear!

⏱️ TIMESTAMPS:
${timestampLines || '00:00 - Full Run'}

🎵 SOUNDTRACK & BGM:
${musicLines || 'Dynamic In-Game SFX (-20 dB) + Custom BGM (-30 dB)'}

Settings:
• Audio Ducking: Disabled (Native SFX -20 dB, BGM -30 dB)
• In-Chamber Fade: 0.5s Black Fade
• Recorded on Xiaomi 13T Pro (1080p 60fps)
• Auto-Assembled via Android Auto-Editor

#GenshinImpact #SpiralAbyss #Floor12 #GenshinShowcase`;
}
