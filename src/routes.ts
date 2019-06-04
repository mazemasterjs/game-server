import Bot from '@mazemasterjs/shared-library/Bot';
import { Request, Response } from 'express';
import { Config } from './Config';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Cache, CACHE_TYPES } from './Cache';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Player } from '@mazemasterjs/shared-library/Player';
import * as fns from './funcs';
import MazeBase from '@mazemasterjs/shared-library/MazeBase';
import { json } from 'body-parser';
import { Team } from '@mazemasterjs/shared-library/Team';
import { GAME_MODES, PLAYER_STATES } from '@mazemasterjs/shared-library/Enums';
import Score from '@mazemasterjs/shared-library/Score';
import { IScore } from '@mazemasterjs/shared-library/IScore';
import CacheEntry from './CacheEntry';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();

/**
 * Creates a new, single-player game.
 *
 * @param req
 * @param res
 */
export const createSinglePlayerGame = async (req: Request, res: Response) => {
  logRequest('createGame', req);
  const mazeId = req.params.mazeId;
  const teamId = req.params.teamId;
  const botId = req.params.botId;
  const method = `createSinglePlayerGame(${mazeId}, ${teamId}, ${botId})`;

  try {
    // get maze - bail on fail
    const maze: MazeBase = await Cache.use()
      .fetchOrGetItem(CACHE_TYPES.MAZE, mazeId)
      .catch(mazeErr => {
        log.warn(__filename, method, 'Unable to get maze');
        throw mazeErr;
      });

    // get team - bail on fail
    const team: Team = await Cache.use()
      .fetchOrGetItem(CACHE_TYPES.TEAM, teamId)
      .catch(teamErr => {
        log.warn(__filename, method, 'Unable to get team');
        throw teamErr;
      });

    // verify bot - bail on fail
    if (!fns.findBot(team, botId)) {
      const botErr = new Error(`Bot (${botId}) not found in team (${teamId})`);
      log.warn(__filename, method, 'Unable to find bot in team.');
      throw botErr;
    }

    // so far so good!  Let's create the rest of the game objects...
    // Players always start sitting down in the maze's start cell
    const player = new Player(maze.StartCell, PLAYER_STATES.SITTING);
    const game = new Game(maze, player, new Score(), 1, botId, teamId);

    // set the game mode
    game.Mode = GAME_MODES.SINGLE_PLAYER;

    // put the game on the game cache
    Cache.use().storeItem(CACHE_TYPES.GAME, game);

    // return json containing status, message, gameId, and initial action
    // TODO: Add initial action!
    return res.status(200).json({ status: 200, message: 'Game Created', gameId: game.Id });
  } catch (err) {
    log.error(__filename, method, 'Game creation failed ->', err);
    res.status(400).json({ status: 400, message: 'Invalid Data Provided', error: err.message });
  }
};

/**
 * Returns game data for the requested Game.Id
 */
export const getGame = async (req: Request, res: Response) => {
  logRequest('getGames', req);
  return await Cache.use()
    .fetchItem(CACHE_TYPES.GAME, req.params.gameId)
    .then(game => {
      return res.status(200).json(game.getStub(config.EXT_URL_GAME));
    })
    .catch(fetchError => {
      res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
};

/**
 * Returns a list of stubbed game data for all games currently
 * held in memory.
 */
export const listGames = (req: Request, res: Response) => {
  logRequest('listGames', req);

  try {
    return res.status(200).json(fns.getGameStubs());
  } catch (gameStubsError) {
    return res.status(500).json({ status: '500', message: 'Server Error', error: gameStubsError.message });
  }
};

export const countGames = (req: Request, res: Response) => {
  logRequest('countGames', req);
  return res.status(200).json({ count: Cache.use().countItems(CACHE_TYPES.GAME) });
};

export const dumpCache = (req: Request, res: Response) => {
  logRequest('dumpCache - MAZE', req);
  Cache.use().dumpCache(CACHE_TYPES.MAZE);
  logRequest('dumpCache - GAME', req);
  Cache.use().dumpCache(CACHE_TYPES.GAME);
  return res.status(200).json({ status: 200, message: 'OK' });
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
