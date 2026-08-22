import { Router } from 'express';

const router = Router();

router.post('/omnichannel', (req, res) => {
  const payload = req.body;
  const brand_id = req.headers['x-brand-id'] || payload?.brand_id;
  
  if (!brand_id) {
    return res.status(400).json({ success: false, error: 'Missing brand_id' });
  }

  // Normalize payload and map to correct brand_id (placeholder logic)
  console.log(`Received omnichannel webhook for brand ${brand_id}`, payload);

  res.status(200).json({ success: true, message: 'Webhook payload normalized and mapped.' });
});

export default router;
