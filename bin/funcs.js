"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const actSmell_1 = require("./controllers/actSmell");
const axios_1 = __importDefault(require("axios"));
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Config_1 = require("./Config");
const actFeel_1 = require("./controllers/actFeel");
const actListen_1 = require("./controllers/actListen");
const actLook_1 = require("./controllers/actLook");
const GameLang_1 = __importDefault(require("./GameLang"));
const actTaste_1 = require("./controllers/actTaste");
const logger_1 = require("@mazemasterjs/logger");
const MazeLoc_1 = require("@mazemasterjs/shared-library/MazeLoc");
const actMove_1 = require("./controllers/actMove");
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
// tslint:disable-next-line: no-string-literal
axios_1.default.defaults.headers.common['Authorization'] = 'Basic ' + config.PRIMARY_SERVICE_ACCOUNT;
/**
 * Builds a standard response status message for logging
 *
 * @param url
 * @param res
 */
function genResMsg(url, res) {
    return `RESPONSE: status=${res.status}, statusText=${res.statusText}, elementCount=${res.data.length}, url=${url}`;
}
exports.genResMsg = genResMsg;
/**
 * Returns IGameStub versions of all games in the cache
 */
function getGameStubs() {
    logTrace(__filename, 'getGameStubs()', 'Building array of game stubs.');
    const games = Cache_1.Cache.use().fetchItems(Cache_1.CACHE_TYPES.GAME);
    const stubs = new Array();
    for (const game of games) {
        stubs.push(game.getStub(config.EXT_URL_GAME));
    }
    logDebug(__filename, 'getGameStubs()', `Returning array with ${stubs.length} IGameStub items.`);
    return stubs;
}
exports.getGameStubs = getGameStubs;
/**
 * Returns just the service URL path
 */
function trimUrl(url) {
    const pos = url.indexOf('/api');
    return pos > 0 ? url.substr(pos) : '/';
}
exports.trimUrl = trimUrl;
/**
 * Returns the service url that backs the given cache type
 *
 * @param cacheType
 */
function getSvcUrl(cacheType) {
    switch (cacheType) {
        case Cache_1.CACHE_TYPES.MAZE: {
            return config.SERVICE_MAZE;
        }
        case Cache_1.CACHE_TYPES.TEAM: {
            return config.SERVICE_TEAM;
        }
        case Cache_1.CACHE_TYPES.SCORE: {
            return config.SERVICE_SCORE;
        }
        case Cache_1.CACHE_TYPES.TROPHY: {
            return config.SERVICE_TROPHY;
        }
    }
}
exports.getSvcUrl = getSvcUrl;
/**
 * Returns the gameId of an active game, if found.  Otherwise returns '';
 *
 * @param teamId
 * @param botId
 */
function findGame(teamId, botId) {
    const method = `findGame(${teamId}, ${botId})`;
    botId = undefined ? '' : botId;
    let cacheEntry;
    logDebug(__filename, method, `Searching for active ${botId === '' ? 'TEAM' : 'BOT'} game.`);
    cacheEntry = Cache_1.Cache.use()
        .getCache(Cache_1.CACHE_TYPES.GAME)
        .find(ce => {
        const game = ce.Item;
        if (game.State === Enums_1.GAME_STATES.NEW || game.State === Enums_1.GAME_STATES.IN_PROGRESS) {
            return game.TeamId === teamId && game.BotId === botId;
        }
        else {
            return false;
        }
    });
    if (cacheEntry !== undefined) {
        logDebug(__filename, method, 'Active game found.');
        return cacheEntry.Item.Id;
    }
    else {
        logDebug(__filename, method, 'No active games found.');
        return '';
    }
}
exports.findGame = findGame;
/**
 * Returns true if the given botId exists in the given Team
 *
 * @param team
 * @param botId
 */
function findBot(team, botId) {
    const botIdx = team.Bots.findIndex(bot => {
        return bot.Id === botId;
    });
    return botIdx > -1;
}
exports.findBot = findBot;
/**
 * Returns data from the requested URL
 *
 * @param url string - Service API to request data from
 */
function doGet(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doGet(${trimUrl(url)})`;
        logTrace(__filename, method, `Requesting ${url}`);
        return yield axios_1.default
            .get(url)
            .then(res => {
            logDebug(__filename, method, genResMsg(url, res));
            if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                logDebug(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
            }
            return Promise.resolve(res.data);
        })
            .catch(axiosErr => {
            log.error(__filename, method, 'Error retrieving data ->', axiosErr);
            return Promise.reject(axiosErr);
        });
    });
}
exports.doGet = doGet;
/**
 * Puts given data to the given URL
 *
 * @param url
 * @param data
 */
function doPut(url, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doPut(${trimUrl(url)})`;
        logTrace(__filename, method, `Requesting ${url}`);
        return yield axios_1.default
            .put(url, data)
            .then(res => {
            logDebug(__filename, method, genResMsg(url, res));
            if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                logTrace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
            }
            return Promise.resolve(res.data);
        })
            .catch(axiosErr => {
            log.error(__filename, method, 'Error sending data ->', axiosErr);
            return Promise.reject(axiosErr);
        });
    });
}
exports.doPut = doPut;
/**
 * Clean up and standardize input, then attempt to map against available directions
 * to return the DIRS enum value of the given direction
 *
 * @param dirName
 */
