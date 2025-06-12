import React from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  genres: string[];
  subGenres: string[];
  moods: string[];
  duration: string;
  bpm: number;
  hasStingEnding: boolean;
  isOneStop: boolean;
  audioUrl: string;
  image: string;
  mp3Url?: string;
  trackoutsUrl?: string;
  hasVocals?: boolean;
  vocalsUsageType?: 'normal' | 'sync_only';
  producerId: string; // Added explicit producerId field
  producer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  fileFormats: {
    stereoMp3: {
      format: string[];
      url: string;
    };
    stems: {
      format: string[];
      url: string;
    };
    stemsWithVocals: {
      format: string[];
      url: string;
    };
  };
  pricing: {
    stereoMp3: number;
    stems: number;
    stemsWithVocals: number;
  };
  leaseAgreementUrl: string;
}

export interface SyncProposal {
  id: string;
  trackId: string;
  clientId: string;
  projectType: string;
  duration: string;
  isExclusive: boolean;
  syncFee: number;
  paymentTerms: 'immediate' | 'net30' | 'net60' | 'net90';
  expirationDate: string;
  isUrgent: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}

// Updated genres to be lowercase and match database constraint pattern
export const GENRES = [
  'hiphop',
  'rnb',
  'pop',
  'rock',
  'electronic',
  'jazz',
  'classical',
  'world',
  'religious',
  'childrens'
] as const;

export const SUB_GENRES = {
  'hiphop': ['trap', 'boom bap', 'lo fi', 'drill', 'west coast', 'east coast'],
  'rnb': ['soul', 'neo soul', 'contemporary', 'gospel'],
  'pop': ['indie pop', 'synth pop', 'k pop', 'dance pop'],
  'rock': ['alternative', 'indie rock', 'metal', 'punk'],
  'electronic': ['house', 'techno', 'ambient', 'drum and bass', 'dubstep'],
  'jazz': ['smooth jazz', 'bebop', 'fusion', 'contemporary'],
  'classical': ['orchestral', 'chamber', 'contemporary', 'minimalist'],
  'world': ['latin', 'african', 'asian', 'middle eastern'],
  'religious': ['gospel', 'contemporary christian', 'worship', 'sacred', 'spiritual'],
  'childrens': [
    'playful',
    'whimsical',
    'educational',
    'nursery rhyme',
    'lullaby',
    'adventure fantasy',
    'silly and goofy',
    'interactive'
  ],
} as const;

export const MUSICAL_KEYS = [
  'C Major',
  'C♯ Major / D♭ Major',
  'D Major',
  'D♯ Major / E♭ Major',
  'E Major',
  'F Major',
  'F♯ Major / G♭ Major',
  'G Major',
  'G♯ Major / A♭ Major',
  'A Major',
  'A♯ Major / B♭ Major',
  'B Major',
  'A Minor',
  'A♯ Minor / B♭ Minor',
  'B Minor',
  'C Minor',
  'C♯ Minor / D♭ Minor',
  'D Minor',
  'D♯ Minor / E♭ Minor',
  'E Minor',
  'F Minor',
  'F♯ Minor / G♭ Minor',
  'G Minor',
  'G♯ Minor / A♭ Minor'
] as const;

export const MOODS_CATEGORIES = {
  'Happy & Upbeat': [
    'joyful', 'energetic', 'cheerful', 'playful', 'optimistic', 'excited', 
    'celebratory', 'triumphant', 'uplifting', 'bouncy', 'bright', 'carefree', 
    'euphoric', 'lively'
  ],
  'Sad & Melancholic': [
    'heartbroken', 'melancholy', 'nostalgic', 'somber', 'depressed', 'reflective',
    'gloomy', 'bitter', 'yearning', 'mournful', 'haunting', 'regretful', 'lonely',
    'poignant'
  ],
  'Calm & Relaxing': [
    'peaceful', 'serene', 'soothing', 'meditative', 'dreamy', 'gentle', 'tranquil',
    'ethereal', 'laid back', 'floating', 'mellow', 'soft', 'cozy', 'chill'
  ],
  'Dark & Mysterious': [
    'ominous', 'creepy', 'foreboding', 'brooding', 'tense', 'haunting', 'moody',
    'sinister', 'suspenseful', 'menacing', 'eerie', 'shadowy'
  ],
  'Romantic & Intimate': [
    'loving', 'passionate', 'sensual', 'tender', 'intimate', 'lustful', 'heartfelt',
    'longing', 'sweet', 'sentimental', 'gentle', 'warm'
  ],
  'Aggressive & Intense': [
    'angry', 'furious', 'chaotic', 'explosive', 'fierce', 'powerful', 'rebellious',
    'savage', 'heavy', 'relentless', 'unstoppable', 'wild'
  ],
  'Epic & Heroic': [
    'majestic', 'triumphant', 'victorious', 'grand', 'inspirational', 'dramatic',
    'cinematic', 'monumental', 'glorious', 'adventurous', 'powerful'
  ],
  'Quirky & Fun': [
    'wacky', 'silly', 'funky', 'playful', 'bizarre', 'eccentric', 'whimsical',
    'goofy', 'zany', 'cheerful'
  ],
  'Inspirational & Hopeful': [
    'motivational', 'encouraging', 'uplifting', 'aspirational', 'bright',
    'confident', 'positive', 'driving', 'determined'
  ],
  'Mysterious & Suspenseful': [
    'enigmatic', 'secretive', 'cryptic', 'suspenseful', 'intriguing',
    'tense', 'unresolved'
  ],
  'Groovy & Funky': [
    'smooth', 'cool', 'retro', 'stylish', 'sassy', 'funky', 'catchy', 'hypnotic'
  ],
  'Otherworldly & Fantasy': [
    'mystical', 'ethereal', 'enchanted', 'magical', 'cosmic', 'dreamlike',
    'celestial', 'floating'
  ]
} as const;

export const MOODS = Array.from(
  new Set(
    Object.values(MOODS_CATEGORIES).flat()
  )
).sort() as readonly string[];

export const FILE_FORMATS = ['MP3', 'WAV', 'AIFF'] as const;
