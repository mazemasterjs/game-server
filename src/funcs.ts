import axios from 'axios';
import GameLang from './GameLang';
import Monster from '@mazemasterjs/shared-library/Monster';
import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { Cell } from '@mazemasterjs/shared-library/Cell';
import { Config } from './Config';
import { doFeelLocal } from './controllers/actFeel';
import { doListenLocal } from './controllers/actListen';
import { doLookLocal } from './controllers/actLook';
import { doSmellLocal } from './controllers/actSmell';
import { doTasteLocal } from './controllers/actTaste';
import { finishGame } from './controllers/actMove';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { IGameStub } from '@mazemasterjs/shared-library/Interfaces/IGameStub';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { MazeLoc } from '@mazemasterjs/shared-library/MazeLoc';
import { Request } from 'express';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { fsync } from 'fs';
import {
  CELL_TAGS,
  CELL_TRAPS,
  COMMANDS,
  DIRS,
  GAME_RESULTS,
  GAME_STATES,
  MONSTER_STATES,
  MONSTER_TAGS,
  PLAYER_STATES,
  TROPHY_IDS,
} from '@mazemasterjs/shared-library/Enums';

const log = Logger.getInstance();
const config = Config.getInstance();

// tslint:disable-next-line: no-string-literal
axios.defaults.headers.common['Authorization'] = 'Basic ' + config.PRIMARY_SERVICE_ACCOUNT;

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
export function movePlayer(game: Game, lang: string, printOutcome: boolean = true): Game {
  const act = game.Actions[game.Actions.length - 1];
  const data = GameLang.getInstance(lang);
  // reposition the player - all move validation is preformed prior to this call
  switch (act.direction) {
    case DIRS.NORTH: {
      game.Player.Location.row--;
      if (printOutcome) {
        act.outcomes.push(data.outcomes.move.north);
      }
      break;
    }
    case DIRS.SOUTH: {
      game.Player.Location.row++;
      if (printOutcome) {
        act.outcomes.push(data.outcomes.move.south);
      }
      break;
    }
    case DIRS.EAST: {
      game.Player.Location.col++;
      if (printOutcome) {
        act.outcomes.push(data.outcomes.move.east);
      }
      break;
    }
    case DIRS.WEST: {
      game.Player.Location.col--;
      if (printOutcome) {
        act.outcomes.push(data.outcomes.move.west);
      }
      break;
    }
  } // end switch(act.direction)

  const cell: Cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];

  // until blindness or something is added, always see exits
  // commented for testing purposes

  // check for backtracking
  if (game.Maze.Cells[game.Player.Location.row][game.Player.Location.col].VisitCount > 0) {
    game.Score.addBacktrack();
  }

  // and update the cell visit count
  cell.addVisit(game.Score.MoveCount);

  // send the updated game back
  return game;
}

