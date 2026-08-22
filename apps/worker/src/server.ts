import express from 'express';
import deliveryRouter from './routes/delivery';
import oauthRouter from './routes/oauth';
import webhooksRouter from './routes/webhooks';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routers
app.use('/api/delivery', deliveryRouter);
app.use('/auth', oauthRouter);
app.use('/webhook', webhooksRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'vowos-omnichannel-worker', timestamp: new Date() });
});

export const start = () => {
  const PORT = process.env.PORT || 8083;
  app.listen(PORT, () => {
    console.log(`🚀 Worker listening on port ${PORT}`);
  });
};

start();

export default app;
