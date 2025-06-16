import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface ProfileBioSectionProps {
  bio: string;
  showLocation: boolean;
  city: string | null;
  state: string | null;
  onBioChange: (bio: string) => void;
  onShowLocationChange: (show: boolean) => void;
  disabled?: boolean;
}

export function ProfileBioSection({
  bio,
  showLocation,
  city,
  state,
  onBioChange,
  onShowLocationChange,
  disabled = false
}: ProfileBioSectionProps) {
  const [charCount, setCharCount] = useState(bio.length);
  const hasLocation = Boolean(city && state);

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBio = e.target.value;
    if (newBio.length <= 800) {
      onBioChange(newBio);
      setCharCount(newBio.length);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={handleBioChange}
          rows={4}
          className="w-full"
          placeholder="Tell us about yourself or your company..."
          disabled={disabled}
        />
        <p className="mt-1 text-sm text-gray-400 flex justify-between">
          <span>Maximum 800 characters</span>
          <span>{charCount}/800</span>
        </p>
      </div>

      <div className="flex items-center space-x-3">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showLocation}
            onChange={(e) => onShowLocationChange(e.target.checked)}
            disabled={!hasLocation || disabled}
            className={`rounded border-gray-600 text-blue-600 focus:ring-blue-500 ${
              !hasLocation ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <span className="text-gray-300">Show my location</span>
        </label>
        {hasLocation && showLocation && (
          <div className="flex items-center text-gray-400">
            <MapPin className="w-4 h-4 mr-1" />
            {city}, {state}
          </div>
        )}
        {!hasLocation && (
          <span className="text-sm text-gray-500">
            (Add city and state in your address to enable)
          </span>
        )}
      </div>
    </div>
  );
}
