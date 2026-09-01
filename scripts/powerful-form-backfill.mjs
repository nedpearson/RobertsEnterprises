import ExcelJS from 'exceljs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENDPOINT = 'https://api.robertsenterprises.bridgebox.ai/api/scheduling/public/form-bridge';
const ID_HEADERS = ['ID', 'Submission ID', 'SubmissionId', 'Entry ID', 'Response ID'];

function stringValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim();
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '').trim();
  return String(value).trim();
}

export function parseArgs(argv) {
  const args = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dry-run') args.dryRun = true;
    else if (value === '--file') args.file = argv[++index];
    else if (value === '--domain') args.domain = argv[++index];
    else if (value === '--endpoint') args.endpoint = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!args.file) throw new Error('--file is required.');
  if (!args.domain) throw new Error('--domain is required.');
  return args;
}

export function validateEndpoint(value) {
  const url = new URL(value || DEFAULT_ENDPOINT);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new Error('The bridge endpoint must use HTTPS.');
  return url.toString();
}

export async function readSubmissionRows(file) {
  const workbook = new ExcelJS.Workbook();
  const extension = path.extname(file).toLowerCase();
  if (extension === '.csv') await workbook.csv.readFile(file);
  else if (extension === '.xlsx') await workbook.xlsx.readFile(file);
  else throw new Error('Powerful Form exports must be .csv or .xlsx files.');

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('The export does not contain a worksheet.');
  const headers = worksheet.getRow(1).values.slice(1).map(stringValue);
  if (!headers.some(Boolean)) throw new Error('The export is missing a header row.');

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = stringValue(row.getCell(index + 1).value);
    });
    if (Object.values(record).some(Boolean)) rows.push(record);
  });
  return rows;
}

export function buildSubmissionPayload(row, domain) {
  const idHeader = ID_HEADERS.find((header) => stringValue(row[header]));
  const externalSubmissionId = idHeader ? stringValue(row[idHeader]) : '';
  if (!externalSubmissionId) throw new Error('missing provider submission ID');

  return {
    sourceProvider: 'powerful-form',
    externalSubmissionId,
    siteDomain: domain,
    fields: Object.entries(row)
      .filter(([, value]) => stringValue(value))
      .map(([label, value]) => ({ label, value: stringValue(value) })),
  };
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function postSubmission(endpoint, secret, payload) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) return body;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${response.status}: ${body.error || 'submission rejected'}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, 1000 * 2 ** attempt));
  }
  throw new Error('bridge remained unavailable after five attempts');
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const endpoint = validateEndpoint(args.endpoint || env.FORM_BRIDGE_ENDPOINT || DEFAULT_ENDPOINT);
  const rows = await readSubmissionRows(path.resolve(args.file));
  const valid = [];
  const invalid = [];

  for (const row of rows) {
    try {
      valid.push(buildSubmissionPayload(row, args.domain));
    } catch (error) {
      invalid.push(error instanceof Error ? error.message : 'invalid row');
    }
  }

  console.log(`Powerful Form export: ${rows.length} rows, ${valid.length} importable, ${invalid.length} invalid.`);
  if (args.dryRun) return { imported: 0, duplicates: 0, invalid: invalid.length, failed: 0 };

  const secret = env.PUBLIC_FORM_BRIDGE_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error('PUBLIC_FORM_BRIDGE_SECRET must be set to the server-side bridge secret.');

  let imported = 0;
  let duplicates = 0;
  let failed = 0;
  for (const payload of valid) {
    try {
      const result = await postSubmission(endpoint, secret, payload);
      if (result.duplicate) duplicates += 1;
      else imported += 1;
    } catch (error) {
      failed += 1;
      console.error(`Submission ${payload.externalSubmissionId} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  console.log(`Backfill complete: ${imported} imported, ${duplicates} duplicates, ${invalid.length} invalid, ${failed} failed.`);
  if (invalid.length || failed) process.exitCode = 1;
  return { imported, duplicates, invalid: invalid.length, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
