import { Router } from 'express';

const router = Router();

router.get('/:provider/callback', (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  
  console.log(`Received OAuth callback for ${provider}. Code: ${code}`);
  
  res.status(200).json({
    success: true,
    provider,
    message: 'OAuth callback received successfully',
  });
});

export default router;
