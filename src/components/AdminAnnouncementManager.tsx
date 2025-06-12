import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Youtube, Sparkles, Bell, ExternalLink, Image, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'feature' | 'event' | 'youtube' | 'general';
  published_at: string;
  expires_at: string | null;
  external_url: string | null;
  image_url: string | null;
  is_featured: boolean;
}

interface AnnouncementFormProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: Announcement;
  onSave: () => void;
}

// Store form data in localStorage to persist across navigation
const FORM_STORAGE_KEY = 'announcement_form_data';

function AnnouncementForm({ isOpen, onClose, announcement, onSave }: AnnouncementFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'feature' | 'event' | 'youtube' | 'general'>('general');
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formId, setFormId] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load saved form data on initial render
  useEffect(() => {
    const loadSavedFormData = () => {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData.formId) {
            setTitle(parsedData.title || '');
            setContent(parsedData.content || '');
            setType(parsedData.type || 'general');
            setPublishedAt(parsedData.publishedAt || '');
            setExpiresAt(parsedData.expiresAt || '');
            setExternalUrl(parsedData.externalUrl || '');
            setImageUrl(parsedData.imageUrl || '');
            setIsFeatured(parsedData.isFeatured || false);
            setImagePreview(parsedData.imagePreview || null);
            setFormId(parsedData.formId);
            return true;
          }
        } catch (e) {
          console.error('Error parsing saved form data:', e);
        }
      }
      return false;
    };

    if (isOpen) {
      // If we have an announcement to edit, use that data
      if (announcement) {
        setTitle(announcement.title);
        setContent(announcement.content);
        setType(announcement.type);
        setPublishedAt(new Date(announcement.published_at).toISOString().split('T')[0]);
        setExpiresAt(announcement.expires_at ? new Date(announcement.expires_at).toISOString().split('T')[0] : '');
        setExternalUrl(announcement.external_url || '');
        setImageUrl(announcement.image_url || '');
        setIsFeatured(announcement.is_featured);
        setImagePreview(announcement.image_url);
        setFormId(announcement.id);
        
        // Save to localStorage
        saveFormData(announcement.id);
      } else {
        // Check if we have saved form data
        const hasSavedData = loadSavedFormData();
        
        if (!hasSavedData) {
          // Set defaults for new announcement
          const newFormId = `new-${Date.now()}`;
          setTitle('');
          setContent('');
          setType('general');
          setPublishedAt(new Date().toISOString().split('T')[0]);
          setExpiresAt('');
          setExternalUrl('');
          setImageUrl('');
          setIsFeatured(false);
          setImagePreview(null);
          setImageFile(null);
          setFormId(newFormId);
          
          // Save default values to localStorage
          saveFormData(newFormId);
        }
      }
      setHasUnsavedChanges(false);
    }
  }, [announcement, isOpen]);

  // Save form data to localStorage whenever it changes
  const saveFormData = (id: string) => {
    const formData = {
      formId: id,
      title,
      content,
      type,
      publishedAt,
      expiresAt,
      externalUrl,
      imageUrl,
      isFeatured,
      imagePreview
    };
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
  };

  // Update localStorage when form fields change
  useEffect(() => {
    if (formId && isOpen) {
      saveFormData(formId);
      setHasUnsavedChanges(true);
    }
  }, [title, content, type, publishedAt, expiresAt, externalUrl, imageUrl, isFeatured, imagePreview, formId, isOpen]);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setError('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl;

    try {
      const fileName = `announcement-${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
      
      const { data, error } = await supabase.storage
        .from('announcements')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      // Validate required fields
      if (!title.trim()) throw new Error('Title is required');
      if (!content.trim()) throw new Error('Content is required');
      if (!publishedAt) throw new Error('Publish date is required');

      // Upload image if provided
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage() || '';
      }

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        type,
        published_at: new Date(publishedAt).toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        external_url: externalUrl.trim() || null,
        image_url: finalImageUrl || null,
        is_featured: isFeatured,
        created_by: user.id
      };

      if (announcement) {
        // Update existing announcement
        const { error: updateError } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', announcement.id);

        if (updateError) throw updateError;
      } else {
        // Create new announcement
        const { error: insertError } = await supabase
          .from('announcements')
          .insert(announcementData);

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setHasUnsavedChanges(false);
      
      // Clear localStorage after successful save
      localStorage.removeItem(FORM_STORAGE_KEY);
      
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving announcement:', err);
      setError(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!hasUnsavedChanges || confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
      localStorage.removeItem(FORM_STORAGE_KEY);
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-xl border border-purple-500/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button
            onClick={handleClose}
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

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-center flex items-center justify-center">
              <Check className="w-5 h-5 mr-2" />
              Announcement saved successfully!
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Announcement Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full"
                required
                disabled={loading}
              >
                <option value="general">General</option>
                <option value="feature">New Feature</option>
                <option value="event">Event</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                External URL (Optional)
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full pl-10"
                  placeholder="https://..."
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Publish Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiration Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full pl-10"
                  min={publishedAt}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content (HTML supported)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full pl-10"
                    placeholder="https://example.com/image.jpg"
                    disabled={loading || !!imageFile}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Enter an image URL or upload a file below
                </p>
              </div>

              <div>
                <input
                  type="file"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-purple-600 file:text-white
                    hover:file:bg-purple-700
                    file:cursor-pointer file:transition-colors"
                  accept="image/*"
                  disabled={loading}
                />
              </div>
            </div>

            {(imagePreview || imageUrl) && (
              <div className="mt-4 relative">
                <img
                  src={imagePreview || imageUrl}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    setImageUrl('');
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              disabled={loading}
            />
            <label className="text-gray-300">
              Feature this announcement (will be highlighted)
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleClose}
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
                  Saving...
                </>
              ) : (
                <>
                  {announcement ? 'Update' : 'Create'} Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminAnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Check if we have a saved form when component mounts
  useEffect(() => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.formId) {
          // If the saved form is for editing an existing announcement
          if (!parsedData.formId.startsWith('new-')) {
            // Try to find the announcement in the database
            const fetchAnnouncement = async () => {
              const { data } = await supabase
                .from('announcements')
                .select('*')
                .eq('id', parsedData.formId)
                .single();
                
              if (data) {
                setSelectedAnnouncement(data);
              }
            };
            
            fetchAnnouncement();
          }
          setShowForm(true);
        }
      } catch (e) {
        console.error('Error parsing saved form data:', e);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;

    try {
      setDeleteLoading(true);
      
      // Delete the announcement
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', selectedAnnouncement.id);

      if (error) throw error;

      // If there was an image, delete it from storage
      if (selectedAnnouncement.image_url) {
        const imagePath = selectedAnnouncement.image_url.split('/').pop();
        if (imagePath && imagePath.startsWith('announcement-')) {
          await supabase.storage
            .from('announcements')
            .remove([imagePath]);
        }
      }

      // Update the announcements list
      setAnnouncements(announcements.filter(a => a.id !== selectedAnnouncement.id));
      setShowDeleteConfirm(false);
      setSelectedAnnouncement(undefined);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError('Failed to delete announcement');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'feature':
        return <Sparkles className="w-6 h-6 text-purple-400" />;
      case 'event':
        return <Calendar className="w-6 h-6 text-blue-400" />;
      case 'youtube':
        return <Youtube className="w-6 h-6 text-red-400" />;
      default:
        return <Bell className="w-6 h-6 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Manage Announcements</h2>
        <button
          onClick={() => {
            setSelectedAnnouncement(undefined);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Announcement
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-purple-500/20">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No announcements found</p>
            <button
              onClick={() => {
                setSelectedAnnouncement(undefined);
                setShowForm(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white/5 backdrop-blur-sm rounded-xl border ${
                announcement.is_featured
                  ? 'border-purple-500/40'
                  : 'border-blue-500/20'
              } p-6`}
            >
              <div className="flex items-start space-x-4">
                {getAnnouncementIcon(announcement.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white">
                      {announcement.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                    <span>Published: {new Date(announcement.published_at).toLocaleDateString()}</span>
                    {announcement.expires_at && (
                      <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-white/10">
                      {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                    </span>
                    {announcement.is_featured && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div 
                    className="prose prose-invert max-w-none line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />

                  {announcement.external_url && (
                    <a
                      href={announcement.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-4 text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form */}
      <AnnouncementForm
        isOpen={showForm}
        onClose={() => {
          if (confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
            setShowForm(false);
            localStorage.removeItem(FORM_STORAGE_KEY);
          }
        }}
        announcement={selectedAnnouncement}
        onSave={fetchAnnouncements}
      />

      {/* Delete Confirmation */}
      {selectedAnnouncement && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${showDeleteConfirm ? 'block' : 'hidden'}`}>
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-red-500/20 w-full max-w-md">
            <div className="flex items-start space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Announcement</h3>
                <p className="text-gray-300">
                  Are you sure you want to delete "{selectedAnnouncement.title}"? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
