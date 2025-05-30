import React, { useState, useEffect } from 'react';
import { Calendar, Youtube, Sparkles, Bell, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'feature' | 'event' | 'youtube'>('all');

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

  const filteredAnnouncements = announcements.filter(
    announcement => filter === 'all' || announcement.type === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Announcements</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('feature')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'feature'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setFilter('event')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'event'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setFilter('youtube')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'youtube'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              YouTube
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredAnnouncements.map((announcement) => (
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
                    <h2 className="text-xl font-semibold text-white">
                      {announcement.title}
                    </h2>
                    <span className="text-sm text-gray-400">
                      {new Date(announcement.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {announcement.image_url && (
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}

                  <div 
                    className="prose prose-invert max-w-none"
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
                      Learn More
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No announcements found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}