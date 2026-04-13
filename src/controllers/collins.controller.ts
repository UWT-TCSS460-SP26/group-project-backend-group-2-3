import { Request, Response } from 'express';

export const collinsHello = (req: Request, res: Response) => {
  res.json({ message: 'Hello from Collins!' });
};