export function movePlayerAbsolute(game: Game, lang: string, x: number, y: number) {
  const cell: Cell = game.Maze.Cells[y][x];
  cell.addVisit(game.Score.MoveCount);
  game.Player.Location = new MazeLoc(y, x);
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
  logDebug(__filename, method, 'Entering.');

  await Cache.use()
    .fetchOrGetItem(CACHE_TYPES.TROPHY, TROPHY_IDS[trophyId])
    .then(item => {
      const trophy: Trophy = item;

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
export function finalizeAction(game: Game, actionMoveCount: number, startScore: number, langCode: string): IAction {
  // increment move counters
  game.Score.addMoves(actionMoveCount);
  game.Actions[game.Actions.length - 1].moveCount += actionMoveCount;

  // handle game out-of-moves ending
  if (game.Score.MoveCount >= game.Maze.CellCount * 3) {
    const lang = GameLang.getInstance(langCode);
    game.State = GAME_STATES.FINISHED;
    game.Score.GameResult = GAME_RESULTS.OUT_OF_MOVES;
    game.Score.addTrophy(TROPHY_IDS.OUT_OF_MOVES);

    if (game.Id.startsWith('FORCED')) {
      game.forceSetId(`${game.Id}__${Date.now()}`);
    }
    game.Actions[game.Actions.length - 1].outcomes.push(lang.outcomes.gameOverOutOfMoves);
  } else if (game.Score.MoveCount >= game.Maze.CellCount * 0.9) {
    game.Score.addTrophy(TROPHY_IDS.THE_LONGER_WAY_HOME);
  } else if (game.Score.MoveCount >= game.Maze.CellCount * 0.75) {
    game.Score.addTrophy(TROPHY_IDS.THE_LONG_WAY_HOME);
  }

  if (game.Score.MoveCount >= 1 && !(game.Monsters.length > 0) && game.Maze.ChallengeLevel >= 6) {
    game.addMonster(new Monster(game.Maze.FinishCell, MONSTER_STATES.STANDING, MONSTER_TAGS.CAT, DIRS.NORTH));
  }
  // Each monster takes a turn
  game.Monsters.forEach(monster => {
    game.Maze.getCell(monster.Location).addTag(CELL_TAGS.MONSTER);
    takeTurn(game, langCode, monster);
  });

  // track the score change from this one move
  game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;
  getLocalMonster(game, langCode);
  // TODO: Move the minimap to it's own element instead of using outcomes
  try {
    const textRender = game.Maze.generateTextRender(true, game.Player.Location);
    game.Actions[game.Actions.length - 1].outcomes.push(textRender);
    game.Actions[game.Actions.length - 1].outcomes.push(JSON.stringify(game.Player.Location));
    logDebug(__filename, 'finalizeAction(...)', '\r\n' + textRender);
  } catch (renderError) {
    logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
  }

  // update the engrams
  if (!(game.Player.State & PLAYER_STATES.STUNNED)) {
    getLocal(game, langCode);
    doLookLocal(game, langCode);
    doSmellLocal(game, langCode);
    doListenLocal(game, langCode);
    doTasteLocal(game, langCode);
    doFeelLocal(game, langCode);
  } else {
    logWarn(__filename, 'finalizeAction(...)', `Player state is ${PLAYER_STATES[game.Player.State]} (${game.Player.State}) - no engram data collected.`);
  }
  lifeCheck(game, langCode);

  return game.Actions[game.Actions.length - 1];
}

export function getLocal(game: Game, lang: string) {
  const method = `getLocal(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram.here;

  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH)) {
          engram.exitNorth = true;
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH)) {
          engram.exitSouth = true;
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST)) {
          engram.exitEast = true;
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST)) {
          engram.exitWest = true;
        }
        break;
      }
    } // end switch(dir)
  } // end for (pos<4)

  if (cell.Notes.length > 0) {
    engram.messages.pop();
    cell.Notes.forEach(element => {
      engram.messages.push(element);
    });
  }
}

export function getLocalMonster(game: Game, lang: string) {
  const data = GameLang.getInstance(lang);
  const cell = game.Maze.getCell(game.Player.Location);
  const outcomes = game.Actions[game.Actions.length - 1].outcomes;
  const method = `getLocalMonsters(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.MONSTER)) {
    game.Monsters.forEach(monster => {
      const monsterType = MONSTER_TAGS[monster.getTag()];
      logDebug(__filename, method, `${cell.Location}, ${monster.getTag()}`);
      if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
        outcomes.push(format(data.outcomes.monsterHere, monsterType));
      }
    });
  }
}

export function monsterInCell(game: Game, lang: string) {
  const cell = game.Maze.getCell(game.Player.Location);
  const method = `monsterInCell(${game.Id}, ${lang})`;
  let isMonster = false;
  logDebug(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.MONSTER)) {
    game.Monsters.forEach(monster => {
      logDebug(__filename, method, `${cell.Location}, ${monster.getTag()}`);
      if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
        isMonster = true;
      }
    });
  }
  return isMonster;
}

export async function doWrite(game: Game, lang: string, message: string) {
  const method = `doWrite(${game.Id}, ${lang},${message})`;
  const cell = game.Maze.getCell(new MazeLoc(game.Player.Location.row, game.Player.Location.col));
  const startScore = game.Score.getTotalScore();
  const engram = game.Actions[game.Actions.length - 1].engram.here;
  const data = GameLang.getInstance(lang);
  engram.messages.pop();
  if (cell.Notes[0] === '') {
    cell.Notes[0] = message.substr(0, 8);
    game = await grantTrophy(game, TROPHY_IDS.SCRIBBLER);
  } else {
    cell.Notes.push(message.substr(0, 8));
    game = await grantTrophy(game, TROPHY_IDS.PAPERBACK_WRITER);
  }

  logDebug(__filename, method, 'executed the write command');
  game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.message);
  return Promise.resolve(finalizeAction(game, 1, startScore, lang));
}

/**
 *
 * @param game
 * @param lang
 * @param delayTrigger flag to determine if a trap does not trigger as soon as the player enters a cell
 */
