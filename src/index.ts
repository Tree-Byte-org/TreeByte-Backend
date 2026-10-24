import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config as appConfig } from '@/config/app-config';

import treeRoutes from '@/routes/tree.routes';
import transactionHistoryRoutes from '@/routes/transaction-history.routes'; 
import healthRoutes from '@/routes/health.routes';
import authRoutes from '@/routes/auth.routes'; 
import walletRoutes from '@/routes/wallets.routes';
import projectRoutes from '@/routes/project.routes';
import buyTokenRoutes from '@/routes/buy-token.route'; 
import couponRoutes from '@/routes/coupon.routes';

dotenv.config();

// Basic config status log without sensitive values
if (process.env.NODE_ENV !== 'test') {
  console.log(
    `Starting server in ${appConfig.server.environment} mode; Horizon: ${appConfig.stellar.horizonUrl}`
  );
}

const app = express();
const PORT = appConfig.server.port;

app.use(cors());
app.use(express.json());

app.use('/api/trees', treeRoutes);
app.use('/api/history', transactionHistoryRoutes); 
app.use('/api/health', healthRoutes);
app.use('/auth', authRoutes); 
app.use('/api/wallet', walletRoutes);
app.use('/api/token', buyTokenRoutes);
app.use('/api', couponRoutes);
app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);
app.use('/buy-token', buyTokenRoutes);

app.get('/', (_req, res) => {
  res.send('TreeByte API is running 🌱');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌿 TreeByte server is growing strong on port ${PORT}!`);
    console.log('🌱 Planting trust, one tree at a time.');
    console.log('🌳 Backend running...');
  });
}

export default app;
export { app };
