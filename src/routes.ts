import * as fns from './funcs';
import { Request, Response } from 'express';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Cache, CACHE_TYPES } from './Cache';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Player } from '@mazemasterjs/shared-library/Player';
import { Config } from './Config';
import MazeBase from '@mazemasterjs/shared-library/MazeBase';
import { Team } from '@mazemasterjs/shared-library/Team';
import { GAME_MODES, GAME_STATES, PLAYER_STATES } from '@mazemasterjs/shared-library/Enums';
import Score from '@mazemasterjs/shared-library/Score';
import { IAction } from '@mazemasterjs/shared-library/IAction';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();

/**
 * Creates a new, single-player game.
 *
 * @param req
 * @param res
 */
export const createGame = async (req: Request, res: Response) => {
  logRequest('createGame', req);
  const mazeId = req.params.mazeId;
  const teamId = req.params.teamId;
  const botId = req.params.botId === undefined ? '' : req.params.botId;
  const method = `createGame(${mazeId}, ${teamId}, ${botId})`;

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

    // if a bot is given, verify it - bail on fail
    if (botId !== '' && !fns.findBot(team, botId)) {
      const botErr = new Error(`Bot (${botId}) not found in team (${teamId})`);
      log.warn(__filename, method, 'Unable to find bot in team.');
      throw botErr;
    }

    // now check to see if an active game already exists in memory for this team or team/bot
    const activeGameId = fns.findGame(teamId, botId);
    if (activeGameId !== '') {
      return res.status(400).json({ status: 400, message: 'Invalid Request - An active game for team/bot already exists.', gameId: activeGameId });
    }

    // so far so good!  Let's create the rest of the game objects...
    // Players always start sitting down in the maze's start cell
    const player = new Player(maze.StartCell, PLAYER_STATES.SITTING);

    // break this down into two steps so we can better tell where any errors come from
    let game = new Game(maze, player, new Score(), 1, teamId, botId);
    game = Cache.use().storeItem(CACHE_TYPES.GAME, game).Item;

    // Return json containing status, message, gameId, and initial action
    // TODO: Add initial action!
    return res.status(200).json({ status: 200, message: 'Game Created', gameId: game.Id, getUrl: `${config.EXT_URL_GAME}/get/${game.Id}` });
  } catch (err) {
    log.error(__filename, method, 'Game creation failed ->', err);
    res.status(400).json({ status: 500, message: 'Game Creation Error', error: err.message });
  }
};

/**
 * Returns game data for the requested Game.Id
 */
export const getGame = (req: Request, res: Response) => {
  logRequest('getGames', req);
  return Cache.use()
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

export const processAction = (req: Request, res: Response) => {
  logRequest('getGames', req);
  let game: Game;

  return Cache.use()
    .fetchItem(CACHE_TYPES.GAME, req.body.gameId)
    .then(cachedGame => {
      game = cachedGame;
      if (game.State >= GAME_STATES.FINISHED) {
        log.warn(__filename, req.path, `Action sent to ${GAME_STATES[game.State]} gameId ${game.Id}.`);
        return res.status(400).json({ status: 400, message: 'Game Over', gameState: GAME_STATES[game.State] });
      } else {
        const action: IAction = fns.createIAction(req.body, game);
        game.State = GAME_STATES.IN_PROGRESS;
        switch (action.action.toUpperCase()) {
          case 'LOOK': {
            const err = new Error('The "LOOK" action has not been implemented yet.');
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
          case 'MOVE': {
            const err = new Error('The "MOVE" action has not been implemented yet.');
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
          case 'JUMP': {
            const err = new Error('The "JUMP" action has not been implemented yet.');
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
          case 'STAND': {
            const err = new Error('The "STAND" action has not been implemented yet.');
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
          case 'WRITE': {
            const err = new Error('The "WRITE" action has not been implemented yet.');
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
          default: {
            const err = new Error('Invalid Action: ' + action.action.toUpperCase());
            log.error(__filename, req.path, 'Not Implemented', err);
            return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
          }
        }
      }

      //      return res.status(200).json(game.getStub(config.EXT_URL_GAME));
    })
    .catch(fetchError => {
      res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });

  // {
  //     "gameId":"c440d650-733e-4db9-9814-59061b737df7",
  //     "action":"look",
  //     "direction":"north",
  //     "message":"test",
  //     "cohesionScores":[1,0.5,1,0.5,null,null]
  //  }
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
    log.trace(__filename, req.method, 'Handling request -> ' + req.url);
  } else {
    log.debug(__filename, req.method, 'Handling request -> ' + req.url);
  }
}
