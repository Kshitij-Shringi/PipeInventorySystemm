/**
 * Format a number - remove .0 if it's a whole number, otherwise show decimals
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return '—';
  const n = Number(num);
  if (Number.isInteger(n)) {
    return n.toString();
  }
  // Remove trailing zeros
  return parseFloat(n.toFixed(4)).toString();
}

/**
 * Format dimensions string (e.g., "120.0×40.0×40.0" -> "120 × 40 × 40")
 */
export function formatDimensions(length, width, height) {
  return `${formatNumber(length)} × ${formatNumber(width)} × ${formatNumber(height)}`;
}

/**
 * Parse dimensions string and format it
 */
export function formatDimensionsString(dimStr) {
  if (!dimStr) return '—';
  // Handle formats like "120.0×40.0×40.0" or "120×40×40"
  const parts = dimStr.split(/[×x]/).map(s => s.trim());
  if (parts.length === 3) {
    return `${formatNumber(parts[0])} × ${formatNumber(parts[1])} × ${formatNumber(parts[2])}`;
  }
  return dimStr;
}
