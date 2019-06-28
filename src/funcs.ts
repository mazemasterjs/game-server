import axios from 'axios';
import GameLang from './GameLang';
import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { Cell } from '@mazemasterjs/shared-library/Cell';
import { CELL_TAGS, CELL_TRAPS, COMMANDS, DIRS, GAME_RESULTS, GAME_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { CellBase } from '@mazemasterjs/shared-library/CellBase';
import { Config } from './Config';
import { doLookLocal } from './controllers/actLook';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { IGameStub } from '@mazemasterjs/shared-library/Interfaces/IGameStub';
import { ISmell, ISound } from '@mazemasterjs/shared-library/Interfaces/ISenses';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { MazeLoc } from '@mazemasterjs/shared-library/MazeLoc';
import { Request } from 'express';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';

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
export function movePlayer(game: Game): Game {
  const act = game.Actions[game.Actions.length - 1];
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
    // act.engram.sight += ' Footprints mar the dusty floor. ';
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
export function finalizeAction(game: Game, startScore: number, langCode: string): IAction {
  // increment move counters
  game.Score.addMove();
  game.Actions[game.Actions.length - 1].moveCount++;

  // track the score change from this one move
  game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;

  // TODO: text render - here now just for DEV/DEBUG purposess - it should always be the LAST outcome, too
  try {
    const textRender = game.Maze.generateTextRender(true, game.Player.Location);
    game.Actions[game.Actions.length - 1].outcomes.push(textRender);
    logDebug(__filename, 'finalizeAction(...)', '\r\n' + textRender);
  } catch (renderError) {
    logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
  }

  // update the sight engrams
  doLookLocal(game, langCode);
  // update the smell engrams
  doSmellLocal(game, langCode);
  doListen(game, langCode);

  return game.Actions[game.Actions.length - 1];
}

export function doSmellLocal(game: Game, lang: string) {
  const method = `doSmellLocal(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  // get the local smells first

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engram.north.smell, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engram.south.smell, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doSmellDirected(game, lang, nextCell, engram.east.smell, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doSmellDirected(game, lang, nextCell, engram.west.smell, DIRS.EAST, 1);
        }
        break;
      }
    } // end switch(dir)
  } // end for (pos<4)
}

export function doSmellDirected(game: Game, lang: string, cell: CellBase, engramDir: ISmell[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `doSmellDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  logDebug(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setSmell(engramDir, { scent: 'Sulpur', strength: distance });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setSmell(engramDir, { scent: 'Cheese', strength: distance });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.entities[trapType.toLowerCase()].smell.intensity;
          const adjective = data.entities[trapType.toLowerCase()].smell.adjective;
          // const intensityString = `data.entities.${trapType}.smell.intensity`;
          // const adjectiveString = `data.entities.${trapType}.smell.adjective`;
          // const intensity = eval(intensityString);  <-- very clever, but an unsafe operation that the linter opposes
          // const adjective = eval(adjectiveString);  <-- very clever, but an unsafe operation that the linter opposes
          if (distance < intensity) {
            if (
              !engramDir.find(smell => {
                if (smell.scent === adjective) {
                  if (smell.strength > distance) {
                    smell.strength = distance;
                  }
                  return true;
                } else {
                  return false;
                }
              })
            ) {
              setSmell(engramDir, { scent: adjective, strength: distance });
            }
          }
        } catch (err) {
          logDebug(__filename, method, err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0 && !(lastDirection === dir)) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && !(lastDirection === dir)) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && !(lastDirection === dir)) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doSmellDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && !(lastDirection === dir)) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doSmellDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
        }
        break;
      }
    } // end switch(dir)
  } // end for (pos<4)
} // end doSmellDirected

/**
 * Update the given smell array with given scent if smell[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param smell
 * @param scent
 */
function setSmell(smell: Array<ISmell>, scent: ISmell) {
  if (smell[0].scent === '') {
    smell[0] = scent;
  } else {
    smell.push(scent);
  }
}

