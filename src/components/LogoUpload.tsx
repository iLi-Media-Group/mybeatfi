import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function LogoUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('File size must be less than 2MB');
        return;
      }

      setUploading(true);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(`logo-${Date.now()}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(uploadData.path);

      // Update site settings
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ value: publicUrl })
        .eq('key', 'logo_url');

      if (updateError) throw updateError;

      // Reload the page to show the new logo
      window.location.reload();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
      <h3 className="text-lg font-semibold text-white mb-4">Upload Logo</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <label className="block">
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-colors cursor-pointer">
          <div className="text-center">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <span className="text-sm text-gray-400">
                  Click to upload logo (max 2MB)
                </span>
              </>
            )}
          </div>
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
