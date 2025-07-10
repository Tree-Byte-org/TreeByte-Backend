import { Router } from 'express';
const {
  createWallet,
  exportEncryptedKeyHandler,
  sendEncryptedKeyHandler,
} = require('../controllers/wallet.controller');

const router = Router();

// 🟢 Wallet creation (external or invisible)
router.post('/create', createWallet);

// 🔐 Wallet recovery (export + email)
router.post('/recovery/export', exportEncryptedKeyHandler);
router.post('/recovery/send', sendEncryptedKeyHandler);

export default router;
