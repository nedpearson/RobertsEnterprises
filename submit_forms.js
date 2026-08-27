const fs = require('fs');
const https = require('https');

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
      hostname: 'robertsenterprises.bridgebox.ai',
      port: 443,
      path: '/api/form-bridge/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vowos-form-secret': 'super_secret_form_bridge_key_2026',
        'Content-Length': data.length
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

async function run() {
  const idoCsv = fs.readFileSync('Globo_I_Do.csv', 'utf8');
  const properCsv = fs.readFileSync('Globo_Proper.csv', 'utf8');

  const idoRows = parseCsv(idoCsv);
  for (const row of idoRows) {
    const payload = {
      provider: 'powerful-form',
      externalSubmissionId: row['Globo ID'],
      siteDomain: 'idobridalcouture.com', // guess
      locationHint: row['location'],
      ...row
    };
    console.log('Sending I Do:', row['Globo ID']);
    const res = await sendPost(payload);
    console.log('Response:', res);
  }

  const properRows = parseCsv(properCsv);
  for (const row of properRows) {
    const payload = {
      provider: 'powerful-form',
      externalSubmissionId: row['Globo ID'],
      siteDomain: 'properandcompany.com', // guess
      locationHint: row['location'],
      ...row
    };
    console.log('Sending Proper:', row['Globo ID']);
    const res = await sendPost(payload);
    console.log('Response:', res);
  }
}
run();