export async function trapCheck(game: Game, lang: string, delayTrigger: boolean = false) {
  const pCell = game.Maze.getCell(game.Player.Location);
  const outcomes = game.Actions[game.Actions.length - 1].outcomes;
  const data = GameLang.getInstance(lang);
  if (!(pCell.Traps & CELL_TRAPS.NONE)) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      if (!!(pCell.Traps & trapEnum)) {
        switch (trapEnum) {
          case CELL_TRAPS.PIT: {
            outcomes.push(data.outcomes.trapOutcomes.pit);
            game.Player.addState(PLAYER_STATES.DEAD);
            game = await grantTrophy(game, TROPHY_IDS.YOU_FELL_FOR_IT);
            finishGame(game, GAME_RESULTS.DEATH_TRAP);

            break;
          }
          case CELL_TRAPS.MOUSETRAP: {
            outcomes.push(data.outcomes.trapOutcomes.mouse);
            game.Player.addState(PLAYER_STATES.DEAD);
            game = await grantTrophy(game, TROPHY_IDS.TOO_GOOD_TO_BE_TRUE);
            finishGame(game, GAME_RESULTS.DEATH_TRAP);

            break;
          }
          case CELL_TRAPS.TARPIT: {
            outcomes.push(data.outcomes.trapOutcomes.tar);
            game.Player.addState(PLAYER_STATES.SLOWED);
            game = await grantTrophy(game, TROPHY_IDS.THE_PITS);
            break;
          }
          case CELL_TRAPS.FLAMETHROWER: {
            // When the player enters the cell as a result from the previous action, tell them there is a tripwire in the direction they face
            if (!delayTrigger) {
              outcomes.push(format(data.outcomes.trapOutcomes.flamethrowerTrigger, data.directions[DIRS[game.Actions[game.Actions.length - 1].direction]]));
            }
            if (delayTrigger) {
              // If the player moves or jumps in the direction the tripwire is facing, they trigger the trap
              if (
                !!(game.Actions[game.Actions.length - 1].direction & game.Actions[game.Actions.length - 2].direction)
                // || (game.Actions[game.Actions.length - 1].command === 9 && !!()
              ) {
                logDebug(__filename, 'trapCheck()', `Players location within check ${game.Player.Location}`);
                outcomes.push(data.outcomes.trapOutcomes.flamethrower);
                game.Player.addState(PLAYER_STATES.DEAD);
                game = await grantTrophy(game, TROPHY_IDS.TOO_HOT_TO_HANDLE);
                finishGame(game, GAME_RESULTS.DEATH_TRAP);
              }
            }
            break;
          }
          case CELL_TRAPS.POISON_DART: {
            // If the player has only entered the cell, warn them there is a pressure plate in the direciton they are facing
            if (!delayTrigger) {
              outcomes.push(format(data.outcomes.trapOutcomes.poisonDartTrigger, data.directions[DIRS[game.Actions[game.Actions.length - 1].direction]]));
            }
            if (delayTrigger) {
              // if the player does the moves action in the direction of the pressure plate they saw previously, they trigger the trap
              if (
                !!(game.Actions[game.Actions.length - 1].direction & game.Actions[game.Actions.length - 2].direction) &&
                game.Actions[game.Actions.length - 1].command === 8
              ) {
                outcomes.push(data.outcomes.trapOutcomes.poisonDart);
                outcomes.push(data.outcomes.trapOutcomes.poisoned);
                game.Player.addState(PLAYER_STATES.POISONED);
              }
            }
            break;
          }
          case CELL_TRAPS.CHEESE: {
            outcomes.push(data.outcomes.trapOutcomes.cheese);
            outcomes.push(data.outcomes.trapOutcomes.poisoned);
            game.Player.addState(PLAYER_STATES.POISONED);
            pCell.removeTrap(CELL_TRAPS.CHEESE);
            game.Actions[game.Actions.length - 1].changedCells.push(pCell);
            game = await grantTrophy(game, TROPHY_IDS.TOO_GOOD_TO_BE_TRUE);
            break;
          }
          case CELL_TRAPS.FRAGILE_FLOOR: {
            if (pCell.VisitCount < 2) {
              outcomes.push(data.outcomes.trapOutcomes.fragileFloor);
            }
            if (pCell.VisitCount >= 2) {
              outcomes.push(data.outcomes.trapOutcomes.fragileFloorCollapse);
              game.Player.addState(PLAYER_STATES.DEAD);
              finishGame(game, GAME_RESULTS.DEATH_TRAP);
            }
            break;
          }
          case CELL_TRAPS.TELEPORTER: {
            const newX = Math.floor(Math.random() * (game.Maze.Width - 1));
            const newY = Math.floor(Math.random() * (game.Maze.Height - 1));
            movePlayerAbsolute(game, lang, newX, newY);
            outcomes.push(data.outcomes.trapOutcomes.teleport);
            game = await grantTrophy(game, TROPHY_IDS.WHERE_AM_I);
            break;
          }
          case CELL_TRAPS.DEADFALL: {
            if (!delayTrigger) {
              outcomes.push(data.outcomes.trapOutcomes.deadfallTrigger);
            }
            if (delayTrigger) {
              switch (game.Player.Facing) {
                case DIRS.NORTH: {
                  game.Maze.removeExit(pCell, DIRS.SOUTH);
                  break;
                }
                case DIRS.SOUTH: {
                  game.Maze.removeExit(pCell, DIRS.NORTH);
                  break;
                }
                case DIRS.EAST: {
                  game.Maze.removeExit(pCell, DIRS.WEST);
                  break;
                }
                case DIRS.WEST: {
                  game.Maze.removeExit(pCell, DIRS.EAST);
                  break;
                }
              }
              pCell.removeTrap(CELL_TRAPS.DEADFALL);
              game.Actions[game.Actions.length - 1].changedCells.push(pCell);
              outcomes.push(data.outcomes.trapOutcomes.deadfall);
            }
            break;
          }
          default: {
            outcomes.push('DEBUG:', CELL_TRAPS[trapEnum], ' currently not implemented!');
          }
        } // end switch
      } // end if (!!(pCell.Traps & trapEnum))
    } // end for
  } // end if CELL_TRAPS.NONE
} // end trapCheck()

