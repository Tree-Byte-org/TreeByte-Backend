import { Request, Response } from 'express';

export const getTrees = (_req: Request, res: Response) => {
  res.json({ message: 'List of trees will be here soon 🌳' });
};
