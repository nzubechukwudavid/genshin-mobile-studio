import { BgmTrack } from '../types';

export const DEFAULT_BGM_TRACKS: BgmTrack[] = [];

/**
 * Extracts real duration and metadata from a user-imported audio file
 */
export async function extractAudioMetadata(file: File): Promise<BgmTrack> {
  const audioUrl = URL.createObjectURL(file);
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = audioUrl;

  return new Promise((resolve) => {
    audio.onloadedmetadata = () => {
      const durationSec = Math.round(audio.duration) || 120;
      // Clean up title: remove extension and replace underscores
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      
      // Determine folder from webkitRelativePath if folder selection was used
      const relativePath = (file as any).webkitRelativePath || '';
      const folder = relativePath 
        ? relativePath.substring(0, relativePath.lastIndexOf('/')) 
        : 'Music/Imported';

      // Guess energy from filename keywords if present
      const lowerName = cleanTitle.toLowerCase();
      let energyHint: 'high' | 'chill' | 'general' = 'general';
      if (lowerName.includes('battle') || lowerName.includes('boss') || lowerName.includes('climax') || lowerName.includes('combat') || lowerName.includes('phase')) {
        energyHint = 'high';
      } else if (lowerName.includes('chill') || lowerName.includes('peace') || lowerName.includes('town') || lowerName.includes('night') || lowerName.includes('soft') || lowerName.includes('build')) {
        energyHint = 'chill';
      }

      resolve({
        id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        artist: 'Local Music Track',
        folder,
        durationSec,
        energyHint,
        path: `/sdcard/${folder}/${file.name}`,
        volumeGain: 0.0316, // -30.0 dB default per specification
        fadeInSec: 0.2,
        fadeOutSec: 1.5,
        inPointSec: 0,
        audioUrl,
        file
      });
    };

    audio.onerror = () => {
      resolve({
        id: `bgm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local Music Track',
        folder: 'Music',
        durationSec: 120,
        energyHint: 'general',
        path: `/sdcard/Music/${file.name}`,
        volumeGain: 0.0316,
        fadeInSec: 0.2,
        fadeOutSec: 1.5,
        inPointSec: 0,
        audioUrl,
        file
      });
    };
  });
}

export function scoreTrackForDuration(
  track: BgmTrack,
  targetSec: number,
  preferEnergy: 'high' | 'chill' | 'general' = 'high'
): { score: number; deltaSec: number; inPointSec: number } {
  const trackDur = track.durationSec;
  if (trackDur <= 0 || targetSec <= 0) {
    return { score: -1, deltaSec: 0, inPointSec: 0 };
  }

  const delta = trackDur - targetSec;
  let durScore = 0;
  let inPoint = 0;

  // 1. Duration delta scoring tiers
  if (delta >= 0 && delta <= 4.5) {
    // Ideal fit: Track finishes with natural reverb tail right as chamber finishes
    durScore = 1.0 - delta / 10.0;
  } else if (delta > 4.5) {
    if (delta <= 15.0) {
      // Slightly longer; smooth 1.5s fade-out handles it cleanly
      durScore = 0.75 - delta / 40.0;
    } else {
      // Long track: Use a virtual in-point
      durScore = 0.45;
      const maxIn = Math.max(0, trackDur - targetSec);
      inPoint = Math.min(maxIn, 20.0, Math.max(0, delta / 3.0));
    }
  } else {
    // Song is shorter than target chamber: looping required
    const ratio = Math.max(0.1, trackDur / targetSec);
    durScore = -0.15 + 0.35 * ratio;
  }

  // 2. Energy bonus/penalty
  let energyScore = 0.0;
  const energy = track.energyHint;
  if (preferEnergy === 'high') {
    if (energy === 'high') energyScore = 0.35;
    else if (energy === 'general') energyScore = 0.1;
    else if (energy === 'chill') energyScore = -0.3;
  } else if (preferEnergy === 'chill') {
    if (energy === 'chill') energyScore = 0.35;
    else if (energy === 'general') energyScore = 0.1;
    else if (energy === 'high') energyScore = -0.3;
  }

  const totalScore = Number((durScore + energyScore).toFixed(4));
  return {
    score: totalScore,
    deltaSec: Number(delta.toFixed(1)),
    inPointSec: Number(inPoint.toFixed(1))
  };
}

export function recommendBgmSuite(
  slotDurations: { key: string; label: string; targetSec: number; preferEnergy: 'high' | 'chill' }[],
  catalog: BgmTrack[] = []
): Record<string, { selected: BgmTrack | null; alternatives: BgmTrack[] }> {
  const result: Record<string, { selected: BgmTrack | null; alternatives: BgmTrack[] }> = {};
  if (catalog.length === 0) {
    for (const slot of slotDurations) {
      result[slot.key] = { selected: null, alternatives: [] };
    }
    return result;
  }

  const usedTrackIds = new Set<string>();

  for (const slot of slotDurations) {
    const scoredCandidates: { track: BgmTrack; score: number; deltaSec: number; inPointSec: number }[] = [];

    for (const track of catalog) {
      const { score, deltaSec, inPointSec } = scoreTrackForDuration(track, slot.targetSec, slot.preferEnergy);
      // Heavy penalty if already used in a previous chamber to guarantee zero duplicates
      const effectiveScore = usedTrackIds.has(track.id) ? score - 10.0 : score;

      scoredCandidates.push({
        track: {
          ...track,
          score: effectiveScore,
          deltaSec,
          inPointSec
        },
        score: effectiveScore,
        deltaSec,
        inPointSec
      });
    }

    scoredCandidates.sort((a, b) => b.score - a.score);

    const winner = scoredCandidates[0]?.track || null;
    if (winner) {
      usedTrackIds.add(winner.id);
    }

    const alternatives = scoredCandidates.slice(1, 4).map((c) => c.track);

    result[slot.key] = {
      selected: winner,
      alternatives
    };
  }

  return result;
}
