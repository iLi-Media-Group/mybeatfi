import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ProducerApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    primary_genre: '',
    secondary_genre: '',
    years_experience: '',
    daws_used: '',
    team_type: '',
    tracks_per_week: '',
    spotify_link: '',
    instruments: '',
    sample_use: '',
    splice_use: '',
    loop_use: '',
    artist_collab: '',
    business_entity: '',
    additional_info: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from('producer_applications').insert([formData]);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        primary_genre: '',
        secondary_genre: '',
        years_experience: '',
        daws_used: '',
        team_type: '',
        tracks_per_week: '',
        spotify_link: '',
        instruments: '',
        sample_use: '',
        splice_use: '',
        loop_use: '',
        artist_collab: '',
        business_entity: '',
        additional_info: '',
      });
    }

    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-green-50 text-green-700 rounded">
        <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
        <p>Your application has been submitted. Our team will review and contact you if selected.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 bg-blue rounded shadow space-y-4">
      <h1 className="text-3xl font-bold mb-4">Producer Application</h1>

      <input name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required className="w-full border p-2 rounded text-black" />
      <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded text-black" />

      <input name="primary_genre" placeholder="Primary Genre" value={formData.primary_genre} onChange={handleChange} required className="w-full border p-2 rounded text-black" />
      <input name="secondary_genre" placeholder="Secondary Genre (optional)" value={formData.secondary_genre} onChange={handleChange} className="w-full border p-2 rounded text-black" />

      <input name="years_experience" placeholder="Years of Experience" value={formData.years_experience} onChange={handleChange} required className="w-full border p-2 rounded text-black" />
      <input name="daws_used" placeholder="DAWs Used (comma separated)" value={formData.daws_used} onChange={handleChange} required className="w-full border p-2 rounded text-black" />

      <select name="team_type" value={formData.team_type} onChange={handleChange} required className="w-full border p-2 rounded text-black">
        <option value="">Select Team Type</option>
        <option value="One Man Team">One Man Team</option>
        <option value="Band">Band</option>
        <option value="Other">Other</option>
      </select>

      <input name="tracks_per_week" placeholder="Tracks Produced Per Week" value={formData.tracks_per_week} onChange={handleChange} required className="w-full border p-2 rounded text-black" />
      <input name="spotify_link" placeholder="Best Spotify Link to Your Work" value={formData.spotify_link} onChange={handleChange} required className="w-full border p-2 rounded text-black" />
      <input name="instruments" placeholder="Instruments You Play (comma separated)" value={formData.instruments} onChange={handleChange} className="w-full border p-2 rounded text-black" />

      <select name="sample_use" value={formData.sample_use} onChange={handleChange} required className="w-full border p-2 rounded text-black">
        <option value="">Do you use samples from 3rd parties?</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>

      <select name="splice_use" value={formData.splice_use} onChange={handleChange} required className="w-full border p-2 rounded text-black">
        <option value="">Do you use Splice?</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>

      <select name="loop_use" value={formData.loop_use} onChange={handleChange} required className="w-full border p-2 rounded text-black">
        <option value="">Do you use loops from other producers?</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>

      <input name="artist_collab" placeholder="Do you work with artists to record full songs? If yes, provide examples or links" value={formData.artist_collab} onChange={handleChange} className="w-full border p-2 rounded text-black" />
      <input name="business_entity" placeholder="Are you an LLC or other registered business? (optional)" value={formData.business_entity} onChange={handleChange} className="w-full border p-2 rounded text-black" />

      <textarea name="additional_info" placeholder="Tell us anything else we should know..." value={formData.additional_info} onChange={handleChange} className="w-full border p-2 rounded text-black" rows={4} />

      {error && <p className="text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
};

export default ProducerApplicationForm;
