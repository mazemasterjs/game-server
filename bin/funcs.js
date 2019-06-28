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
const axios_1 = __importDefault(require("axios"));
const GameLang_1 = __importDefault(require("./GameLang"));
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Config_1 = require("./Config");
const actLook_1 = require("./controllers/actLook");
const logger_1 = require("@mazemasterjs/logger");
const MazeLoc_1 = require("@mazemasterjs/shared-library/MazeLoc");
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
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
function movePlayer(game) {
    const act = game.Actions[game.Actions.length - 1];
    // reposition the player - all move validation is preformed prior to this call
    switch (act.direction) {
        case Enums_1.DIRS.NORTH: {
            game.Player.Location.row--;
            act.outcomes.push('You move to the North.');
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            game.Player.Location.row++;
            act.outcomes.push('You move to the South.');
            break;
        }
        case Enums_1.DIRS.EAST: {
            game.Player.Location.col++;
            act.outcomes.push('You move to the East.');
            break;
        }
        case Enums_1.DIRS.WEST: {
            game.Player.Location.col--;
            act.outcomes.push('You move to the West.');
            break;
        }
    } // end switch(act.direction)
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
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
exports.movePlayer = movePlayer;
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
function finalizeAction(game, startScore, langCode) {
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
    }
    catch (renderError) {
        logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
    }
    // update the sight engrams
    actLook_1.doLookLocal(game, langCode);
    // update the smell engrams
    doSmellLocal(game, langCode);
    doListen(game, langCode);
    return game.Actions[game.Actions.length - 1];
}
exports.finalizeAction = finalizeAction;
function doSmellLocal(game, lang) {
    const method = `doSmellLocal(${game.Id}, ${lang})`;
    logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram;
    // get the local smells first
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row - 1, cell.Location.col));
                    doSmellDirected(game, lang, nextCell, engram.north.smell, Enums_1.DIRS.SOUTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row + 1, cell.Location.col));
                    doSmellDirected(game, lang, nextCell, engram.south.smell, Enums_1.DIRS.NORTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row, cell.Location.col + 1));
                    doSmellDirected(game, lang, nextCell, engram.east.smell, Enums_1.DIRS.WEST, 1);
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row, cell.Location.col - 1));
                    doSmellDirected(game, lang, nextCell, engram.west.smell, Enums_1.DIRS.EAST, 1);
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
}
exports.doSmellLocal = doSmellLocal;
function doSmellDirected(game, lang, cell, engramDir, lastDirection, distance) {
    const data = GameLang_1.default.getInstance(lang);
    const method = `doSmellDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
    logDebug(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
        setSmell(engramDir, { scent: 'Sulpur', strength: distance });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
        setSmell(engramDir, { scent: 'Cheese', strength: distance });
    }
    if (cell.Traps !== Enums_1.CELL_TRAPS.NONE) {
        for (let pos = 0; pos < 9; pos++) {
            const trapEnum = 1 << pos;
            const trapType = Enums_1.CELL_TRAPS[trapEnum];
            if (!!(cell.Traps & trapEnum)) {
                try {
                    const intensity = data.entities[trapType.toLowerCase()].smell.intensity;
                    const adjective = data.entities[trapType.toLowerCase()].smell.adjective;
                    // const intensityString = `data.entities.${trapType}.smell.intensity`;
                    // const adjectiveString = `data.entities.${trapType}.smell.adjective`;
                    // const intensity = eval(intensityString);  <-- very clever, but an unsafe operation that the linter opposes
                    // const adjective = eval(adjectiveString);  <-- very clever, but an unsafe operation that the linter opposes
                    if (distance < intensity) {
                        if (!engramDir.find(smell => {
                            if (smell.scent === adjective) {
                                if (smell.strength > distance) {
                                    smell.strength = distance;
                                }
                                return true;
                            }
                            else {
                                return false;
                            }
                        })) {
                            setSmell(engramDir, { scent: adjective, strength: distance });
                        }
                    }
                }
                catch (err) {
                    logDebug(__filename, method, err);
                }
            } // end (!!(cell.Traps & trapEnum))
        } // end for(pos<9)}
    } // if (!!(cell.Traps & CELL_TRAPS.NONE))
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0 && !(lastDirection === dir)) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row - 1, cell.Location.col));
                    doSmellDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.SOUTH, distance + 1);
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && !(lastDirection === dir)) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row + 1, cell.Location.col));
                    doSmellDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.NORTH, distance + 1);
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && !(lastDirection === dir)) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row, cell.Location.col + 1));
                    doSmellDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.WEST, distance + 1);
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0 && !(lastDirection === dir)) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.MazeLoc(cell.Location.row, cell.Location.col - 1));
                    doSmellDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.EAST, distance + 1);
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
} // end doSmellDirected
exports.doSmellDirected = doSmellDirected;
/**
 * Update the given smell array with given scent if smell[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param smell
 * @param scent
 */
function setSmell(smell, scent) {
    if (smell[0].scent === '') {
        smell[0] = scent;
    }
    else {
        smell.push(scent);
    }
}
function doListen(game, lang) {
    const method = `getSound(${game.Id}, ${game.Maze.Id}, ${lang})`;
    logTrace(__filename, method, 'Entering getSound()...');
    const data = GameLang_1.default.getInstance(lang);
    const engram = game.Actions[game.Actions.length - 1].engram;
    // Get the players X and Y position in the game
    const pX = game.Player.Location.col;
    const pY = game.Player.Location.row;
    let engramDir = [{ sound: 'silence', volume: 1 }];
    for (let y = pY - 8; y < pY + 8; y++) {
        for (let x = pX - 8; x < pX + 8; x++) {
            if (x >= 0 && x < game.Maze.Width && y >= 0 && y < game.Maze.Height) {
                const cell = game.Maze.getCell(new MazeLoc_1.MazeLoc(y, x));
                const distance = Math.floor(Math.sqrt(Math.pow(x - pX, 2) + Math.pow(y - pY, 2)));
                switch (calcDirection(x, y, pX, pY)) {
                    case Enums_1.DIRS.NORTH: {
                        engramDir = engram.north.hear;
                        break;
                    }
                    case Enums_1.DIRS.SOUTH: {
                        engramDir = engram.south.hear;
                        break;
                    }
                    case Enums_1.DIRS.EAST: {
                        engramDir = engram.east.hear;
                        break;
                    }
                    case Enums_1.DIRS.WEST: {
                        engramDir = engram.west.hear;
                        break;
                    }
                }
                if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
                    setSound(engramDir, { sound: 'Bubbling', volume: distance });
                }
                if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
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
function setSound(hear, sound) {
    if (hear[0].sound === '') {
        hear[0] = sound;
    }
    else {
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
function calcDirection(x1, y1, x2, y2) {
    const angle1 = calcAngleDegrees(x1, y1);
    const angle2 = calcAngleDegrees(x2, y2);
    const dirAngle = Math.abs((angle1 - angle2) % 360);
    if (dirAngle >= 315 || dirAngle <= 45) {
        return Enums_1.DIRS.NORTH;
    }
    if (dirAngle > 45 && dirAngle < 135) {
        return Enums_1.DIRS.EAST;
    }
    if (dirAngle >= 135 && dirAngle <= 225) {
        return Enums_1.DIRS.EAST;
    }
    if (dirAngle > 225 && dirAngle < 315) {
        return Enums_1.DIRS.EAST;
    }
    return Enums_1.DIRS.NONE;
}
exports.calcDirection = calcDirection;
function calcAngleDegrees(x, y) {
    return (Math.atan2(y, x) * 180) / Math.PI;
}
//# sourceMappingURL=funcs.js.map