import { Config } from './Config';
import axios from 'axios';
import { MazeLoc } from '@mazemasterjs/shared-library/MazeLoc';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { CELL_TAGS, CELL_TRAPS, COMMANDS, DIRS, GAME_RESULTS, GAME_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Cell } from '@mazemasterjs/shared-library/Cell';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { IGameStub } from '@mazemasterjs/shared-library/Interfaces/IGameStub';
import { Request, Response } from 'express';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import GameLang from './GameLang';
import CellBase from '@mazemasterjs/shared-library/CellBase';

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
    case 'LEFT': {
      return DIRS.LEFT;
    }
    case 'RIGHT': {
      return DIRS.RIGHT;
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
    case 'TURN': {
      return COMMANDS.TURN;
    }
    case 'WRITE': {
      return COMMANDS.WRITE;
    }
    case 'QUIT': {
      return COMMANDS.QUIT;
    }
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
 * counters.  MoveCount / action.MoveCount are handled in finalizeAction.
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
  } // end switch(act.direction)

  const cell: Cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];

  // until blindness or something is added, always see exits
  // commented for testing purposes
  // act.engram.sight = 'You see exits: ' + game.Maze.Cells[pLoc.row][pLoc.col].listExits();

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

  await Cache.use()
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
    })
    .catch(fetchError => {
      game.Actions[game.Actions.length - 1].outcomes.push('Error adding add trophy ' + TROPHY_IDS[trophyId] + ' -> ' + fetchError.message);
      logWarn(__filename, method, 'Unable to fetch trophy: ' + TROPHY_IDS[trophyId] + '. Error -> ' + fetchError.message);
    });

  return Promise.resolve(game);
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

/**
 * Checks for accept-language header and returns the 2-letter language code
 * or returns 'en' if none found - default language will be english (en)
 *
 * @param req
 */
export function getLanguage(req: Request) {
  const languageHeader = req.header('accept-language');

  let userLanguage = 'en';
  logDebug(__filename, 'getLanguage(req)', `Acquiring users language from the header: ${languageHeader}`);

  if (languageHeader && languageHeader.length >= 2) {
    userLanguage = languageHeader.substring(0, 2);
    logDebug(__filename, 'getLanguage(req)', 'userLanguage is ' + userLanguage);
  }

  return userLanguage;
}

/**
 * Aggregates some commmon scoring and debugging
 *
 * @param game
 * @param maze
 * @param action
 * @param startScore
 * @param finishScore
 */
export function finalizeAction(game: Game, startScore: number): IAction {
  // increment move counters
  game.Score.addMove();
  game.Actions[game.Actions.length - 1].moveCount++;

  // track the score change from this one move
  game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;

  // TODO: Remove summarize from every every move - here now for DEV/DEBUG  purposes
  // summarizeGame(game.Actions[game.Actions.length - 1], game.Score);

  // TODO: text render - here now just for DEV/DEBUG purposess - it should always be the LAST outcome, too
  try {
    const textRender = game.Maze.generateTextRender(true, game.Player.Location);
    game.Actions[game.Actions.length - 1].outcomes.push(textRender);
    logDebug(__filename, 'finalizeAction(...)', '\r\n' + textRender);
  } catch (renderError) {
    logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
  }

  return game.Actions[game.Actions.length - 1];
}

