import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { findOrCreateCustomer } from './src/modules/scheduling/publicIntake';

const supabase = createClient('https://yyexmcaumkzxvhplipkl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZXhtY2F1bWt6eHZocGxpcGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg4ODgwNSwiZXhwIjoyMTAxNDY0ODA1fQ.dtdvjxpAyb2CbIs3tNbjEIqGHyX5uEKaCOLJm_TC4iw');

const idoBizId = '65ad28de-3f86-428d-a5b6-9d89af3542fc';
const idoBrandId = '3221bc42-0800-4f7e-b58d-42d6907f0c96';
const idoSiteBatonRouge = '21ed09fc-fb9b-4490-b7dc-9806b6a5b705';
const idoSiteCovington = 'ff0350a5-b8ce-4d70-937a-4a28b3253cfe';
const idoLocBR = '1bf69ca1-91a2-417b-890f-79089763ae4f';
const idoLocCov = '244179aa-63fa-408b-9615-9f552d57edd3';

const processedIds = new Set();

function parseDate(v: any) {
  if (!v) return null;
  const s = String(v).trim();
  if (!isNaN(Number(s)) && Number(s) > 10000 && Number(s) < 100000) {
    const d = new Date((Number(s) - (25567 + 1)) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const d = new Date(m[1]);
    if (!isNaN(d.getTime())) return m[1];
  }
  return null;
}

async function processRow(row: any) {
  const email = (row['Email'] || '').trim().toLowerCase();
  if (!email) return;

  const id = String(row['ID']).trim();
  
  if (processedIds.has(id)) return;
  processedIds.add(id);

  const name = (row['First and Last Name'] || row['First + Last Name'] || '').trim();
  const phone = (row['Contact Phone'] || '').trim();
  const locHint = (row['Store Location'] || '').toLowerCase();
  
  const d1raw = row['First Appointment Request'] || '';
  const d2raw = row['Second Appointment Request'] || '';
  
  let d1 = null, w1 = null;
  if (String(d1raw).includes(' ')) {
    const parts = String(d1raw).split(' ');
    d1 = parseDate(parts[0]);
    w1 = parts.slice(1).join(' ');
  } else {
    d1 = parseDate(d1raw);
  }
  
  let d2 = null, w2 = null;
  if (String(d2raw).includes(' ')) {
    const parts = String(d2raw).split(' ');
    d2 = parseDate(parts[0]);
    w2 = parts.slice(1).join(' ');
  } else {
    d2 = parseDate(d2raw);
  }

  let submittedAt = null;
  if (row['created at']) {
     const c = String(row['created at']);
     const dp = new Date(c);
     if (!isNaN(dp.getTime())) {
        submittedAt = dp.toISOString();
     }
  }

  let bizId = idoBizId;
  let brandId = idoBrandId;
  let siteId, locId;
  
  if (locHint.includes('covington')) {
    siteId = idoSiteCovington;
    locId = idoLocCov;
  } else {
    siteId = idoSiteBatonRouge;
    locId = idoLocBR;
  }

  const existing = await supabase.from('appointment_requests').select('id').eq('idempotency_key', id).maybeSingle();
  if (existing.data?.id) return; // skip

  const resolved = { businessId: bizId, locationId: locId };
  let weddingDate = parseDate(row['Wedding Date'] || row['Occasion Date']);
  const payload = { email, name, phone, weddingDate };
  
  const customerId = await findOrCreateCustomer(supabase as any, resolved as any, payload as any);

  const notesLines = [];
  if (row['Occasion Type']) notesLines.push(`Occasion: ${row['Occasion Type']}`);
  if (row['Wedding Dress Budget']) notesLines.push(`Budget: ${row['Wedding Dress Budget']}`);
  if (row['Price Point']) notesLines.push(`Price Point: ${row['Price Point']}`);
  if (row['Number in Party (include bride)']) notesLines.push(`Guests: ${row['Number in Party (include bride)']}`);
  if (row['Number In Party']) notesLines.push(`Guests: ${row['Number In Party']}`);
  if (row['First time trying on a wedding dress']) notesLines.push(`First time: ${row['First time trying on a wedding dress']}`);
  if (row['Beverage Selection']) notesLines.push(`Beverage: ${row['Beverage Selection']}`);
  if (row['Additional Information']) notesLines.push(`Notes: ${row['Additional Information']}`);
  if (row['Extra Notes']) notesLines.push(`Notes: ${row['Extra Notes']}`);
  
  notesLines.push('Historical import from Powerful Form Builder');

  const insert = {
    business_id: bizId,
    brand_id: brandId,
    source_site_id: siteId,
    idempotency_key: id,
    preferred_location_id: locId,
    customer_id: customerId,
    intake_source: 'website-powerful-form-builder',
    preferred_date_1: d1 || null,
    preferred_window_1: w1 || null,
    preferred_date_2: d2 || null,
    preferred_window_2: w2 || null,
    priority: 'normal',
    notes: notesLines.join('\n'),
    submitted_at: submittedAt || undefined
  };

  const { error } = await supabase.from('appointment_requests').insert(insert);
  if (error) {
     console.error(`Error inserting ${id}:`, error.message);
  }
}

async function run() {
  const dir = 'C:/Users/nedpe/Desktop/Appointments';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} Excel files. Starting import...`);

  let count = 0;
  for (const f of files) {
    const wb = xlsx.readFile(path.join(dir, f));
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log(`Processing ${rows.length} rows from ${f}...`);
    for (const r of rows) {
      await processRow(r);
      count++;
    }
  }

  console.log(`Done! Processed ${count} rows total.`);
}

run().catch(console.error);
