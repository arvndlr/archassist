export const WEIGHT_LABELS = { 1: 'Low', 2: 'Moderate', 3: 'Important', 4: 'High', 5: 'Critical' };

export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `Today, ${new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return fmtDate(d);
}
