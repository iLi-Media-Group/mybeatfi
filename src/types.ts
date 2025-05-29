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

export const GENRES = [
  'Hiphop',
  'R&B',
  'Pop',
  'Rock',
  'Electronic',
  'Jazz',
  'Classical',
  'World',
  'Religious',
  "Children's Music",
] as const;

export const SUB_GENRES = {
  'Hiphop': ['Trap', 'Boom Bap', 'Lo-Fi', 'Drill', 'West Coast', 'East Coast'],
  'R&B': ['Soul', 'Neo Soul', 'Contemporary', 'Gospel'],
  'Pop': ['Indie Pop', 'Synth Pop', 'K-Pop', 'Dance Pop'],
  'Rock': ['Alternative', 'Indie Rock', 'Metal', 'Punk'],
  'Electronic': ['House', 'Techno', 'Ambient', 'Drum & Bass', 'Dubstep'],
  'Jazz': ['Smooth Jazz', 'Bebop', 'Fusion', 'Contemporary'],
  'Classical': ['Orchestral', 'Chamber', 'Contemporary', 'Minimalist'],
  'World': ['Latin', 'African', 'Asian', 'Middle Eastern'],
  'Religious': ['Gospel', 'Contemporary Christian', 'Worship', 'Sacred', 'Spiritual'],
  "Children's Music": [
    'Playful',
    'Whimsical',
    'Educational',
    'Nursery Rhyme',
    'Lullaby',
    'Adventure/Fantasy',
    'Silly & Goofy',
    'Interactive'
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
    'Joyful', 'Energetic', 'Cheerful', 'Playful', 'Optimistic', 'Excited', 
    'Celebratory', 'Triumphant', 'Uplifting', 'Bouncy', 'Bright', 'Carefree', 
    'Euphoric', 'Lively'
  ],
  'Sad & Melancholic': [
    'Heartbroken', 'Melancholy', 'Nostalgic', 'Somber', 'Depressed', 'Reflective',
    'Gloomy', 'Bitter', 'Yearning', 'Mournful', 'Haunting', 'Regretful', 'Lonely',
    'Poignant'
  ],
  'Calm & Relaxing': [
    'Peaceful', 'Serene', 'Soothing', 'Meditative', 'Dreamy', 'Gentle', 'Tranquil',
    'Ethereal', 'Laid-back', 'Floating', 'Mellow', 'Soft', 'Cozy', 'Chill'
  ],
  'Dark & Mysterious': [
    'Ominous', 'Creepy', 'Foreboding', 'Brooding', 'Tense', 'Haunting', 'Moody',
    'Sinister', 'Suspenseful', 'Menacing', 'Eerie', 'Shadowy'
  ],
  'Romantic & Intimate': [
    'Loving', 'Passionate', 'Sensual', 'Tender', 'Intimate', 'Lustful', 'Heartfelt',
    'Longing', 'Sweet', 'Sentimental', 'Gentle', 'Warm'
  ],
  'Aggressive & Intense': [
    'Angry', 'Furious', 'Chaotic', 'Explosive', 'Fierce', 'Powerful', 'Rebellious',
    'Savage', 'Heavy', 'Relentless', 'Unstoppable', 'Wild'
  ],
  'Epic & Heroic': [
    'Majestic', 'Triumphant', 'Victorious', 'Grand', 'Inspirational', 'Dramatic',
    'Cinematic', 'Monumental', 'Glorious', 'Adventurous', 'Powerful'
  ],
  'Quirky & Fun': [
    'Wacky', 'Silly', 'Funky', 'Playful', 'Bizarre', 'Eccentric', 'Whimsical',
    'Goofy', 'Zany', 'Cheerful'
  ],
  'Inspirational & Hopeful': [
    'Motivational', 'Encouraging', 'Uplifting', 'Aspirational', 'Bright',
    'Confident', 'Positive', 'Driving', 'Determined'
  ],
  'Mysterious & Suspenseful': [
    'Enigmatic', 'Secretive', 'Cryptic', 'Suspenseful', 'Intriguing',
    'Tense', 'Unresolved'
  ],
  'Groovy & Funky': [
    'Smooth', 'Cool', 'Retro', 'Stylish', 'Sassy', 'Funky', 'Catchy', 'Hypnotic'
  ],
  'Otherworldly & Fantasy': [
    'Mystical', 'Ethereal', 'Enchanted', 'Magical', 'Cosmic', 'Dreamlike',
    'Celestial', 'Floating'
  ]
} as const;

export const MOODS = Array.from(
  new Set(
    Object.values(MOODS_CATEGORIES).flat()
  )
).sort() as readonly string[];

export const FILE_FORMATS = ['MP3', 'WAV', 'AIFF'] as const;