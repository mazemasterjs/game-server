import axios from 'axios';
import { Cell } from '@mazemasterjs/shared-library/Cell';
import { MazeLoc } from '@mazemasterjs/shared-library/MazeLoc';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { COMMANDS, DIRS, GAME_RESULTS, GAME_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Config } from './Config';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { IGameStub } from '@mazemasterjs/shared-library/Interfaces/IGameStub';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Team } from '@mazemasterjs/shared-library/Team';

const log = Logger.getInstance();
const config = Config.getInstance();

/**
 * Builds a standard response status message for logging
 *
 * @param url
 * @param res
 */
export function genResMsg(url: string, res: AxiosResponse): string {
  return `RESPONSE: status=${res.status}, statusText=${res.statusText}, elementCount=${res.data.length}, url=${url}`;
}

/**
 * Returns IGameStub versions of all games in the cache
 */
export function getGameStubs(): Array<IGameStub> {
  logTrace(__filename, 'getGameStubs()', 'Building array of game stubs.');
  const games: Array<Game> = Cache.use().fetchItems(CACHE_TYPES.GAME);
  const stubs = new Array<IGameStub>();

  for (const game of games) {
    stubs.push(game.getStub(config.EXT_URL_GAME));
  }
  logDebug(__filename, 'getGameStubs()', `Returning array with ${stubs.length} IGameStub items.`);
  return stubs;
}

/**
 * Returns just the service URL path
 */
export function trimUrl(url: string): string {
  const pos = url.indexOf('/api');
  return pos > 0 ? url.substr(pos) : '/';
}

/**
 * Returns the service url that backs the given cache type
 *
 * @param cacheType
 */
export function getSvcUrl(cacheType: CACHE_TYPES) {
  switch (cacheType) {
    case CACHE_TYPES.MAZE: {
      return config.SERVICE_MAZE;
    }
    case CACHE_TYPES.TEAM: {
      return config.SERVICE_TEAM;
    }
    case CACHE_TYPES.SCORE: {
      return config.SERVICE_SCORE;
    }
    case CACHE_TYPES.TROPHY: {
      return config.SERVICE_TROPHY;
    }
  }
}

/**
 * Returns the gameId of an active game, if found.  Otherwise returns '';
 *
 * @param teamId
 * @param botId
 */
export function findGame(teamId: string, botId: string) {
  const method = `findGame(${teamId}, ${botId})`;
  botId = undefined ? '' : botId;
  let cacheEntry: any;

  logDebug(__filename, method, `Searching for active ${botId === '' ? 'TEAM' : 'BOT'} game.`);
  cacheEntry = Cache.use()
    .getCache(CACHE_TYPES.GAME)
    .find(ce => {
      const game: Game = ce.Item;
      if (game.State === GAME_STATES.NEW || game.State === GAME_STATES.IN_PROGRESS) {
        return game.TeamId === teamId && game.BotId === botId;
      } else {
        return false;
      }
    });

  if (cacheEntry !== undefined) {
    logDebug(__filename, method, 'Active game found.');
    return cacheEntry.Item.Id;
  } else {
    logDebug(__filename, method, 'No active games found.');
    return '';
  }
}

/**
 * Returns true if the given botId exists in the given Team
 *
 * @param team
 * @param botId
 */
export function findBot(team: Team, botId: string) {
  const botIdx = team.Bots.findIndex(bot => {
    return bot.Id === botId;
  });

  return botIdx > -1;
}

/**
 * Returns data from the requested URL
 *
 * @param url string - Service API to request data from
 */
