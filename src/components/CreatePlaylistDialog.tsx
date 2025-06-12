import React, { useState } from 'react';
import { X, Music, Upload, Globe, Lock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreatePlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (name: string, description: string, isPublic: boolean, coverImageUrl: string | null) => void;
}

export function CreatePlaylistDialog({ isOpen, onClose, onCreatePlaylist }: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setCoverImageFile(file);
    setCoverImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!coverImageFile) return null;

    try {
      const fileExt = coverImageFile.name.split('.').pop();
      const fileName = `playlist-cover-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('playlist-covers')
        .upload(fileName, coverImageFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('playlist-covers')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload cover image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      if (!name.trim()) {
        throw new Error('Playlist name is required');
      }

      let coverImageUrl = null;
      if (coverImageFile) {
        coverImageUrl = await uploadImage();
      }

      onCreatePlaylist(name.trim(), description.trim(), isPublic, coverImageUrl);
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-purple-500/20 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Playlist Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-4"
              placeholder="My Awesome Playlist"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full pl-4"
              placeholder="Describe your playlist..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cover Image (Optional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/10">
                {coverImagePreview ? (
                  <img
                    src={coverImagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block">
                  <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-purple-500/20 rounded-lg hover:border-purple-500/40 transition-colors cursor-pointer">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <span className="text-sm text-gray-400">
                        Click to upload image
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="sr-only"
                  disabled={loading}
                />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${!isPublic ? 'bg-purple-600' : 'bg-white/10'}`}>
                  {!isPublic && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div className="flex items-center">
                  <Lock className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="text-gray-300">Private</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="sr-only"
                  disabled={loading}
                />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPublic ? 'bg-purple-600' : 'bg-white/10'}`}>
                  {isPublic && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="text-gray-300">Public</span>
                </div>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isPublic 
                ? 'Public playlists can be viewed by anyone' 
                : 'Private playlists can only be viewed by you'}
            </p>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Playlist'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
