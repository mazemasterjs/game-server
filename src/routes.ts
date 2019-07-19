import * as fns from './funcs';
import GameLang from './GameLang';
import Security from './Security';
import { Action } from '@mazemasterjs/shared-library/Action';
import { Cache, CACHE_TYPES } from './Cache';
import { COMMANDS, DIRS, GAME_RESULTS, GAME_STATES, TROPHY_IDS, USER_ROLES } from '@mazemasterjs/shared-library/Enums';
import { cloneDeep } from 'lodash';
import { Config } from './Config';
import { doFace } from './controllers/actFace';
import { doJump } from './controllers/actJump';
import { doLook } from './controllers/actLook';
import { doMove } from './controllers/actMove';
import { doStand } from './controllers/actStand';
import { doTurn } from './controllers/actTurn';
import { doWait } from './controllers/actWait';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Request, Response } from 'express';

// set constant utility references
const log = Logger.getInstance();
const config = Config.getInstance();
const security = Security.getInstance();

/**
 * Creates a new, single-player game.
 *
 * @param {Request} req
 * @param {Response} res
 * @return {void}
 */
export const createGame = async (req: Request, res: Response) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
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
  const botId = req.params.botId;
  const forceId = req.query.forceId;
  const method = `createGame(${mazeId}, ${teamId}, ${botId})`;
  const langCode = fns.getLanguage(req);

  // get maze - bail on fail
  return await Cache.use()
    .fetchOrGetItem(CACHE_TYPES.MAZE, mazeId)
    .then(maze => {
      Cache.use()
        .fetchOrGetItem(CACHE_TYPES.TEAM, teamId)
        .then(team => {
          // if there's a bot id, it must be in the team
          if (botId && !fns.findBot(team, botId)) {
            const botErr = new Error(`Bot not found in team - please try again.`);
            Cache.use().evictItem(CACHE_TYPES.TEAM, teamId);
            log.warn(__filename, method, 'Unable to get Bot');
            return res.status(404).json({ status: 404, message: 'Invalid Request - Bot not found.', error: botErr.message });
          } else {
            // now check to see if an active game already exists in memory for this team or team/bot
            const activeGameId = fns.findGame(teamId, botId);

            if (activeGameId !== '') {
              const gameType = botId ? 'SINGLE_PLAYER (bot)' : 'MULTIPLAYER (team)';

              return res
                .status(400)
                .json({ status: 400, message: 'Invalid Request - An active ' + gameType + ' game already exists.', gameId: activeGameId, teamId, botId });
            } else {
              // break this down into two steps so we can better tell where any errors come from
              const game: Game = new Game(cloneDeep(maze), teamId, botId);

              // add a visit to the start cell of the maze since the player just walked in
              game.Maze.Cells[game.Maze.StartCell.row][game.Maze.StartCell.col].addVisit(0);

              // force-set the gameId if the query parameter was set
              if (forceId) {
                game.forceSetId(forceId);
              }

              // store the game on the  cache
              Cache.use().storeItem(CACHE_TYPES.GAME, game);

              // add initial game action
              fns.logDebug(__filename, method, `Loading GameLang (langCode = ${langCode})`);
              const langData = GameLang.getInstance(langCode);

              // create the initial game action and add a new-game outcome
              const firstAction: IAction = new Action(COMMANDS.WAIT, DIRS.NONE, '');
              firstAction.outcomes.push(langData.outcomes.newGame);
              game.addAction(firstAction);

              // finalize the last action and capture as a result
              let createResult: IAction = fns.finalizeAction(game, 0, game.Score.getTotalScore(), langCode);
              createResult = cloneDeep(createResult);
              createResult.outcomes.pop();

              // return the newly created game
              return res.status(200).json({
                game: game.getStub(config.EXT_URL_GAME),
                action: createResult,
                totalScore: game.Score.getTotalScore(),
                playerState: game.Player.State,
                playerFacing: game.Player.Facing,
              });
            }
          }
        })
        .catch(teamErr => {
          log.warn(__filename, method, 'Unable to get Team -> ' + teamErr);
          return res.status(404).json({ status: 404, message: 'Invalid Request - Team not found.', error: teamErr.message });
        });
    })
    .catch(mazeErr => {
      log.warn(__filename, method, 'Unable to get Maze -> ' + mazeErr);
      return res.status(404).json({ status: 404, message: 'Invalid Request - Maze not found.', error: mazeErr.message });
    });
};

