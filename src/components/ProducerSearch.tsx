import React, { useState, useEffect } from 'react';
import { Users, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Producer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

interface ProducerSearchProps {
  value: string;
  onChange: (producerId: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function ProducerSearch({ value, onChange, disabled = false, required = false }: ProducerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [filteredProducers, setFilteredProducers] = useState<Producer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const filtered = producers.filter(producer => {
        const fullName = `${producer.first_name || ''} ${producer.last_name || ''}`.toLowerCase();
        return fullName.includes(searchLower) || producer.email.toLowerCase().includes(searchLower);
      });
      setFilteredProducers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredProducers([]);
      setShowDropdown(false);
    }
  }, [searchTerm, producers]);

  const fetchProducers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or('account_type.eq.producer,email.in.(knockriobeats@gmail.com,info@mybeatfi.io,derykbanks@yahoo.com)')
        .order('first_name', { ascending: true });

      if (error) throw error;

      if (data) {
        const validProducers = data.filter(p => p.email && (p.first_name || p.last_name || p.email));
        setProducers(validProducers);

        // If there's a selected value, find and display the producer's name
        if (value) {
          const selectedProducer = validProducers.find(p => p.id === value);
          if (selectedProducer) {
            setSearchTerm(getProducerDisplayName(selectedProducer));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching producers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProducerDisplayName = (producer: Producer): string => {
    const name = [producer.first_name, producer.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    return name || producer.email;
  };

  const handleSelect = (producer: Producer) => {
    setSearchTerm(getProducerDisplayName(producer));
    onChange(producer.id);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 pr-10"
          placeholder="Search producers..."
          disabled={disabled}
          required={required}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && filteredProducers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredProducers.map((producer) => (
            <button
              key={producer.id}
              type="button"
              onClick={() => handleSelect(producer)}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
            >
              <div className="text-white font-medium">
                {getProducerDisplayName(producer)}
              </div>
              <div className="text-sm text-gray-400">{producer.email}</div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
}
