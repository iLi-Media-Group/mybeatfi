import React, { useState } from 'react';
import { Upload, X, Camera, Loader2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfilePhotoUploadProps {
  currentPhotoUrl: string | null;
  onPhotoUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  userId?: string;
}

const SIZES = {
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
  lg: 'w-40 h-40'
};

export function ProfilePhotoUpload({ currentPhotoUrl, onPhotoUpdate, size = 'md', userId }: ProfilePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is the logged-in user's profile
  const isOwnProfile = user?.id === userId;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size must be less than 2MB');
      }

      // Create a temporary canvas to resize the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      // Calculate dimensions to maintain aspect ratio
      let width = img.width;
      let height = img.height;
      const maxSize = 250;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      // Upload to Supabase Storage
      const fileName = `${Date.now()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        // If the error is due to bucket not found, try to create it
        if (uploadError.message.includes('bucket not found')) {
          const { data: bucket, error: bucketError } = await supabase.rpc('create_storage_bucket', {
            bucket_name: 'profile-photos',
            public_access: true
          });

          if (bucketError) throw bucketError;

          // Retry upload after bucket creation
          const { data: retryData, error: retryError } = await supabase.storage
            .from('profile-photos')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: true
            });

          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update profile with new avatar path
      if (user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            avatar_path: `profile-photos/${fileName}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-photos')
            .remove([oldPath]);
        }
      }

      onPhotoUpdate(`profile-photos/${fileName}`);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <div className={`relative ${SIZES[size]} rounded-full overflow-hidden bg-gray-800 border-2 border-blue-500/20`}>
          {currentPhotoUrl ? (
            <img
              src={supabase.storage.from('profile-photos').getPublicUrl(currentPhotoUrl.replace('profile-photos/', '')).data.publicUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <User className="w-2/3 h-2/3 text-gray-600" />
            </div>
          )}
          {isOwnProfile && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
        {isOwnProfile && (
          <>
            <p className="mt-2 text-sm text-gray-400">
              Upload your logo or personal photo
            </p>
            <p className="text-xs text-gray-500">
              Max size: 2MB (250x250px)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
