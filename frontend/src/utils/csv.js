/**
 * Read a File as text (e.g. user-selected CSV).
 */
export function readFileText(file) {
  return file.text();
}

/**
 * Parse a CSV line respecting quoted fields (commas inside quotes stay).
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
}

/**
 * Parse CSV string into array of objects (first row = headers).
 */
export function parseCsvToObjects(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
}

/**
 * Normalize object keys: trim, lowercase, replace spaces with underscore.
 */
export function normalizeObjectKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, '_'), v])
  );
}

/**
 * Escape a CSV cell (wrap in quotes if contains comma, quote, or newline).
 */
function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Download data as a CSV file.
 * @param {string} filename - e.g. 'export.csv'
 * @param {string[]} columns - column keys in order
 * @param {Record<string, unknown>[]} rows - array of objects with those keys
 */
export function downloadCsv(filename, columns, rows) {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCsvCell(row[col])).join(','));
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
