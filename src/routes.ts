import { Request, Response } from 'express';
import { Config } from './Config';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Cache, CACHE_TYPES } from './Cache';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Player } from '@mazemasterjs/shared-library/Player';
import * as fns from './funcs';
import MazeBase from '@mazemasterjs/shared-library/MazeBase';
import { Team } from '@mazemasterjs/shared-library/Team';
import { COMMANDS, DIRS, GAME_MODES, GAME_STATES, PLAYER_STATES } from '@mazemasterjs/shared-library/Enums';
import Score from '@mazemasterjs/shared-library/Score';
import { Action } from '@mazemasterjs/shared-library/Action';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';

import { doLook } from './controllers/actLook';
import { doMove } from './controllers/actMove';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';

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

  // make sure that the request body has the minimum parameters defined
  if (!req.params.mazeId || !req.params.teamId) {
    return res.status(400).json({
      status: 400,
      message: 'Invalid Request',
      error: 'Request body must include the following elements: { mazeId:<string>, teamId: <string> }',
    });
  }

  // set some vars from req parameters
  const mazeId = req.params.mazeId;
  const teamId = req.params.teamId;
  const botId = req.params.botId + '';
  const forceId = req.query.forceId + '';
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

    // break this down into two steps so we can better tell where any errors come from
    const game: Game = new Game(maze, teamId, botId);

    // force-set the gameId if the query parameter was set
    if (forceId !== undefined) {
      game.forceSetId(forceId);
    }

    // store the game on the cache
    Cache.use().storeItem(CACHE_TYPES.GAME, game);

    // return json game stub: game.Id, getUrl: `${config.EXT_URL_GAME}/get/${game.Id}
    return res.status(200).json({ status: 200, message: 'Game Created', game: game.getStub(`${config.EXT_URL_GAME}/get/`) });
  } catch (err) {
    log.error(__filename, method, 'Game creation failed ->', err);
    res.status(400).json({ status: 500, message: 'Game Creation Error', error: err.message });
  }
};

/**
 * Returns abandons a game currently in memory
 */
export const abandonGame = (req: Request, res: Response) => {
  logRequest('abandonGame', req);
  try {
    const game: Game = Cache.use().fetchItem(CACHE_TYPES.GAME, req.params.gameId);
    game.State = GAME_STATES.ABORTED;

    // Change the ID of abandoned game so that I can keep re-using it
    game.forceSetId(`${game.Id}__${Date.now()}`);
    log.warn(__filename, 'abandonGame', `${game.Id} forcibly abandoned by request from ${req.ip}`);
    return res.status(200).json(game.getStub(config.EXT_URL_GAME + '/get/'));
  } catch (fetchError) {
    res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
  }
};

/**
 * Returns game data for the requested Game.Id
 */
export const getGame = (req: Request, res: Response) => {
  logRequest('getGames', req);
  try {
    const game: Game = Cache.use().fetchItem(CACHE_TYPES.GAME, req.params.gameId);
    return res.status(200).json(game.getStub(config.EXT_URL_GAME));
  } catch (fetchError) {
    res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
  }
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

/**
 * Returns a quick count of the games cache
 *
 * @param req
 * @param res
 */
export const countGames = (req: Request, res: Response) => {
  logRequest('countGames', req);
  return res.status(200).json({ count: Cache.use().countItems(CACHE_TYPES.GAME) });
};

/**
 * Process an incoming game action request
 *
 * @param req
 * @param res
 */
export const processAction = async (req: Request, res: Response) => {
  logRequest('processAction', req);
  let game: Game;

  // make sure that the request body has the minimum parameters defined
  if (!req.body.command || !req.body.direction || !req.body.gameId) {
    return res.status(400).json({
      status: 400,
      message: 'Invalid Request',
      error: 'Request body must include the following elements: { gameId:<string>, command: <string>, direction: <string> }',
    });
  }

  // assign some reference vars from req.body (validate cmd and dir)
  const gameId = req.body.gameId;
  const cmd = fns.getCmdByName(req.body.command);
  const dir = fns.getDirByName(req.body.direction);
  const msg = req.body.message + '';

  // first attempt to get the game by the given Id - fetchItem will throw an
  // error if the game is not found and we'll respond accordingly
  try {
    game = Cache.use().fetchItem(CACHE_TYPES.GAME, gameId);
  } catch (fetchError) {
    return res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
  }

  // got a game - make sure it's not in an end-state: FINISHED, ABANDONDED, or ERROR
  if (game.State >= GAME_STATES.FINISHED) {
    log.warn(__filename, req.path, `Action sent to ${GAME_STATES[game.State]} game.`);
    return res.status(400).json({ status: 400, message: 'Game Over', gameState: GAME_STATES[game.State] });
  }

  // the game is still active, so create and configure an Action item
  const action = new Action(cmd, dir, msg);

  // add the new action to the game
  game.addAction(action);

  // make sure the game
  game.State = GAME_STATES.IN_PROGRESS;

  switch (action.command) {
    case COMMANDS.LOOK: {
      return res.status(200).json(await doLook(game));
    }
    case COMMANDS.MOVE: {
      return await res.status(200).json(await doMove(game));
    }
    case COMMANDS.JUMP:
    case COMMANDS.SIT:
    case COMMANDS.STAND:
    case COMMANDS.WRITE: {
      const err = new Error(`The ${COMMANDS[action.command]} command has not been implemented yet.`);
      log.error(__filename, req.path, 'Command Not Implemented', err);
      return res.status(500).json({ status: 500, message: 'Command Not Implemented', error: err.message });
    }
    default: {
      const err = new Error(`${COMMANDS[action.command]} is not recognized. Valid commands are LOOK, MOVE, JUMP, SIT, STAND, and WRITE.`);
      log.error(__filename, req.path, 'Unrecognized Command', err);
      return res.status(500).json({ status: 400, message: 'Unrecognized Command', error: err.message });
    }
  }
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
