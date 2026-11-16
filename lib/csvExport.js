/**
 * Utility to generate and trigger client-side CSV downloads in the browser.
 * 
 * @param {string} filename - The name of the file to download (e.g. 'staff_directory.csv')
 * @param {Array<{ key: string, label: string } | string>} columns - Column definitions or header names
 * @param {Array<Object>} data - Array of row objects to export
 */
export function exportToCsv(arg1, arg2, arg3) {
  if (typeof window === 'undefined') return;

  let filename = 'export.csv';
  let columns = [];
  let data = [];

  // Handle downloadCSV(data, filename)
  if (Array.isArray(arg1)) {
    data = arg1;
    filename = typeof arg2 === 'string' ? arg2 : 'export.csv';
    if (data.length > 0 && typeof data[0] === 'object') {
      columns = Object.keys(data[0]);
    }
  } else if (typeof arg1 === 'string') {
    filename = arg1;
    // Handle exportToCsv(filename, data)
    if (Array.isArray(arg2) && arg3 === undefined) {
      data = arg2;
      if (data.length > 0 && typeof data[0] === 'object') {
        columns = Object.keys(data[0]);
      }
    } else {
      // Handle exportToCsv(filename, columns, data)
      columns = Array.isArray(arg2) ? arg2 : [];
      data = Array.isArray(arg3) ? arg3 : [];
    }
  }

  // Normalize column definitions
  const colDefs = columns.map((col) => {
    if (typeof col === 'string') {
      return { key: col, label: col };
    }
    return col;
  });

  const escapeField = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = colDefs.map((c) => escapeField(c.label)).join(',');

  const contentRows = data.map((row) => {
    return colDefs.map((c) => escapeField(row[c.key])).join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...contentRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const downloadCSV = exportToCsv;