/**
 * Returns game data for the requested Game.Id
 */
export const getGame = (req: Request, res: Response) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  logRequest('getGames', req);
  const langCode = fns.getLanguage(req);

  return Cache.use()
    .fetchItem(CACHE_TYPES.GAME, req.params.gameId)
    .then(game => {
      // add initial game action
      const langData = GameLang.getInstance(langCode);

      // create a resume game action and add a resume outcome
      const resumeAction: IAction = new Action(COMMANDS.WAIT, DIRS.NONE, '');
      resumeAction.outcomes.push(langData.outcomes.resumeGame);
      game.addAction(resumeAction);

      // finalize the last action and capture as a result
      let getResult = fns.finalizeAction(game, 0, game.Score.getTotalScore(), langCode);
      getResult = cloneDeep(getResult);
      getResult.outcomes.pop();

      // add the new game outcome
      return res.status(200).json({
        game: game.getStub(config.EXT_URL_GAME),
        action: getResult,
        totalScore: game.Score.getTotalScore(),
        playerState: game.Player.State,
        playerFacing: game.Player.Facing,
      });
    })
    .catch(fetchError => {
      return res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
};

/**
 * Returns game data for the requested Game.Id
 */
export const getFullGame = (req: Request, res: Response) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  logRequest('getFullGame', req);

  return Cache.use()
    .fetchItem(CACHE_TYPES.GAME, req.params.gameId)
    .then(game => {
      game.actions.forEach((action: any) => {
        action.outcomes[action.outcomes.length - 2] = '';
      });

      // add the new game outcome
      return res.status(200).json({ game });
    })
    .catch(fetchError => {
      return res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
};

/**
 * Returns abandons a game currently in memory
 */
export const abandonGame = async (req: Request, res: Response) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  logRequest('abandonGame', req);
  const gameId: string = req.params.gameId + '';
  const method = `abandonGame/${gameId}`;

  await Cache.use()
    .fetchItem(CACHE_TYPES.GAME, gameId)
    .then(game => {
      if (game.State >= GAME_STATES.FINISHED) {
        const msg = `game.State is ${GAME_STATES[game.State]} - cannot abort completed games.`;
        fns.logDebug(__filename, method, msg);
        return res.status(404).json({ status: 400, message: 'Game Abort Error', error: msg });
      }

      // Force-set gameId's starting with the word 'FORCED' will be renamed
      // so the original IDs can be re-used - very handy for testing and development
      if (game.Id.startsWith('FORCED')) {
        game.forceSetId(`${game.Id}__${Date.now()}`);
      }

      // go ahead and abandon the game
      game.State = GAME_STATES.ABORTED;
      log.warn(__filename, 'abandonGame', `${game.Id} abandoned.`);
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
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
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
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
  logRequest('countGames', req);
  return res.status(200).json({ count: Cache.use().countItems(CACHE_TYPES.GAME) });
};

export function resetMaze(game: Game) {
  Cache.use()
    .fetchOrGetItem(CACHE_TYPES.MAZE, game.Maze.Id)
    .then(fetchedMaze => {
      game.Maze = fetchedMaze;
      return;
    })
    .catch(fetchError => {
      log.warn(__filename, 'resetMaze()', `Invalid maze Id (${game.Maze.Id}) -> ${fetchError.message}`);
      return;
    });
}
/**
 * Process an incoming game action request
 *
 * @param req
 * @param res
 */
export const processAction = async (req: Request, res: Response) => {
  const minRole = USER_ROLES.USER;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
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
  const cmd = isNaN(parseInt(req.body.command, 10)) ? fns.getCmdByName(req.body.command) : parseInt(req.body.command, 10);
  const dir = isNaN(parseInt(req.body.direction, 10)) ? fns.getDirByName(req.body.direction) : parseInt(req.body.direction, 10);
  const msg = req.body.message !== undefined ? req.body.message : '';
  const langCode = fns.getLanguage(req);

  // first attempt to get the game by the given Id - fetchItem() will
  // reject the promise with an error if the game is not found in the game cache
  game = await Cache.use()
    .fetchItem(CACHE_TYPES.GAME, gameId)
    .then(fetchedGame => {
      return fetchedGame;
    })
    .catch(fetchError => {
      log.warn(__filename, req.path, `Invalid gameId (${gameId}) -> ${fetchError.message}`);
      return null;
    });

  // make sure a game was found
  if (!game) {
    return res.status(404).json({ status: 404, message: 'Game Not Found', gameId });
  }

  // got a game - make sure it's not in an end-state: FINISHED, ABANDONDED, or ERROR
  if (game.State >= GAME_STATES.FINISHED) {
    log.warn(__filename, req.path, `Action sent to ${GAME_STATES[game.State]} game.`);
    return res.status(400).json({ status: 400, message: 'Game Over', gameState: GAME_STATES[game.State] });
  }

  // the game is still active, so create and configure an Action item
  const action = new Action(cmd, dir, msg);

  // add cohesion scores if found
  if (req.body.cohesionScores !== undefined) {
    action.botCohesion = req.body.cohesionScores;
  }

  // add the new action to the game
  game.addAction(action);
  game.Actions[game.Actions.length - 1].playerLife = game.Player.Life;
  // handle game state - out of moves or time or whatever
  if (game.Score.MoveCount >= game.Maze.CellCount * 3) {
    game.State = GAME_STATES.FINISHED;
    game.Score.GameResult = GAME_RESULTS.OUT_OF_MOVES;
    await fns.grantTrophy(game, TROPHY_IDS.OUT_OF_MOVES);

    if (game.Id.startsWith('FORCED')) {
      game.forceSetId(`${game.Id}__${Date.now()}`);
    }
    return res.status(400).json({ status: 400, message: 'Game Over', error: 'This game has ended.' });
  } else {
    game.State = GAME_STATES.IN_PROGRESS;
  }

  switch (action.command) {
    case COMMANDS.LOOK: {
      let lookResult = doLook(game, langCode);
      lookResult = cloneDeep(lookResult);
      lookResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: lookResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.MOVE: {
      let moveResult = await doMove(game, langCode);
      moveResult = cloneDeep(moveResult);
      moveResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: moveResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.STAND: {
      let standResult = await doStand(game, langCode);
      standResult = cloneDeep(standResult);
      standResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: standResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.TURN: {
      let turnResult = await doTurn(game, langCode);
      turnResult = cloneDeep(turnResult);
      turnResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: turnResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.FACE: {
      let faceResult = await doFace(game, langCode);
      faceResult = cloneDeep(faceResult);
      faceResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: faceResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.JUMP: {
      let jumpResult = await doJump(game, langCode);
      jumpResult = cloneDeep(jumpResult);
      jumpResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: jumpResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.WAIT: {
      let waitResult = await doWait(game, langCode);
      waitResult = cloneDeep(waitResult);
      waitResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: waitResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.WRITE: {
      let writeResult = await fns.doWrite(game, langCode, msg);
      writeResult = cloneDeep(writeResult);
      writeResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: writeResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.SNEAK: {
      let moveResult = await doMove(game, langCode, true);
      moveResult = cloneDeep(moveResult);
      moveResult.outcomes.pop();
      return res
        .status(200)
        .json({ action: moveResult, playerState: game.Player.State, playerFacing: game.Player.Facing, game: game.getStub(config.EXT_URL_GAME) });
    }
    case COMMANDS.LISTEN:
    case COMMANDS.SNIFF:
    case COMMANDS.QUIT:
    case COMMANDS.SIT:
    default: {
      const err = new Error(`${COMMANDS[action.command]} is not recognized. Valid commands are LOOK, MOVE, JUMP, SIT, STAND, and WRITE.`);
      log.error(__filename, req.path, 'Unrecognized Command', err);
      return res.status(400).json({ status: 400, message: 'Unrecognized Command', error: err.message });
    }
  }
};

export const dumpCache = (req: Request, res: Response) => {
  const minRole = USER_ROLES.ADMIN;
  if (!security.userHasRole(req.header('Authorization'), minRole)) {
    log.debug(__filename, req.path, 'User is not authorized.');
    return res.status(401).send(`Unauthorized Access - You must have at least the ${USER_ROLES[minRole]} role to ride this ride.`);
  }
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