export async function doGet(url: string): Promise<any> {
  const method = `doGet(${trimUrl(url)})`;
  logTrace(__filename, method, `Requesting ${url}`);

  return await axios
    .get(url)
    .then(res => {
      logDebug(__filename, method, genResMsg(url, res));
      if (log.LogLevel === LOG_LEVELS.TRACE) {
        logDebug(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
      }
      return Promise.resolve(res.data);
    })
    .catch(axiosErr => {
      log.error(__filename, method, 'Error retrieving data ->', axiosErr);
      return Promise.reject(axiosErr);
    });
}

/**
 * Puts given data to the given URL
 *
 * @param url
 * @param data
 */
export async function doPut(url: string, data: any): Promise<any> {
  const method = `doPut(${trimUrl(url)})`;
  logTrace(__filename, method, `Requesting ${url}`);

  return await axios
    .put(url, data)
    .then(res => {
      logDebug(__filename, method, genResMsg(url, res));
      if (log.LogLevel === LOG_LEVELS.TRACE) {
        logTrace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
      }
      return Promise.resolve(res.data);
    })
    .catch(axiosErr => {
      log.error(__filename, method, 'Error sending data ->', axiosErr);
      return Promise.reject(axiosErr);
    });
}

/**
 * Clean up and standardize input, then attempt to map against available directions
 * to return the DIRS enum value of the given direction
 *
 * @param dirName
 */
export function getDirByName(dirName: string): number {
  switch (dirName.toUpperCase().trim()) {
    case 'NORTH': {
      return DIRS.NORTH;
    }
    case 'SOUTH': {
      return DIRS.SOUTH;
    }
    case 'EAST': {
      return DIRS.EAST;
    }
    case 'WEST': {
      return DIRS.WEST;
    }
    case 'NONE': {
      return DIRS.NONE;
    }
    default:
      log.warn(__filename, `getDirByName(${dirName})`, 'Invalid direction received, returning DIRS.NONE.');
      return DIRS.NONE;
  }
}

/**
 * Clean up and standardize input, then attempt to map against available commands
 * to return the correct COMMANDS enum value
 *
 * @param dirName
 */
export function getCmdByName(cmdName: string): number {
  switch (cmdName.toUpperCase().trim()) {
    case 'LOOK': {
      return COMMANDS.LOOK;
    }
    case 'JUMP': {
      return COMMANDS.JUMP;
    }
    case 'MOVE': {
      return COMMANDS.MOVE;
    }
    case 'SIT': {
      return COMMANDS.SIT;
    }
    case 'STAND': {
      return COMMANDS.STAND;
    }
    case 'WRITE': {
      return COMMANDS.WRITE;
    }
    // case 'QUIT': {
    //   return COMMANDS.QUIT;
    // }
    case 'NONE': {
      return COMMANDS.NONE;
    }
    default:
      log.warn(__filename, `getCmdByName(${cmdName})`, 'Invalid command received, returning COMMANDS.NONE.');
      return COMMANDS.NONE;
  }
}

/**
 * Handles updating the player's location, associated maze cell visit/backtrack
 * counters, and updates the Score.MoveCount.
 *
 * @param game: Game - the current game
 * @param action: IAction - the pre-validated IAction behind this move
 */
export function movePlayer(game: Game, act: IAction): Game {
  const pLoc: MazeLoc = game.Player.Location;

  // reposition the player - all move validation is preformed prior to this call
  switch (act.direction) {
    case DIRS.NORTH: {
      game.Player.Location.row--;
      act.outcomes.push('You move to the North.');
      break;
    }
    case DIRS.SOUTH: {
      game.Player.Location.row++;
      act.outcomes.push('You move to the South.');
      break;
    }
    case DIRS.EAST: {
      game.Player.Location.col++;
      act.outcomes.push('You move to the East.');
      break;
    }
    case DIRS.WEST: {
      game.Player.Location.col--;
      act.outcomes.push('You move to the West.');
      break;
    }
  }

  // increment the move counters
  game.Score.addMove();
  act.moveCount++;

  const cell: Cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];

  // until blindness or something is added, always see exits
  act.engram.sight = 'You see exits: ' + game.Maze.Cells[pLoc.row][pLoc.col].listExits();

  // check for backtracking
  if (game.Maze.Cells[game.Player.Location.row][game.Player.Location.col].VisitCount > 0) {
    game.Score.addBacktrack();
    act.engram.sight += ' Footprints mar the dusty floor. ';
  }

  // and update the cell visit count
  cell.addVisit(game.Score.MoveCount);

  // send the updated game back
  return game;
}

/**
 * Adds the requested trophy and related bonusPoints to the given
 * game.Score object.
 *
 * @param game
 * @param trophyId
 * @returns Promise<Game>
 */
export async function grantTrophy(game: Game, trophyId: TROPHY_IDS): Promise<Game> {
  const method = `grantTrophy(${game.Id}, ${TROPHY_IDS[trophyId]})`;

  return await Cache.use()
    .fetchOrGetItem(CACHE_TYPES.TROPHY, TROPHY_IDS[trophyId])
    .then(item => {
      const trophy: Trophy = item;

      // TODO: Add a getStub() function to Trophy
      // add trophy stub data to the action so we can track ongoing score during playback
      game.Actions[game.Actions.length - 1].trophies.push({ id: trophy.Id, count: 1 });
      game.Actions[game.Actions.length - 1].score += trophy.BonusAward;

      // add the trophy and points to the game's score, too (obviously)
      game.Score.addTrophy(trophyId);
      game.Score.addBonusPoints(trophy.BonusAward);
      logDebug(__filename, method, 'Trophy added.');
      return Promise.resolve(game);
    })
    .catch(fetchError => {
      logWarn(__filename, method, 'Unable to fetch trophy: ' + TROPHY_IDS[TROPHY_IDS.WISHFUL_DYING] + '. Error -> ' + fetchError.message);
      return Promise.reject(fetchError);
    });
}

/**
 * Appeneds game summary as outcome strings on given action using values
 * from the given score
 *
 * @param action
 * @param score
 */
export function summarizeGame(action: IAction, score: Score) {
  action.outcomes.push(`Game Result: ${GAME_RESULTS[score.GameResult]}`);
  action.outcomes.push(`Moves: ${score.MoveCount}`);
  action.outcomes.push(`Backtracks: ${score.BacktrackCount}`);
  action.outcomes.push(`Bonus Points: ${score.BonusPoints}`);
  action.outcomes.push(`Trophies: ${score.Trophies.length}`);
  action.outcomes.push(`Total Score: ${score.getTotalScore()}`);
}

/**
 * Simple trace wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
export function logTrace(file: string, method: string, msg: string) {
  if (log.LogLevel >= LOG_LEVELS.TRACE) {
    log.trace(file, method, msg);
  }
}

/**
 * Simple debug wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
export function logDebug(file: string, method: string, msg: string) {
  if (log.LogLevel >= LOG_LEVELS.DEBUG) {
    log.debug(file, method, msg);
  }
}

/**
 * Simple warn wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
export function logWarn(file: string, method: string, msg: string) {
  if (log.LogLevel >= LOG_LEVELS.WARN) {
    log.warn(file, method, msg);
  }
}

/**
 * Simple error wrapper - really just here for consistency
 * @param file
 * @param method
 * @param msg
 */
export function logError(file: string, method: string, msg: string, error: Error) {
  log.error(file, method, msg, error);
}
