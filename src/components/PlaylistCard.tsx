import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, MoreVertical, Edit, Trash2, Globe, Lock, Share2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EditPlaylistDialog } from './EditPlaylistDialog';

interface PlaylistCardProps {
  playlist: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    cover_image_url: string | null;
    user_id: string;
    track_count: number;
    creator: {
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  };
  onRefresh: () => void;
}

export function PlaylistCard({ playlist, onRefresh }: PlaylistCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user && user.id === playlist.user_id;
  
  const handleCardClick = () => {
    navigate(`/playlist/${playlist.id}`);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowEditDialog(true);
  };

  const handleDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    
    // Create a shareable URL
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}`;
    
    // Use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `${playlist.name} - MyBeatFi Sync Playlist`,
        text: playlist.description || `Check out this playlist: ${playlist.name}`,
        url: shareUrl
      }).catch(err => {
        console.error('Error sharing:', err);
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      });
    } else {
      // Fallback to clipboard
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Playlist link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlist.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setShowDeleteConfirm(false);
      onRefresh();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePlaylist = async (name: string, description: string, isPublic: boolean, coverImageUrl: string | null) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          name,
          description: description || null,
          is_public: isPublic,
          cover_image_url: coverImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlist.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setShowEditDialog(false);
      onRefresh();
    } catch (err) {
      console.error('Error updating playlist:', err);
    }
  };

  return (
    <>
      <div 
        className="bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Cover Image */}
        <div className="aspect-square relative overflow-hidden">
          {playlist.cover_image_url ? (
            <img 
              src={playlist.cover_image_url} 
              alt={playlist.name} 
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
              <Music className="w-16 h-16 text-purple-400 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 transition-opacity duration-300" />
          
          {/* Visibility Badge */}
          <div className="absolute top-2 left-2">
            {playlist.is_public ? (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 backdrop-blur-sm rounded-full">
                <Globe className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Public</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2 py-1 bg-gray-500/20 backdrop-blur-sm rounded-full">
                <Lock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">Private</span>
              </div>
            )}
          </div>
          
          {/* Track Count */}
          <div className="absolute bottom-2 left-2 flex items-center space-x-1 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full">
            <Music className="w-3 h-3 text-white" />
            <span className="text-xs text-white">{playlist.track_count} tracks</span>
          </div>
          
          {/* Menu Button (only for owner) */}
          {isOwner && (
            <div className="absolute top-2 right-2">
              <button
                onClick={handleMenuToggle}
                className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
              
              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-gray-900/95 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-lg z-10 overflow-hidden">
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-purple-600/20 transition-colors flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-purple-600/20 transition-colors flex items-center"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-600/20 transition-colors flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-1 truncate">{playlist.name}</h3>
          <p className="text-sm text-gray-400 mb-2">
            By {playlist.creator.first_name && playlist.creator.last_name
              ? `${playlist.creator.first_name} ${playlist.creator.last_name}`
              : playlist.creator.email.split('@')[0]}
          </p>
          {playlist.description && (
            <p className="text-sm text-gray-300 line-clamp-2">{playlist.description}</p>
          )}
        </div>
      </div>

      {/* Edit Playlist Dialog */}
      {showEditDialog && (
        <EditPlaylistDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onUpdatePlaylist={handleUpdatePlaylist}
          playlist={playlist}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-red-500/20 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Delete Playlist</h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the playlist "{playlist.name}"? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}