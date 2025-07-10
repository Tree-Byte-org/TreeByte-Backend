import { Request, Response } from 'express';

export const getHealthStatus = (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
};