function getDirByName(dirName) {
    switch (dirName.toUpperCase().trim()) {
        case 'NORTH': {
            return Enums_1.DIRS.NORTH;
        }
        case 'SOUTH': {
            return Enums_1.DIRS.SOUTH;
        }
        case 'EAST': {
            return Enums_1.DIRS.EAST;
        }
        case 'WEST': {
            return Enums_1.DIRS.WEST;
        }
        case 'NONE': {
            return Enums_1.DIRS.NONE;
        }
        case 'LEFT': {
            return Enums_1.DIRS.LEFT;
        }
        case 'RIGHT': {
            return Enums_1.DIRS.RIGHT;
        }
        default:
            log.warn(__filename, `getDirByName(${dirName})`, 'Invalid direction received, returning DIRS.NONE.');
            return Enums_1.DIRS.NONE;
    }
}
exports.getDirByName = getDirByName;
/**
 * Clean up and standardize input, then attempt to map against available commands
 * to return the correct COMMANDS enum value
 *
 * @param dirName
 */
function getCmdByName(cmdName) {
    switch (cmdName.toUpperCase().trim()) {
        case 'LOOK': {
            return Enums_1.COMMANDS.LOOK;
        }
        case 'JUMP': {
            return Enums_1.COMMANDS.JUMP;
        }
        case 'MOVE': {
            return Enums_1.COMMANDS.MOVE;
        }
        case 'SIT': {
            return Enums_1.COMMANDS.SIT;
        }
        case 'STAND': {
            return Enums_1.COMMANDS.STAND;
        }
        case 'TURN': {
            return Enums_1.COMMANDS.TURN;
        }
        case 'WRITE': {
            return Enums_1.COMMANDS.WRITE;
        }
        case 'QUIT': {
            return Enums_1.COMMANDS.QUIT;
        }
        case 'NONE': {
            return Enums_1.COMMANDS.NONE;
        }
        default:
            log.warn(__filename, `getCmdByName(${cmdName})`, 'Invalid command received, returning COMMANDS.NONE.');
            return Enums_1.COMMANDS.NONE;
    }
}
exports.getCmdByName = getCmdByName;
/**
 * Handles updating the player's location, associated maze cell visit/backtrack
 * counters.  MoveCount / action.MoveCount are handled in finalizeAction.
 *
 * @param game: Game - the current game
 * @param action: IAction - the pre-validated IAction behind this move
 */
function movePlayer(game, printOutcome = false) {
    const act = game.Actions[game.Actions.length - 1];
    // reposition the player - all move validation is preformed prior to this call
    switch (act.direction) {
        case Enums_1.DIRS.NORTH: {
            game.Player.Location.row--;
            if (printOutcome) {
                act.outcomes.push('You move to the North.');
            }
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            game.Player.Location.row++;
            if (printOutcome) {
                act.outcomes.push('You move to the South.');
            }
            break;
        }
        case Enums_1.DIRS.EAST: {
            game.Player.Location.col++;
            if (printOutcome) {
                act.outcomes.push('You move to the East.');
            }
            break;
        }
        case Enums_1.DIRS.WEST: {
            game.Player.Location.col--;
            if (printOutcome) {
                act.outcomes.push('You move to the West.');
            }
            break;
        }
    } // end switch(act.direction)
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
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
exports.movePlayer = movePlayer;
function movePlayerAbsolute(game, lang, x, y) {
    const cell = game.Maze.Cells[y][x];
    cell.addVisit(game.Score.MoveCount);
    game.Player.Location = new MazeLoc_1.MazeLoc(y, x);
    // send the updated game back
    return game;
}
exports.movePlayerAbsolute = movePlayerAbsolute;
/**
 * Adds the requested trophy and related bonusPoints to the given
 * game.Score object.
 *
 * @param game
 * @param trophyId
 * @returns Promise<Game>
 */
function grantTrophy(game, trophyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `grantTrophy(${game.Id}, ${Enums_1.TROPHY_IDS[trophyId]})`;
        yield Cache_1.Cache.use()
            .fetchOrGetItem(Cache_1.CACHE_TYPES.TROPHY, Enums_1.TROPHY_IDS[trophyId])
            .then(item => {
            const trophy = item;
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
            game.Actions[game.Actions.length - 1].outcomes.push('Error adding add trophy ' + Enums_1.TROPHY_IDS[trophyId] + ' -> ' + fetchError.message);
            logWarn(__filename, method, 'Unable to fetch trophy: ' + Enums_1.TROPHY_IDS[trophyId] + '. Error -> ' + fetchError.message);
        });
        return Promise.resolve(game);
    });
}
exports.grantTrophy = grantTrophy;
/**
 * Appeneds game summary as outcome strings on given action using values
 * from the given score
 *
 * @param action
 * @param score
 */
