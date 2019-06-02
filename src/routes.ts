import { Request, Response } from 'express';
import { Config } from './Config';
import { Logger } from '@mazemasterjs/logger';

// set constant utility references
const log = Logger.getInstance();

export const listGames = (req: Request, res: Response) => {
  return res.status(200).json({ message: 'Games list will go here.' });
};
