/**
 * Format a UTC datetime string into a human-readable relative time format
 * @param utcDatetime - UTC datetime string (without 'Z' suffix)
 * @returns Formatted string like "just now", "5 minutes ago", or full date
 */
export function formatDate(utcDatetime: string): string {
  // Create a Date object from the UTC datetime string
  const utcDate = new Date(utcDatetime + "Z");

  const diff = new Date().getTime() - utcDate.getTime();

  // Calculate time differences in seconds, minutes, hours, and days
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  // Return the formatted time based on the time difference
  if (diff < 1000) {
    return 'just now';
  } else if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    // If more than 60 minutes ago, return formatted date
    const options: Intl.DateTimeFormatOptions = {
      hour12: false,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', options).format(utcDate);
  }
}
