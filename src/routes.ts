import { Request, Response } from 'express';
import * as fns from './funcs';
import { Config } from './Config';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Cache, CACHE_TYPES } from './Cache';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Player } from '@mazemasterjs/shared-library/Player';
import Bot from '@mazemasterjs/shared-library/Bot';
import MazeBase from '@mazemasterjs/shared-library/MazeBase';
import { json } from 'body-parser';
import { Team } from '@mazemasterjs/shared-library/Team';
import { PLAYER_STATES } from '@mazemasterjs/shared-library/Enums';
import Score from '@mazemasterjs/shared-library/Score';
import { IScore } from '@mazemasterjs/shared-library/IScore';
import CacheItem from './CacheItem';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();

export const createSinglePlayerGame = async (req: Request, res: Response) => {
  logRequest('createGame', req);
  const mazeId = req.params.mazeId;
  const teamId = req.params.teamId;
  const botId = req.params.botId;
  const method = `createSinglePlayerGame(${mazeId}, ${teamId}, ${botId})`;

  try {
    // get maze - bail on fail
    const maze: MazeBase = await Cache.use()
      .fetchItem(CACHE_TYPES.MAZE, mazeId)
      .catch(mazeErr => {
        log.warn(__filename, method, 'Unable to get maze');
        throw mazeErr;
      });

    // get team - bail on fail
    const team: Team = await Cache.use()
      .fetchItem(CACHE_TYPES.TEAM, teamId)
      .catch(teamErr => {
        log.warn(__filename, method, 'Unable to get team');
        throw teamErr;
      });

    // verify bot - bail on fail
    if (!fns.findBot(team, botId)) {
      const botErr = new Error(`Bot (${botId}) not found in team (${teamId})`);
      log.warn(__filename, method, 'Unable to get bot');
      throw botErr;
    }

    // so far so good!  Let's create the rest of the game objects...
    // Players always start sitting down in the maze's start cell
    const player = new Player(maze.StartCell, PLAYER_STATES.SITTING);
    const game = new Game(maze, player, new Score(), 1, botId, teamId);

    // put the game on the game cache
    Cache.use().storeItem(CACHE_TYPES.GAME, new CacheItem(game, CACHE_TYPES.GAME));

    Cache.use().dumpCache(CACHE_TYPES.MAZE);
    Cache.use().dumpCache(CACHE_TYPES.TEAM);
    Cache.use().dumpCache(CACHE_TYPES.GAME);
    // and we're done!
    return res.status(200).json(game);
  } catch (err) {
    log.error(__filename, method, 'Game creation failed ->', err);
    res.status(400).json({ status: 400, message: 'Invalid Data Provided', error: err.message });
  }
};

export const listGames = (req: Request, res: Response) => {
  logRequest('listGames', req);
  return res.status(200).json(Cache.use().fetchItems(CACHE_TYPES.GAME));
};

export const countGames = (req: Request, res: Response) => {
  logRequest('countGames', req);
  return res.status(200).json({ cache: CACHE_TYPES[CACHE_TYPES.GAME], count: Cache.use().countItems(CACHE_TYPES.GAME) });
};

/**
 * Liveness and Readiness probe for K8s/OpenShift.
 * A response indicates service alive/ready.
 */
export const livenessProbe = (req: Request, res: Response) => {
  logRequest('livenessProbe', req, true);
  res.status(200).json({ probeType: 'liveness', status: 'alive' });
};
export const readinessProbe = (req: Request, res: Response) => {
  logRequest('readinessProbe', req, true);
  res.status(200).json({ probeType: 'readiness', status: 'ready' });
};

// Quick little log wrapper short-circuit called into logger when debug/trace is not enabled
function logRequest(fnName: string, req: Request, trace?: boolean) {
  // bail out if we aren't at least at debug level
  if (log.LogLevel < LOG_LEVELS.DEBUG) {
    return;
  }

  // otherwise check log as trace or debug
  if (trace && log.LogLevel >= LOG_LEVELS.TRACE) {
    log.trace(__filename, req.path, 'Handling request -> ' + req.url);
  } else {
    log.debug(__filename, req.path, 'Handling request -> ' + req.url);
  }
}