function summarizeGame(action, score) {
    action.outcomes.push(`Game Result: ${Enums_1.GAME_RESULTS[score.GameResult]}`);
    action.outcomes.push(`Moves: ${score.MoveCount}`);
    action.outcomes.push(`Backtracks: ${score.BacktrackCount}`);
    action.outcomes.push(`Bonus Points: ${score.BonusPoints}`);
    action.outcomes.push(`Trophies: ${score.Trophies.length}`);
    action.outcomes.push(`Total Score: ${score.getTotalScore()}`);
}
exports.summarizeGame = summarizeGame;
/**
 * Simple trace wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logTrace(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.TRACE) {
        log.trace(file, method, msg);
    }
}
exports.logTrace = logTrace;
/**
 * Simple debug wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logDebug(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.DEBUG) {
        log.debug(file, method, msg);
    }
}
exports.logDebug = logDebug;
/**
 * Simple warn wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logWarn(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.WARN) {
        log.warn(file, method, msg);
    }
}
exports.logWarn = logWarn;
/**
 * Simple error wrapper - really just here for consistency
 * @param file
 * @param method
 * @param msg
 */
function logError(file, method, msg, error) {
    log.error(file, method, msg, error);
}
exports.logError = logError;
/**
 * Checks for accept-language header and returns the 2-letter language code
 * or returns 'en' if none found - default language will be english (en)
 *
 * @param req
 */
function getLanguage(req) {
    const languageHeader = req.header('accept-language');
    let userLanguage = 'en';
    logDebug(__filename, 'getLanguage(req)', `Acquiring users language from the header: ${languageHeader}`);
    if (languageHeader && languageHeader.length >= 2) {
        userLanguage = languageHeader.substring(0, 2);
        logDebug(__filename, 'getLanguage(req)', 'userLanguage is ' + userLanguage);
    }
    return userLanguage;
}
exports.getLanguage = getLanguage;
/**
 * Aggregates some commmon scoring and debugging
 *
 * @param game
 * @param maze
 * @param action
 * @param startScore
 * @param finishScore
 */