function doListen(game: Game, lang: string) {
  const method = `getSound(${game.Id}, ${game.Maze.Id}, ${lang})`;
  logTrace(__filename, method, 'Entering getSound()...');
  const data = GameLang.getInstance(lang);
  const engram = game.Actions[game.Actions.length - 1].engram;
  // Get the players X and Y position in the game
  const pX = game.Player.Location.col;
  const pY = game.Player.Location.row;
  let engramDir: ISound[] = [{ sound: 'silence', volume: 1 }];
  for (let y = pY - 8; y < pY + 8; y++) {
    for (let x = pX - 8; x < pX + 8; x++) {
      if (x >= 0 && x < game.Maze.Width && y >= 0 && y < game.Maze.Height) {
        const cell = game.Maze.getCell(new MazeLoc(y, x));
        const distance = Math.floor(Math.sqrt(Math.pow(x - pX, 2) + Math.pow(y - pY, 2)));
        switch (calcDirection(x, y, pX, pY)) {
          case DIRS.NORTH: {
            engramDir = engram.north.hear;
            break;
          }
          case DIRS.SOUTH: {
            engramDir = engram.south.hear;
            break;
          }
          case DIRS.EAST: {
            engramDir = engram.east.hear;
            break;
          }
          case DIRS.WEST: {
            engramDir = engram.west.hear;
            break;
          }
        }
        if (!!(cell.Tags & CELL_TAGS.START)) {
          setSound(engramDir, { sound: 'Bubbling', volume: distance });
        }
        if (!!(cell.Tags & CELL_TAGS.FINISH)) {
          setSound(engramDir, { sound: 'Cheese', volume: distance });
        }
      }
    } // end for x
  } // end for y
}

/**
 * Update the given smell array with given scent if smell[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param hear
 * @param sound
 */
function setSound(hear: Array<ISound>, sound: ISound) {
  if (hear[0].sound === '') {
    hear[0] = sound;
  } else {
    hear.push(sound);
  }
}
// export function getSound(game: Game, lang: string, cell: CellBase): string {

//   let currentCell = game.Maze.getCell(cell.Location);
//   const xPlayer = game.Maze.getCell(game.Player.Location).Location.col;
//   const yPlayer = game.Maze.getCell(game.Player.Location).Location.row;
//   const height = game.Maze.Height;
//   const width = game.Maze.Width;
//   let x: number;
//   let y: number;
//   let pos: MazeLoc;
//   let distance: number;
//   const engram = new Engram();
//   const distanceList: any[] = [];
//   let i;
//   for (i = 0; i <= 9; i++) {
//     distanceList.push('');
//   }
//   for (y = yPlayer - 8; y < yPlayer + 8; y++) {
//     for (x = xPlayer - 8; x < xPlayer + 8; x++) {
//       if (x >= 0 && x < width && y >= 0 && y < height) {
//         logTrace(__filename, method, `Entering getSound() for [${x},${y}]`);
//         pos = new MazeLoc(y, x);
//         currentCell = game.Maze.getCell(pos);
//         distance = Math.floor(Math.sqrt(Math.pow(x - xPlayer, 2) + Math.pow(y - yPlayer, 2)));
//         if (!!(currentCell.Tags & CELL_TAGS.START)) {
//           if (data.entities.lava.sound.intensity >= distance) {
//             distanceList[distance] += `"${calcAngleDegrees(x, y)}:${calcAngleDegrees(xPlayer, yPlayer)}:${calcDirection(x, y, xPlayer, yPlayer)}:${
//               data.entities.lava.sound.adjective
//             }"`;
//             // engram.sound += `${distance}:${data.entities.lava.sound.adjective}]`;
//           }
//         }

