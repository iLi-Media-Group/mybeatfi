import React from 'react';
import { Music, Users, Shield, Zap, Globe, Award } from 'lucide-react';

export function AboutPage() {
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
            <div className="text-center">
              <ProfilePhotoUpload
                currentPhotoUrl={null}
                onPhotoUpdate={() => {}}
                size="lg"
                userId="ceo"
              />
              <h3 className="text-lg font-semibold text-white">Deryk Banks</h3>
              <p className="text-gray-400">CEO & Founder</p>
            </div>

            <div className="text-center">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400"
                alt="Head of Music"
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-lg font-semibold text-white">Sarah Johnson</h3>
              <p className="text-gray-400">Head of Music</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}