import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Application = {
  id: string;
  name: string;
  email: string;
  primary_genre: string;
  secondary_genre: string;
  years_experience: string;
  daws_used: string;
  team_type: string;
  tracks_per_week: string;
  spotify_link: string;
  instruments: string;
  sample_use: string;
  splice_use: string;
  loop_use: string;
  artist_collab: string;
  business_entity: string;
  additional_info: string;
  status: string;
  disqualification_reason: string | null;
  review_score: number | null;
  tier: string | null;
};

export default function ProducerApplicationsAdmin() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetchApplications();
  }, [filter, search]);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase.from('producer_applications').select('*').order('created_at', { ascending: false });

    if (filter === 'Pending') query = query.eq('status', 'Pending');
    if (filter === 'Qualified') query = query.eq('status', 'Qualified');
    if (filter === 'Disqualified') query = query.eq('status', 'Disqualified');
    if (['Tier 1', 'Tier 2', 'Tier 3'].includes(filter)) query = query.eq('tier', filter);

    const { data, error } = await query;
    if (error) console.error('Error fetching applications:', error);
    else {
      let filtered = data as Application[];
      if (search.trim()) {
        const lower = search.toLowerCase();
        filtered = filtered.filter(app => app.name.toLowerCase().includes(lower) || app.email.toLowerCase().includes(lower));
      }
      setApplications(filtered);
    }
    setLoading(false);
  };

  const evaluateAndScore = async (app: Application) => {
    let status = 'Qualified';
    let reason: string | null = null;
    let score = 0;
    let tier = '';

    if (app.sample_use === 'Yes' || app.loop_use === 'Yes') {
      status = 'Disqualified';
      reason = 'Uses samples or loops';
      score = 0;
      tier = 'Disqualified';
    } else {
      if (app.team_type.toLowerCase().includes('one')) score += 40;
      if (app.instruments && app.instruments.length > 3) score += 20;
      const years = parseInt(app.years_experience);
      if (!isNaN(years)) {
        if (years >= 5) score += 30;
        else if (years >= 2) score += 15;
      }
      if (app.business_entity.toLowerCase().includes('llc') || app.business_entity.toLowerCase().includes('corp')) score += 10;

      if (app.splice_use === 'Yes') tier = 'Tier 2';
      else if (score >= 80) tier = 'Tier 1';
      else if (score >= 50) tier = 'Tier 2';
      else tier = 'Tier 3';
    }

    await supabase
      .from('producer_applications')
      .update({ review_score: score, status, disqualification_reason: reason, tier })
      .eq('id', app.id);
  };

  const runAutoDisqualificationForAll = async () => {
    for (const app of applications) {
      if (app.status === 'Pending') await evaluateAndScore(app);
    }
    fetchApplications();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Producer Applications Report', 10, 10);
    const rows = applications.map(app => [
      app.name,
      app.email,
      app.status,
      app.tier,
      app.review_score,
      app.disqualification_reason || '',
    ]);
    doc.autoTable({
      head: [['Name', 'Email', 'Status', 'Tier', 'Score', 'Disqualification Reason']],
      body: rows,
    });
    doc.save('producer_applications_report.pdf');
  };

  const updateStatus = async (id: string, status: string, reason: string | null = null, score: number | null = null) => {
    await supabase
      .from('producer_applications')
      .update({ status, disqualification_reason: reason, review_score: score })
      .eq('id', id);
    fetchApplications();
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Producer Applications Dashboard</h1>

      <div className="flex space-x-2 mb-4">
        <Button onClick={() => setFilter('All')}>All</Button>
        <Button onClick={() => setFilter('Pending')}>Pending</Button>
        <Button onClick={() => setFilter('Qualified')}>Qualified</Button>
        <Button onClick={() => setFilter('Disqualified')}>Disqualified</Button>
        <Button onClick={() => setFilter('Tier 1')}>Tier 1</Button>
        <Button onClick={() => setFilter('Tier 2')}>Tier 2</Button>
        <Button onClick={() => setFilter('Tier 3')}>Tier 3</Button>
        <Button variant="destructive" onClick={runAutoDisqualificationForAll}>
          Run Auto-Disqualify & Score
        </Button>
        <Button variant="outline" onClick={exportPDF}>
          Export PDF
        </Button>
      </div>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 mb-4 w-full max-w-sm"
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        applications.map(app => (
          <div key={app.id} className="border p-4 mb-4 rounded shadow-sm">
            <div className="flex justify-between">
              <div>
                <p><strong>{app.name}</strong> – {app.email}</p>
                <p>Status: <span className="font-semibold">{app.status}</span></p>
                {app.tier && <p>Tier: <span className="font-semibold">{app.tier}</span></p>}
                {app.disqualification_reason && <p className="text-red-500">Reason: {app.disqualification_reason}</p>}
                {app.review_score !== null && <p>Score: {app.review_score}</p>}
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => updateStatus(app.id, 'Qualified', null, 100)}>Approve</Button>
                <Button variant="destructive" onClick={() => updateStatus(app.id, 'Disqualified', 'Manual review disqualified')}>Disqualify</Button>
                <Button onClick={() => updateStatus(app.id, app.status, null, 50)}>Score 50</Button>
              </div>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">View Full Application</summary>
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <p>Primary Genre: {app.primary_genre}</p>
                <p>Secondary Genre: {app.secondary_genre}</p>
                <p>Years Experience: {app.years_experience}</p>
                <p>DAWs: {app.daws_used}</p>
                <p>Team Type: {app.team_type}</p>
                <p>Tracks per Week: {app.tracks_per_week}</p>
                <p>Spotify: <a href={app.spotify_link} target="_blank" className="text-blue-500 underline">{app.spotify_link}</a></p>
                <p>Instruments: {app.instruments}</p>
                <p>Sample Use: {app.sample_use}</p>
                <p>Splice Use: {app.splice_use}</p>
                <p>Loop Use: {app.loop_use}</p>
                <p>Artist Collab: {app.artist_collab}</p>
                <p>Business Entity: {app.business_entity}</p>
                <p>Additional Info: {app.additional_info}</p>
              </div>
            </details>
          </div>
        ))
      )}
    </div>
  );
}
