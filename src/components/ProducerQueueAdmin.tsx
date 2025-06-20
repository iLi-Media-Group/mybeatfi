'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type QueueEntry = {
  id: string;
  producer_id: string;
  status: 'Queued' | 'Notified' | 'Onboarded' | 'Skipped';
  submission_date: string;
  genre: string;
  notes: string | null;
};

export default function ProducerQueueAdmin() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [filter, setFilter] = useState<string>('Queued');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const fetchQueue = async () => {
    setLoading(true);

    let query = supabase.from('producer_queue').select('*').order('submission_date', { ascending: true });
    if (filter !== 'All') query = query.eq('status', filter);

    const { data, error } = await query;
    if (error) console.error('Error fetching queue:', error);
    else setQueue(data as QueueEntry[]);

    setLoading(false);
  };

  const updateStatus = async (id: string, status: QueueEntry['status']) => {
    const { error } = await supabase
      .from('producer_queue')
      .update({ status })
      .eq('id', id);

    if (error) console.error('Error updating status:', error);
    else fetchQueue();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['ID', 'Producer ID', 'Status', 'Submission Date', 'Genre', 'Notes'],
      ...queue.map(q => [q.id, q.producer_id, q.status, q.submission_date, q.genre, q.notes ?? ''])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'producer_queue.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Approved Producer Queue</h1>

      <div className="flex space-x-2 mb-4">
        <Button onClick={() => setFilter('All')}>All</Button>
        <Button onClick={() => setFilter('Queued')}>Queued</Button>
        <Button onClick={() => setFilter('Notified')}>Notified</Button>
        <Button onClick={() => setFilter('Onboarded')}>Onboarded</Button>
        <Button onClick={() => setFilter('Skipped')}>Skipped</Button>
        <Button variant="outline" onClick={handleExportCSV}>Export CSV</Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        queue.map(entry => (
          <div key={entry.id} className="border p-4 mb-3 rounded shadow-sm">
            <p><strong>ID:</strong> {entry.id}</p>
            <p><strong>Producer ID:</strong> {entry.producer_id}</p>
            <p><strong>Status:</strong> {entry.status}</p>
            <p><strong>Genre:</strong> {entry.genre}</p>
            <p><strong>Submitted:</strong> {new Date(entry.submission_date).toLocaleString()}</p>
            {entry.notes && <p><strong>Notes:</strong> {entry.notes}</p>}

            <div className="flex space-x-2 mt-2">
              <Button onClick={() => updateStatus(entry.id, 'Notified')}>Mark Notified</Button>
              <Button onClick={() => updateStatus(entry.id, 'Onboarded')}>Mark Onboarded</Button>
              <Button variant="destructive" onClick={() => updateStatus(entry.id, 'Skipped')}>Skip</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
