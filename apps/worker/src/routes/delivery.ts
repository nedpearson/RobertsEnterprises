import { Router } from 'express';

const router = Router();

// Webhook endpoint to receive CI failure events from GitHub Actions
router.post('/webhook/failure', async (req, res) => {
  const { runId, commitSha, fingerprint, logs } = req.body;
  
  // 1. Sanitize and redact logs
  const redactedLogs = (logs || '').replace(/(ghp|sk|sb_secret)_[a-zA-Z0-9]+/g, '[REDACTED_SECRET]');
  
  // 2. Insert into platform_delivery_incidents (Mock logic)
  console.log('Received Delivery Failure Incident', { runId, commitSha, fingerprint });
  
  res.status(200).json({ success: true, message: 'Incident recorded and queued for repair.' });
});

export default router;
