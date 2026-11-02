// ============================================================================
// AeroPersona – Utility Functions
// ============================================================================

/**
 * Format a timestamp to a readable time string (HH:MM:SS)
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format a timestamp to a readable date-time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format relative time (e.g., "2m ago", "just now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return formatDateTime(timestamp);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validate an IP address or hostname format (supports ports and optional http://)
 */
export function isValidIpOrHostname(value: string): boolean {
  if (!value || !value.trim()) return false;
  // Strip http:// or https:// and trailing slashes
  const cleaned = value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const [host, port] = cleaned.split(':');

  if (port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return false;
  }

  // Simple IP v4 pattern
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Hostname pattern (e.g. localhost, aeropersona.local)
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

  if (ipPattern.test(host)) {
    return host.split('.').every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  return hostnamePattern.test(host);
}

/**
 * Get a temperature color based on the value (cold → hot)
 */
export function getTemperatureColor(tempC: number): string {
  if (tempC < 20) return '#06B6D4'; // cyan – cold
  if (tempC < 25) return '#10B981'; // green – comfortable
  if (tempC < 30) return '#F59E0B'; // yellow – warm
  if (tempC < 35) return '#F97316'; // orange – hot
  return '#EF4444'; // red – very hot
}

/**
 * Get humidity status color
 */
export function getHumidityColor(humPct: number): string {
  if (humPct < 30) return '#F59E0B'; // dry
  if (humPct < 60) return '#10B981'; // comfortable
  if (humPct < 80) return '#3B82F6'; // humid
  return '#8B5CF6'; // very humid
}

/**
 * Calculate simple stats for a number array
 */
export function calcStats(values: number[]): { min: number; max: number; avg: number } {
  if (values.length === 0) return { min: 0, max: 0, avg: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { min, max, avg };
}
