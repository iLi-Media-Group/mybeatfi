import React, { useState, useEffect } from 'react';
import { Music, Users, Shield, Zap, Globe, Award } from 'lucide-react';
import { AboutPagePhotoUpload } from './AboutPagePhotoUpload';
import { supabase } from '../lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
}

export function AboutPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: 'ceo', name: 'Deryk Banks', role: 'CEO & Founder', photoUrl: null },
    { id: 'partner', name: 'G Smith', role: 'Head of Music', photoUrl: null }
  ]);

  useEffect(() => {
    // Load team member photos
    const initializeStorage = async () => {
      try {
        // Load the photos
        const { data, error } = await supabase
          .from('site_settings')
          .select('key, value')
          .like('key', 'about_photo_%');

        if (!error && data) {
          const updatedMembers = [...teamMembers];
          
          data.forEach(setting => {
            const memberId = setting.key.replace('about_photo_', '');
            const memberIndex = updatedMembers.findIndex(m => m.id === memberId);
            
            if (memberIndex >= 0) {
              const photoUrl = supabase.storage
                .from('about-photos')
                .getPublicUrl(setting.value).data.publicUrl;
                
              updatedMembers[memberIndex].photoUrl = photoUrl;
            }
          });
          
          setTeamMembers(updatedMembers);
        }
      } catch (error) {
        console.error('Error loading photos:', error);
      }
    };
    
    initializeStorage();
  }, []);

  const handlePhotoUpdate = (memberId: string, url: string) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === memberId 
          ? { ...member, photoUrl: url } 
          : member
      )
    );
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About MyBeatFi Sync</h1>
          <p className="text-xl text-gray-300">
            Empowering creators with professional music licensing solutions
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Our Mission</h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            At MyBeatFi Sync, we bridge the gap between talented music producers and content creators. 
            Our platform simplifies the music licensing process, ensuring creators have access to high-quality, 
            legally-cleared music for their projects while providing fair compensation to artists.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <Music className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Quality Music</h3>
            <p className="text-gray-300">
              Curated collection of professional tracks across various genres
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <Shield className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Secure Licensing</h3>
            <p className="text-gray-300">
              Clear, straightforward licensing terms with full legal protection
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <Zap className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Fast Delivery</h3>
            <p className="text-gray-300">
              Instant access to licensed tracks and downloadable files
            </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Our Story</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              Founded in 2025, MyBeatFi Sync emerged from a simple observation: content creators needed 
              easier access to quality music, and musicians needed better ways to monetize their work.
            </p>
            <p>
              Today, we serve thousands of creators worldwide, from independent YouTubers to major 
              production companies, while providing a sustainable income stream for our talented producers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <Globe className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-gray-300">
              Serving creators and producers from over 50 countries worldwide
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
            <Award className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Industry Recognition</h3>
            <p className="text-gray-300">
              Trusted by leading content creators and production companies
            </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {teamMembers.map(member => (
              <div key={member.id} className="text-center">
                <AboutPagePhotoUpload
                  photoId={member.id}
                  currentPhotoUrl={member.photoUrl}
                  title={member.name}
                  onPhotoUpdate={(url) => handlePhotoUpdate(member.id, url)}
                  size="lg"
                />
                <p className="text-gray-400 mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
