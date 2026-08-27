const fs = require('fs');
const https = require('https');

// Update these paths to where your CSVs are actually located!
const IDO_CSV_PATH = 'C:/Users/nedpe/Downloads/Globo_I_Do.csv';
const PROPER_CSV_PATH = 'C:/Users/nedpe/Downloads/Globo_Proper.csv';

// Assuming you mapped these domains in business_sites
const IDO_DOMAIN = 'idobridalcouture.com'; 
const PROPER_DOMAIN = 'properandcompany.com';

const parseCsv = (csv) => {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, ''));
    let obj = {};
    headers.forEach((h, i) => { obj[h] = values[i]; });
    return obj;
  });
};

const sendPost = (payload) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.robertsenterprises.bridgebox.ai',
      port: 443,
      path: '/api/form-bridge/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vowos-form-secret': 'super_secret_form_bridge_key_2026', // Automatically injected into Railway
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
         try {
           resolve(JSON.parse(body));
         } catch(e) {
           resolve(body);
         }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

async function ingest() {
  console.log("Verifying form-bridge status...");
  await new Promise(r => https.get('https://robertsenterprises.bridgebox.ai/api/form-bridge/status', res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      console.log('Status check:', body);
      r();
    });
  }));
  
  const processBrand = async (csvPath, domain) => {
    if (!fs.existsSync(csvPath)) return console.log(`Skipping: ${csvPath} not found.`);
    const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    for (const row of rows) {
      if (!row['Globo ID']) continue;
      console.log(`Sending Globo ID: ${row['Globo ID']} -> ${domain}`);
      const payload = {
        provider: 'powerful-form',
        externalSubmissionId: row['Globo ID'],
        siteDomain: domain,
        locationHint: row['location'],
        ...row
      };
      const res = await sendPost(payload);
      console.log(res);
    }
  };

  await processBrand(IDO_CSV_PATH, IDO_DOMAIN);
  await processBrand(PROPER_CSV_PATH, PROPER_DOMAIN);
}
ingest();
