export function calculateTimeRemaining(expiryDate: string): string {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m`;
}

export function formatDuration(duration: string): string {
  // If duration is in PostgreSQL interval format (e.g. "00:03:30"), return formatted string
  if (duration.includes(':')) {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    if (minutes === 0 && seconds === 0) return `${hours}:00`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // If duration is already formatted, return as is
  return duration;
}