//         if (!!(currentCell.Tags & CELL_TAGS.FINISH)) {
//           if (data.entities.cheese.sound.intensity >= distance) {
//             distanceList[distance] += `"${calcAngleDegrees(x, y)}:${calcAngleDegrees(xPlayer, yPlayer)}:${calcDirection(x, y, xPlayer, yPlayer)}:${
//               data.entities.cheese.sound.adjective
//             }"`;
//             // engram.sound += `${distance}:${data.entities.cheese.sound.adjective}]`;
//           }
//         }
//         // TODO: CELL_TRAPS is a bitwise enumeration - this doesn't support bitwise
//         if (currentCell.Traps !== CELL_TRAPS.NONE) {
//           const trapType = currentCell.Traps;
//           logTrace(__filename, method, `${CELL_TRAPS[trapType]} detected in cell: ${currentCell.Location.toString()}`);
//           switch (trapType) {
//             case CELL_TRAPS.PIT: {
//               if (data.entities.PIT.sound.intensity >= distance * 10) {
//                 distanceList[distance] += `"${data.entities.lava.sound.adjective}"`;
//                 // engram.sound += `[${distance}:${data.entities.PIT.sound.adjective}]`;
//               }
//               break;
//             }
//             case CELL_TRAPS.MOUSETRAP: {
//               if (data.entities.MOUSETRAP.sound.intensity >= distance * 10) {
//                 distanceList[distance] += `"${data.entities.lava.sound.adjective}"`;
//                 // engram.sound += `[${distance}:${data.entities.MOUSETRAP.sound.adjective}]`;
//               }
//               break;
//             }
//             case CELL_TRAPS.TARPIT: {
//               if (data.entities.TARPIT.sound.intensity >= distance * 10) {
//                 distanceList[distance] += `"${data.entities.lava.sound.adjective}"`;
//                 // engram.sound += `[${distance}:${data.entities.TARPIT.sound.adjective}]`;
//               }
//               break;
//             }
//             case CELL_TRAPS.FLAMETHROWER: {
//               if (data.entities.FLAMETHROWER.sound.intensity >= distance * 10) {
//                 distanceList[distance] += `"${data.entities.lava.sound.adjective}"`;
//                 // engram.sound += `[${distance}:${data.entities.FLAMETHROWER.sound.adjective}]`;
//               }
//               break;
//             }
//             case CELL_TRAPS.FRAGILE_FLOOR:
//             case CELL_TRAPS.POISON_DART:
//             case CELL_TRAPS.TELEPORTER:
//             case CELL_TRAPS.DEADFALL: {
//               logTrace(__filename, method, `Trap Type ${CELL_TRAPS[trapType]} not implemented.`);
//               break;
//             }

//             default: {
//               logTrace(__filename, method, 'No traps detected in cell ' + currentCell.Location.toString());
//             }
//           } // end switch
//         } // end if
//       } // end if without bounds of maze
//     } // end for(x)
//   } // end for(y)
//   // distanceList.forEach((dist: any) => {
//   //   if (distanceList[distanceList.indexOf(dist)].length > 0) {
//   //     engram.sound += `"${distance}" : [${distanceList[distanceList.indexOf(dist)]}]`;
//   //   }
//   // });
//   for (i = 0; i < distanceList.length; i++) {
//     if (distanceList[i].length > 0) {
//       engram.sound += `"${i}" : [${distanceList[i]}]`;
//     }
//   }
//   return engram.sound;
// }

export function calcDirection(x1: number, y1: number, x2: number, y2: number): DIRS {
  const angle1 = calcAngleDegrees(x1, y1);
  const angle2 = calcAngleDegrees(x2, y2);
  const dirAngle = Math.abs((angle1 - angle2) % 360);
  if (dirAngle >= 315 || dirAngle <= 45) {
    return DIRS.NORTH;
  }
  if (dirAngle > 45 && dirAngle < 135) {
    return DIRS.EAST;
  }
  if (dirAngle >= 135 && dirAngle <= 225) {
    return DIRS.EAST;
  }
  if (dirAngle > 225 && dirAngle < 315) {
    return DIRS.EAST;
  }

  return DIRS.NONE;
}

function calcAngleDegrees(x: number, y: number) {
  return (Math.atan2(y, x) * 180) / Math.PI;
}
