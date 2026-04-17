/**
 * Format a date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time (e.g. "10:00 AM")
 */
export function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date + time together
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

/**
 * Format price in PKR
 */
export function formatPKR(amount) {
  if (amount == null) return '—';
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

/**
 * Format distance in km
 */
export function formatDistance(km) {
  if (km == null) return '—';
  return `${Number(km).toFixed(1)} km`;
}

/**
 * Format duration in minutes
 */
export function formatDuration(min) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  const remaining = min % 60;
  return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
}

/**
 * Get relative time (e.g. "5 min ago")
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Truncate text
 */
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
