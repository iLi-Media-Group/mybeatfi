import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';

const DEMO_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Tech Review Weekly',
    image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/tech-review',
    created_at: new Date().toISOString()
  },

  {
    id: '2',
    name: 'Nature Documentary Series',
    image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/nature-docs',
    created_at: new Date().toISOString()
  },

  {
    id: '3',
    name: 'Fitness Journey Podcast',
    image_url: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/fitness-podcast',
    created_at: new Date().toISOString()
  },

  {
    id: '4',
    name: 'Cooking with Chef Maria',
    image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/cooking-show',
    created_at: new Date().toISOString()
  },

  {
    id: '5',
    name: 'Travel Diaries',
    image_url: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/travel',
    created_at: new Date().toISOString()
  },

  {
    id: '6',
    name: 'Gaming Reviews Channel',
    image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop',
    link_url: 'https://example.com/gaming',
    created_at: new Date().toISOString()
  }
];

export function ClientsCarousel() {
  const [clients, setClients] = useState<Client[]>(DEMO_CLIENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchClients = async () => {
      if (!supabase) {
        setError('Database connection not available');
        setClients(DEMO_CLIENTS);
        setLoading(false);
        return;
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw new Error(supabaseError.message);
        }

        if (!mounted) return;

        if (data && data.length > 0) {
          setClients(data);
          setError(null);
        } else {
          setClients(DEMO_CLIENTS);
          setError('Using demo showcase data');
        }
      } catch (err) {
        if (mounted) {
          setError('Using demo showcase data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      mounted = false;
    };
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 3) % clients.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 3 + clients.length) % clients.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {error && (
        <div className="text-yellow-400 text-sm mb-4 text-center">
          {error}
        </div>
      )}
      
      <div className="overflow-hidden">
        <div className="relative flex items-center">
          <button
            onClick={prevSlide}
            className="absolute left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div 
            className="flex gap-6 transition-transform duration-300 ease-in-out transform"
            style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
          >
            {clients.map((client) => (
              <div key={client.id} className="w-1/3 flex-shrink-0">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-purple-500/20">
                  <div className="aspect-video relative">
                    <img
                      src={client.image_url}
                      alt={client.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    {client.link_url ? (
                      <a
                        href={client.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                      >
                        {client.name}
                      </a>
                    ) : (
                      <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="absolute right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-4 gap-2">
        {Array.from({ length: Math.ceil(clients.length / 3) }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index * 3)}
            className={`w-2 h-2 rounded-full transition-colors ${
              Math.floor(currentIndex / 3) === index ? 'bg-purple-500' : 'bg-gray-600'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
