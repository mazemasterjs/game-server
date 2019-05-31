import { Request, Response } from 'express';
import { GameConfig } from './GameConfig';
import { Logger } from '@mazemasterjs/logger';

// set constant utility references
const log = Logger.getInstance();

export const listGames = (req: Request, res: Response) => {
  return res.status(200).json({ message: 'Games list will go here.' });
};