export function lifeCheck(game: Game, lang: string) {
  const status = game.Player.State;
  const outcomes = game.Actions[game.Actions.length - 1].outcomes;
  const data = GameLang.getInstance(lang);

  if (!!(status & PLAYER_STATES.POISONED)) {
    game.Player.Life -= 1;
    game.Actions[game.Actions.length - 1].playerLife = game.Player.Life;
  }

  if (game.Player.Life <= 0) {
    game.Player.addState(PLAYER_STATES.DEAD);
    outcomes.push(data.outcomes.deathPoison);
    finishGame(game, GAME_RESULTS.DEATH_POISON);
  }
}

export function calculateIntensity(intensity: number, distance: number, maxDistance: number) {
  return ((intensity - (distance - 1)) / intensity) * ((maxDistance - (distance - 1)) / maxDistance);
}

export function takeTurn(game: Game, lang: string, monster: Monster) {
  // const data = GameLang.getInstance(lang);
  // const pLoc = game.Player.Location;
  // const outcomes = game.Actions[game.Actions.length - 1].outcomes;
  const pCommand = game.Actions[game.Actions.length - 1].command;
  if (monster.Life <= 0) {
    monster.addState(MONSTER_STATES.DEAD);
  }
  // const flip = Math.random() * 10;
  const mLoc = game.Maze.getCell(monster.Location);
  // if the monster is not dead, it tries to move forward
  if (
    !(MONSTER_STATES.DEAD & monster.State) &&
    (!(game.Player.Location.col === monster.Location.col && game.Player.Location.row === monster.Location.row) || (pCommand === 10 || pCommand === 13))
  ) {
    // Monster will try to move randomly left, right, or forward. Otherwise it only turns.
    if (mLoc.isDirOpen(getLeft(monster.Facing))) {
      monsterMove(game, monster, getLeft(monster.Facing));
    } else if (mLoc.isDirOpen(monster.Facing)) {
      monsterMove(game, monster, monster.Facing);
    } else if (mLoc.isDirOpen(getRight(monster.Facing))) {
      monsterMove(game, monster, getRight(monster.Facing));
    } else {
      turnMonster(monster, DIRS.LEFT);
    }
  }
}

//     if (flip <= 3 && mLoc.isDirOpen(monster.Facing)) {
//       monsterMove(game, monster, monster.Facing);
//     } else if (flip >= 7 && mLoc.isDirOpen(getRight(monster.Facing))) {
//       monsterMove(game, monster, getRight(monster.Facing));
//     } else if (flip > 5 && mLoc.isDirOpen(getLeft(monster.Facing))) {
//       monsterMove(game, monster, getLeft(monster.Facing));
//     } else {
//       if (flip < 5) {
//         monster.Facing = getRight(monster.Facing);
//       } else {
//         monster.Facing = getLeft(monster.Facing);
//       }
//     }
//   }
// }