export function getSmell(game: Game, lang: string, engram: Engram, cell: CellBase, distance: number, cameFrom: DIRS = DIRS.NONE): string {
  const method = `getSmell(${game.Id}, ${game.Maze.Id}, ${lang}, [Engram], (${cell.Location.row}x${cell.Location.col}), ${distance}, ${cameFrom})`;
  logTrace(__filename, method, 'Entering getSmell()...');
  const data = GameLang.getInstance(lang);
  const currentCell = game.Maze.getCell(cell.Location);
  const x = currentCell.Location.col;
  const y = currentCell.Location.row;
  const height = game.Maze.Height;
  const width = game.Maze.Width;

  if (!!(currentCell.Tags & CELL_TAGS.START)) {
    // smell - north would be lava
    if (data.entities.lava.smell.intensity >= distance * 10) {
      engram.smell += data.entities.lava.smell.adjective;
    }
  }

  if (!!(currentCell.Tags & CELL_TAGS.FINISH)) {
    // smell - south :: smell is cheese
    if (data.entities.cheese.smell.intensity >= distance * 10) {
      engram.smell += data.entities.cheese.smell.adjective;
    }
  }

  if (currentCell.isDirOpen(DIRS.NORTH) && cameFrom !== DIRS.NORTH && y - 1 >= 0) {
    const nextCell = game.Maze.getNeighbor(currentCell, DIRS.NORTH);
    logTrace(__filename, method, 'Smelling to the north.');
    engram.smell = getSmell(game, lang, engram, nextCell, ++distance, DIRS.SOUTH);
  }
  if (currentCell.isDirOpen(DIRS.SOUTH) && cameFrom !== DIRS.SOUTH && y + 1 < height) {
    const nextCell = game.Maze.getNeighbor(currentCell, DIRS.SOUTH);
    logTrace(__filename, method, 'Smelling to the south.');
    engram.smell = getSmell(game, lang, engram, nextCell, ++distance, DIRS.NORTH);
  }
  if (currentCell.isDirOpen(DIRS.EAST) && cameFrom !== DIRS.EAST && x + 1 <= width) {
    const nextCell = game.Maze.getNeighbor(currentCell, DIRS.EAST);
    logTrace(__filename, method, 'Smelling to the east.');
    engram.smell = getSmell(game, lang, engram, nextCell, ++distance, DIRS.WEST);
  }
  if (currentCell.isDirOpen(DIRS.WEST) && cameFrom !== DIRS.WEST && x - 1 >= 0) {
    const nextCell = game.Maze.getNeighbor(currentCell, DIRS.WEST);
    logTrace(__filename, method, 'Smelling to the west.');
    engram.smell = getSmell(game, lang, engram, nextCell, ++distance, DIRS.EAST);
  }

  // TODO: CELL_TRAPS is a bitwise enumeration - this doesn't support bitwise
  if (currentCell.Traps !== CELL_TRAPS.NONE) {
    const trapType = currentCell.Traps;
    logTrace(__filename, method, `${CELL_TRAPS[trapType]} detected in cell: ${currentCell.Location.toString()}`);
    switch (trapType) {
      case CELL_TRAPS.PIT: {
        if (data.entities.PIT.smell.intensity >= distance * 10) {
          engram.smell += `[${distance}:${data.entities.PIT.smell.adjective}]`;
        }
      }
      case CELL_TRAPS.MOUSETRAP: {
        if (data.entities.MOUSETRAP.smell.intensity >= distance * 10) {
          engram.smell += `[${distance}:${data.entities.MOUSETRAP.smell.adjective}]`;
        }
      }
      case CELL_TRAPS.TARPIT: {
        if (data.entities.TARPIT.smell.intensity >= distance * 10) {
          engram.smell += `[${distance}:${data.entities.TARPIT.smell.adjective}]`;
        }
        break;
      }
      case CELL_TRAPS.FLAMETHROWER: {
        if (data.entities.FLAMETHROWER.smell.intensity >= distance * 10) {
          engram.smell += `[${distance}:${data.entities.FLAMETHROWER.smell.adjective}]`;
        }
        break;
      }
      case CELL_TRAPS.FRAGILE_FLOOR:
      case CELL_TRAPS.POISON_DART:
      case CELL_TRAPS.TELEPORTER:
      case CELL_TRAPS.DEADFALL: {
        logTrace(__filename, method, `Trap Type ${CELL_TRAPS[trapType]} not implemented.`);
        break;
      }

      default: {
        logTrace(__filename, method, 'No traps detected in cell ' + currentCell.Location.toString());
      }
    } // end switch
  } // end if
  return engram.smell;
}

