import React, { useState, useEffect } from 'react';
import { Upload, Loader2, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AboutPagePhotoUploadProps {
  photoId: string;
  currentPhotoUrl: string | null;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  onPhotoUpdate: (url: string) => void;
}

const SIZES = {
  sm: 'w-32 h-32',
  md: 'w-40 h-40',
  lg: 'w-48 h-48'
};

export function AboutPagePhotoUpload({ 
  photoId, 
  currentPhotoUrl, 
  title, 
  size = 'md', 
  onPhotoUpdate 
}: AboutPagePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
        
      if (data && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(data.email)) {
        setIsAdmin(true);
      }
    };
    
    checkAdminStatus();
  }, [user]);

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

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
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
      const maxSize = 500;

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
      const fileName = `${photoId}-${Date.now()}.jpg`;
      const { data, error: uploadError } = await supabase.storage
        .from('about-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('about-photos')
        .getPublicUrl(fileName);

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const oldPath = currentPhotoUrl.split('/').pop();
        if (oldPath && oldPath.startsWith(photoId)) {
          await supabase.storage
            .from('about-photos')
            .remove([oldPath]);
        }
      }

      // Update site settings to store the photo reference
      const { error: settingsError } = await supabase
        .from('site_settings')
        .upsert({
          key: `about_photo_${photoId}`,
          value: fileName
        });

      if (settingsError) throw settingsError;

      onPhotoUpdate(publicUrl);
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const getPhotoUrl = () => {
    if (!currentPhotoUrl) return null;
    
    // If it's already a full URL, return it
    if (currentPhotoUrl.startsWith('http')) {
      return currentPhotoUrl;
    }
    
    // Otherwise, get the public URL from storage
    return supabase.storage
      .from('about-photos')
      .getPublicUrl(currentPhotoUrl).data.publicUrl;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center">
        <div className={`relative ${SIZES[size]} rounded-lg overflow-hidden bg-gray-800 border-2 border-blue-500/20`}>
          {currentPhotoUrl ? (
            <img
              src={getPhotoUrl()}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <User className="w-2/3 h-2/3 text-gray-600" />
            </div>
          )}
          {isAdmin && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-white" />
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
        <p className="mt-2 text-center text-white font-medium">{title}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
    </div>
  );
}
