export interface ImportRow {
  _index: number;
  [key: string]: string | number | null;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  mappedRow: any;
}

/**
 * Mock utility to parse raw text (like CSV content) into ImportRow objects.
 * In a real app, we'd use PapaParse or XLSX.
 */
export function parseRawText(content: string): ImportRow[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map((line, idx) => {
    const values = line.split(',').map(v => v.trim());
    const row: ImportRow = { _index: idx + 1 };
    headers.forEach((h, i) => {
      row[h] = values[i] || null;
    });
    return row;
  });
}

/**
 * Validates a mapped row against VowOS schema rules.
 */
export function validateCustomerRow(row: any): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!row.firstName && !row.lastName) {
    errors.push('Customer must have at least a first or last name.');
  }
  
  if (!row.email && !row.phone) {
    warnings.push('No contact method provided (email or phone).');
  }

  // Basic email format check
  if (row.email && !row.email.includes('@')) {
    errors.push('Invalid email format.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    mappedRow: row
  };
}
