import { BgmTrack } from '../types';

export const DEFAULT_BGM_TRACKS: BgmTrack[] = [
  {
    id: 'track_rapid_wildfires',
    title: 'Rapid as Wildfires (Liyue Battle Theme)',
    artist: 'HOYO-MiX',
    folder: 'Music/Combat/Liyue',
    durationSec: 134, // 2:14
    energyHint: 'high',
    path: '/sdcard/Music/Combat/Rapid_as_Wildfires.mp3',
    volumeGain: 0.0316, // -30.0 dB
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 0
  },
  {
    id: 'track_duel_mist',
    title: 'Duel in the Mist (Inazuma Battle Theme)',
    artist: 'HOYO-MiX',
    folder: 'Music/Combat/Inazuma',
    durationSec: 112, // 1:52
    energyHint: 'high',
    path: '/sdcard/Music/Combat/Duel_in_the_Mist.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 0
  },
  {
    id: 'track_boreal_wind',
    title: 'Symphony of Boreal Wind (Andrius Climax)',
    artist: 'HOYO-MiX',
    folder: 'Music/Boss/Mondstadt',
    durationSec: 185, // 3:05
    energyHint: 'high',
    path: '/sdcard/Music/Boss/Symphony_of_Boreal_Wind.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 16.0 // Virtual in-point skips choral buildup to land right on combat drop
  },
  {
    id: 'track_rage_beneath',
    title: 'Rage Beneath the Mountains (Azhdaha Phase 2)',
    artist: 'HOYO-MiX',
    folder: 'Music/Boss/Liyue',
    durationSec: 238, // 3:58
    energyHint: 'high',
    path: '/sdcard/Music/Boss/Rage_Beneath_the_Mountains.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 20.0
  },
  {
    id: 'track_natlan_warrior',
    title: 'Anthem of the Blazing Path (Natlan Battle)',
    artist: 'HOYO-MiX',
    folder: 'Music/Combat/Natlan',
    durationSec: 126, // 2:06
    energyHint: 'high',
    path: '/sdcard/Music/Combat/Anthem_of_Blazing_Path.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 0
  },
  {
    id: 'track_whirl_of_leaves',
    title: 'Whirl of Leaves and Petals (Sumeru Battle)',
    artist: 'HOYO-MiX',
    folder: 'Music/Combat/Sumeru',
    durationSec: 108, // 1:48
    energyHint: 'high',
    path: '/sdcard/Music/Combat/Whirl_of_Leaves.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.1,
    fadeOutSec: 1.5,
    inPointSec: 0
  },
  {
    id: 'track_mondstadt_day',
    title: 'A Day in Mondstadt (Peaceful City Theme)',
    artist: 'HOYO-MiX',
    folder: 'Music/Chill/Towns',
    durationSec: 92, // 1:32
    energyHint: 'chill',
    path: '/sdcard/Music/Chill/A_Day_in_Mondstadt.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.5,
    fadeOutSec: 2.0,
    inPointSec: 0
  },
  {
    id: 'track_fontaine_harbor',
    title: 'Lumiose City Promenade (Acoustic Strings)',
    artist: 'HOYO-MiX',
    folder: 'Music/Chill/Fontaine',
    durationSec: 84, // 1:24
    energyHint: 'chill',
    path: '/sdcard/Music/Chill/Lumiose_Promenade.mp3',
    volumeGain: 0.0316,
    fadeInSec: 0.5,
    fadeOutSec: 2.0,
    inPointSec: 0
  }
];

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
      // Long track: Use a virtual in-point (start at musical drop)
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
  catalog: BgmTrack[] = DEFAULT_BGM_TRACKS
): Record<string, { selected: BgmTrack | null; alternatives: BgmTrack[] }> {
  const result: Record<string, { selected: BgmTrack | null; alternatives: BgmTrack[] }> = {};
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

    // Sort descending by score
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
