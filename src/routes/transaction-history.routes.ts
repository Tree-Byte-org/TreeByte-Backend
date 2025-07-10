import { Router } from 'express';
import { fetchUserTransactionHistory } from '@/controllers/transaction-history.controller';

const router = Router();

router.post('/', fetchUserTransactionHistory);

export default router;
