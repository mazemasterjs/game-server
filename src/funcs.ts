import axios from 'axios';
import { Team } from '@mazemasterjs/shared-library/Team';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IGameStub } from '@mazemasterjs/shared-library/Interfaces/IGameStub';
import { Config } from './Config';
import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { COMMANDS, DIRS, GAME_STATES, GAME_RESULTS } from '@mazemasterjs/shared-library/Enums';
import { Action } from '@mazemasterjs/shared-library/Action';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import ITrophyStub from '@mazemasterjs/shared-library/Interfaces/ITrophyStub';
import { Request } from 'express';
import Score from '@mazemasterjs/shared-library/Score';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';

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
        logTrace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
      }
      return Promise.resolve(res.data);
    })
    .catch(axiosErr => {
      log.error(__filename, method, 'Error retrieving data ->', axiosErr);
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
 * Appeneds game summary as outcome strings on given action using values
 * from the given score
 *
 * @param action
 * @param score
 */
export function summarizeGame(action: IAction, score: Score) {
  action.outcomes.push(`Game Over: ${GAME_RESULTS[score.GameResult]}`);
  action.outcomes.push(`Moves: ${score.MoveCount}`);
  action.outcomes.push(`Backtracks: ${score.BacktrackCount}`);
  action.outcomes.push(`Bonus Points: ${score.BonusPoints}`);
  action.outcomes.push(`Trophies: ${score.Trophies.length}`);
  action.outcomes.push(`Final Score: ${score.getTotalScore()}`);
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
