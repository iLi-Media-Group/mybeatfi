import React, { useState, useEffect } from 'react';
import { ProfilePhotoUpload } from './ProfilePhotoUpload';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function ProducerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ 
    first_name?: string, 
    email: string,
    avatar_path?: string | null,
    bio?: string | null,
    producer_number?: string | null
  } | null>(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, email, avatar_path, bio, producer_number')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="flex items-center space-x-6">
        <div className="flex-shrink-0">
          <ProfilePhotoUpload
            currentPhotoUrl={profile?.avatar_path || null}
            onPhotoUpdate={(url) => {
              setProfile(prev => prev ? { ...prev, avatar_path: url } : null);
            }}
            userId={user?.id}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Producer Dashboard</h1>
          {profile && (
            <div className="mt-2 space-y-1">
              <p className="text-xl text-gray-300">
                Welcome {profile.first_name || profile.email.split('@')[0]}
              </p>
              {profile.producer_number && (
                <p className="text-sm text-gray-400">Producer ID: {profile.producer_number}</p>
              )}
              {profile.bio && (
                <p className="text-gray-400 text-sm line-clamp-2">{profile.bio}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}