function monsterMove(game: Game, monster: Monster, dir: DIRS) {
  const method = `monsterMove([game], ${MONSTER_TAGS[monster.getTag()]}, ${DIRS[dir]}) :`;
  const oldCell = game.Maze.getCell(monster.Location);
  let newCell = game.Maze.getCell(monster.Location);
  switch (dir) {
    case DIRS.NORTH: {
      if (monster.Location.row - 1 >= 0) {
        monster.Location = new MazeLoc(monster.Location.row - 1, monster.Location.col);
        newCell = game.Maze.getCell(monster.Location);
        monster.Facing = DIRS.NORTH;
      } else {
        monster.Facing = DIRS.SOUTH;
      }
      break;
    }

    case DIRS.SOUTH: {
      if (monster.Location.row + 1 < game.Maze.Height) {
        monster.Location = new MazeLoc(monster.Location.row + 1, monster.Location.col);
        newCell = game.Maze.getCell(monster.Location);
        monster.Facing = DIRS.SOUTH;
      } else {
        monster.Facing = DIRS.NORTH;
      }
      break;
    }

    case DIRS.EAST: {
      if (monster.Location.col + 1 < game.Maze.Width) {
        monster.Location = new MazeLoc(monster.Location.row, monster.Location.col + 1);
        newCell = game.Maze.getCell(monster.Location);
        monster.Facing = DIRS.EAST;
      } else {
        monster.Facing = DIRS.WEST;
      }
      break;
    }

    case DIRS.WEST: {
      if (monster.Location.col - 1 >= 0) {
        monster.Location = new MazeLoc(monster.Location.row, monster.Location.col - 1);
        newCell = game.Maze.getCell(monster.Location);
        monster.Facing = DIRS.WEST;
      } else {
        monster.Facing = DIRS.EAST;
      }
      break;
    }
    default: {
      monster.Facing = getRight(monster.Facing);
      break;
    }
  } // end switch dir
  oldCell.removeTag(CELL_TAGS.MONSTER);
  newCell.addTag(CELL_TAGS.MONSTER);
  logDebug(__filename, method, 'The monster has moved successfully!');
}

function getRight(dir: DIRS): DIRS {
  switch (dir) {
    case DIRS.NORTH: {
      return DIRS.EAST;
    }
    case DIRS.SOUTH: {
      return DIRS.WEST;
    }
    case DIRS.EAST: {
      return DIRS.SOUTH;
    }
    case DIRS.WEST: {
      return DIRS.NORTH;
    }
    default: {
      return dir;
    }
  }
}

function getLeft(dir: DIRS): DIRS {
  switch (dir) {
    case DIRS.NORTH: {
      return DIRS.WEST;
    }
    case DIRS.SOUTH: {
      return DIRS.EAST;
    }
    case DIRS.EAST: {
      return DIRS.NORTH;
    }
    case DIRS.WEST: {
      return DIRS.SOUTH;
    }
    default: {
      return dir;
    }
  }
}

function turnMonster(monster: Monster, dir: DIRS) {
  switch (dir) {
    case DIRS.NORTH: {
      monster.Facing = DIRS.NORTH;
      break;
    }
    case DIRS.SOUTH: {
      monster.Facing = DIRS.SOUTH;
      break;
    }
    case DIRS.EAST: {
      monster.Facing = DIRS.EAST;
      break;
    }
    case DIRS.WEST: {
      monster.Facing = DIRS.WEST;
      break;
    }
    case DIRS.LEFT: {
      switch (monster.Facing) {
        case DIRS.NORTH: {
          monster.Facing = DIRS.WEST;
          break;
        }
        case DIRS.SOUTH: {
          monster.Facing = DIRS.EAST;
          break;
        }
        case DIRS.EAST: {
          monster.Facing = DIRS.NORTH;
          break;
        }
        case DIRS.WEST: {
          monster.Facing = DIRS.SOUTH;
          break;
        }
      }
      break;
    } // end case DIRS.LEFT
    case DIRS.RIGHT: {
      switch (monster.Facing) {
        case DIRS.NORTH: {
          monster.Facing = DIRS.EAST;
          break;
        }
        case DIRS.SOUTH: {
          monster.Facing = DIRS.WEST;
          break;
        }
        case DIRS.EAST: {
          monster.Facing = DIRS.SOUTH;
          break;
        }
        case DIRS.WEST: {
          monster.Facing = DIRS.NORTH;
          break;
        }
      }
      break;
    } // end case DIRS.LEFT
  } // end switch DIR
}