function finalizeAction(game, actionMoveCount, startScore, langCode) {
    // increment move counters unless freeAction is set (new / resume game)
    game.Score.addMoves(actionMoveCount);
    game.Actions[game.Actions.length - 1].moveCount += actionMoveCount;
    // handle game out-of-moves ending
    if (game.Score.MoveCount >= game.Maze.CellCount * 3) {
        const lang = GameLang_1.default.getInstance(langCode);
        game.State = Enums_1.GAME_STATES.FINISHED;
        game.Score.GameResult = Enums_1.GAME_RESULTS.OUT_OF_MOVES;
        game.Score.addTrophy(Enums_1.TROPHY_IDS.OUT_OF_MOVES);
        if (game.Id.startsWith('FORCED')) {
            game.forceSetId(`${game.Id}__${Date.now()}`);
        }
        game.Actions[game.Actions.length - 1].outcomes.push(lang.outcomes.gameOverOutOfMoves);
    }
    // track the score change from this one move
    game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;
    // TODO: Move the minimap to it's own element instead of using outcomes
    try {
        const textRender = game.Maze.generateTextRender(true, game.Player.Location);
        game.Actions[game.Actions.length - 1].outcomes.push(textRender);
        logDebug(__filename, 'finalizeAction(...)', '\r\n' + textRender);
    }
    catch (renderError) {
        logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
    }
    // update the engrams
    if (!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
        getLocal(game, langCode);
        actLook_1.doLookLocal(game, langCode);
        actSmell_1.doSmellLocal(game, langCode);
        actListen_1.doListenLocal(game, langCode);
        actTaste_1.doTasteLocal(game, langCode);
        actFeel_1.doFeelLocal(game, langCode);
    }
    else {
        logWarn(__filename, 'finalizeAction(...)', `Player state is ${Enums_1.PLAYER_STATES[game.Player.State]} (${game.Player.State}) - no engram data collected.`);
    }
    return game.Actions[game.Actions.length - 1];
}
exports.finalizeAction = finalizeAction;
function getLocal(game, lang) {
    const method = `getLocal(${game.Id}, ${lang})`;
    logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram.here;
    const data = GameLang_1.default.getInstance(lang);
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH)) {
                    engram.exitNorth = true;
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH)) {
                    engram.exitSouth = true;
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST)) {
                    engram.exitSouth = true;
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST)) {
                    engram.exitWest = true;
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
    if (cell.Notes.length > 0) {
        cell.Notes.forEach(element => {
            engram.messages.push(element);
        });
    }
}
exports.getLocal = getLocal;
function doWrite(game, lang, message) {
    const method = `doWrite(${game.Id}, ${lang},${message})`;
    const cell = game.Maze.getCell(new MazeLoc_1.MazeLoc(game.Player.Location.row, game.Player.Location.col));
    const startScore = game.Score.getTotalScore();
    const engram = game.Actions[game.Actions.length - 1].engram.here;
    const data = GameLang_1.default.getInstance(lang);
    engram.messages.pop();
    if (cell.Notes[0] === '') {
        cell.Notes[0] = message.substr(0, 8);
    }
    else {
        cell.Notes.push(message.substr(0, 8));
    }
    logDebug(__filename, method, 'executed the write command');
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.message);
    return Promise.resolve(finalizeAction(game, 1, startScore, lang));
}
exports.doWrite = doWrite;
function trapCheck(game, lang, delayTrigger = false) {
    const pCell = game.Maze.getCell(game.Player.Location);
    const outcomes = game.Actions[game.Actions.length - 1].outcomes;
    const data = GameLang_1.default.getInstance(lang);
    if (!(pCell.Traps & Enums_1.CELL_TRAPS.NONE)) {
        for (let pos = 0; pos < 9; pos++) {
            const trapEnum = 1 << pos;
            if (!!(pCell.Traps & trapEnum)) {
                switch (trapEnum) {
                    case Enums_1.CELL_TRAPS.PIT: {
                        outcomes.push(data.outcomes.pitTrap);
                        game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                        actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                        break;
                    }
                    case Enums_1.CELL_TRAPS.MOUSETRAP: {
                        outcomes.push(data.outcomes.mouseTrap);
                        game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                        actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                        break;
                    }
                    case Enums_1.CELL_TRAPS.TARPIT: {
                        outcomes.push(data.outcomes.tarTrap);
                        game.Player.addState(Enums_1.PLAYER_STATES.SLOWED);
                        break;
                    }
                    case Enums_1.CELL_TRAPS.FLAMETHROWER: {
                        if (!(game.Player.State & Enums_1.PLAYER_STATES.LYING) && delayTrigger) {
                            outcomes.push(data.outcomes.flamethrowerTrap);
                            game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                            actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                        }
                        break;
                    }
                    case Enums_1.CELL_TRAPS.FRAGILE_FLOOR: {
                        if (delayTrigger) {
                            outcomes.push(data.outcomes.fragileFloorTrap);
                            pCell.removeTrap(Enums_1.CELL_TRAPS.FRAGILE_FLOOR);
                            pCell.addTrap(Enums_1.CELL_TRAPS.PIT);
                        }
                        break;
                    }
                    case Enums_1.CELL_TRAPS.TELEPORTER: {
                        const newX = Math.floor(Math.random() * (game.Maze.Width - 1));
                        const newY = Math.floor(Math.random() * (game.Maze.Height - 1));
                        movePlayerAbsolute(game, lang, newX, newY);
                        outcomes.push(data.outcomes.teleportTrap);
                        break;
                    }
                    case Enums_1.CELL_TRAPS.DEADFALL: {
                        if (delayTrigger) {
                            switch (game.Player.Facing) {
                                case Enums_1.DIRS.NORTH: {
                                    pCell.removeExit(Enums_1.DIRS.SOUTH, game.Maze.Cells);
                                    break;
                                }
                                case Enums_1.DIRS.SOUTH: {
                                    pCell.removeExit(Enums_1.DIRS.NORTH, game.Maze.Cells);
                                    break;
                                }
                                case Enums_1.DIRS.EAST: {
                                    pCell.removeExit(Enums_1.DIRS.WEST, game.Maze.Cells);
                                    break;
                                }
                                case Enums_1.DIRS.WEST: {
                                    pCell.removeExit(Enums_1.DIRS.EAST, game.Maze.Cells);
                                    break;
                                }
                            }
                            outcomes.push(data.outcomes.deadfallTrap);
                        }
                    }
                    default: {
                        outcomes.push('DEBUG:', Enums_1.CELL_TRAPS[trapEnum], ' currently not implemented!');
                    }
                } // end switch
            } // end if (!!(pCell.Traps & trapEnum))
        } // end for
    } // end if CELL_TRAPS.NONE
} // end trapCheck()
exports.trapCheck = trapCheck;
//# sourceMappingURL=funcs.js.map