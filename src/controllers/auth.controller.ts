import { Request, Response } from 'express';


export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { email, authMethod } = req.body;

  if (!email || !['email', 'google'].includes(authMethod)) {
    res.status(400).json({ error: 'Invalid email or auth method' });
    return;
  }

  // Dynamic import to delay execution of Server() in stellar.service.ts
  const { generateKeypair } = await import('@/services/stellar.service');

  const keypair = generateKeypair();

  const user = {
    email,
    authMethod,
    publicKey: keypair.publicKey(),
  };

  res.status(201).json({
    message: 'User registered successfully',
    user,
  });
};