export function getSound(game: Game, lang: string, engram: Engram, cell: CellBase): string {
  const method = `getSound(${game.Id}, ${game.Maze.Id}, ${lang}, [Engram], (${cell.Location.row}x${cell.Location.col}))`;
  logTrace(__filename, method, 'Entering getSound()...');
  const data = GameLang.getInstance(lang);
  let currentCell = game.Maze.getCell(cell.Location);
  const xPlayer = game.Maze.getCell(game.Player.Location).Location.col;
  const yPlayer = game.Maze.getCell(game.Player.Location).Location.row;
  const height = game.Maze.Height;
  const width = game.Maze.Width;
  let x: number;
  let y: number;
  let pos: MazeLoc;
  let distance: number;
  for (y = yPlayer - 4; y < yPlayer + 4; y++) {
    for (x = xPlayer - 4; x < xPlayer + 4; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        logTrace(__filename, method, `Entering getSound() for [${x},${y}]`);
        pos = new MazeLoc(y, x);
        currentCell = game.Maze.getCell(pos);
        distance = Math.abs(Math.sqrt(((x - xPlayer) ^ 2) + ((y - yPlayer) ^ 2)));
        if (!!(currentCell.Tags & CELL_TAGS.START)) {
          if (data.entities.lava.sound.intensity >= distance) {
            engram.sound += `[${calcDirection(x, y, xPlayer, yPlayer)}: ${distance}:${data.entities.lava.sound.adjective}]`;
          }
        }

        if (!!(currentCell.Tags & CELL_TAGS.FINISH)) {
          if (data.entities.cheese.sound.intensity >= distance) {
            engram.sound += `[${calcDirection(x, y, xPlayer, yPlayer)}:${distance}:${data.entities.cheese.sound.adjective}]`;
          }
        }
        // TODO: CELL_TRAPS is a bitwise enumeration - this doesn't support bitwise
        if (currentCell.Traps !== CELL_TRAPS.NONE) {
          const trapType = currentCell.Traps;
          logTrace(__filename, method, `${CELL_TRAPS[trapType]} detected in cell: ${currentCell.Location.toString()}`);
          switch (trapType) {
            case CELL_TRAPS.PIT: {
              if (data.entities.PIT.sound.intensity >= distance * 10) {
                engram.sound += `[${distance}:${data.entities.PIT.sound.adjective}]`;
              }
              break;
            }
            case CELL_TRAPS.MOUSETRAP: {
              if (data.entities.MOUSETRAP.sound.intensity >= distance * 10) {
                engram.sound += `[${distance}:${data.entities.MOUSETRAP.sound.adjective}]`;
              }
              break;
            }
            case CELL_TRAPS.TARPIT: {
              if (data.entities.TARPIT.sound.intensity >= distance * 10) {
                engram.sound += `[${distance}:${data.entities.TARPIT.sound.adjective}]`;
              }
              break;
            }
            case CELL_TRAPS.FLAMETHROWER: {
              if (data.entities.FLAMETHROWER.sound.intensity >= distance * 10) {
                engram.sound += `[${distance}:${data.entities.FLAMETHROWER.sound.adjective}]`;
              }
              break;
            }
            case CELL_TRAPS.FRAGILE_FLOOR:
            case CELL_TRAPS.POISON_DART:
            case CELL_TRAPS.TELEPORTER:
            case CELL_TRAPS.DEADFALL: {
              logTrace(__filename, method, `Trap Type ${CELL_TRAPS[trapType]} not implemented.`);
              break;
            }

            default: {
              logTrace(__filename, method, 'No traps detected in cell ' + currentCell.Location.toString());
            }
          } // end switch
        } // end if
      } // end if without bounds of maze
    } // end for(x)
  } // end for(y)
  return engram.sound;
}

export function calcDirection(x1: number, y1: number, x2: number, y2: number): string {
  const angle1 = calcAngleDegrees(x1, y1);
  const angle2 = calcAngleDegrees(x2, y2);
  const dirAngle = Math.abs(angle1 - angle2);
  if (dirAngle > 90) {
    return 'NORTH';
  }
  if (dirAngle <= 90) {
    return 'SOUTH';
  }

  return 'NONE';
}

function calcAngleDegrees(x: number, y: number) {
  return (Math.atan2(y, x) * 180) / Math.PI;
}
