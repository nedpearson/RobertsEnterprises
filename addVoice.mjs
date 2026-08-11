import fs from 'fs';

const mp3Path = 'C:\\Users\\nedpe\\Downloads\\Voice 2.1 - ok take the country accent ....mp3';
const apiKey = 'sk_c7f9fcbd55a3138033f56d942d361c1f047fb5ef66734228';

async function run() {
  const form = new FormData();
  form.append('name', 'Custom Recorded Voice');
  
  const buffer = fs.readFileSync(mp3Path);
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  form.append('files', blob, 'voice.mp3');

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey
    },
    body: form
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Error:', res.status, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log('SUCCESS_VOICE_ID:', data.voice_id);
}
run();
