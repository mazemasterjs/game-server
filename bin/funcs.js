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
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Config_1 = require("./Config");
const logger_1 = require("@mazemasterjs/logger");
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
        // case 'QUIT': {
        //   return COMMANDS.QUIT;
        // }
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
function movePlayer(game, act) {
    const pLoc = game.Player.Location;
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
    }
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
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
function finalizeAction(game, maze, startScore) {
    // increment move counters
    game.Score.addMove();
    game.Actions[game.Actions.length - 1].moveCount++;
    // track the score change from this one move
    game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;
    // TODO: Remove summarize from every every move - here now for DEV/DEBUG  purposes
    summarizeGame(game.Actions[game.Actions.length - 1], game.Score);
    // TODO: text render - here now just for DEV/DEBUG purposess
    game.Actions[game.Actions.length - 1].outcomes.push('DEBUG MAZE RENDER\r\n: ' + maze.generateTextRender(true, game.Player.Location));
    logDebug(__filename, 'finalizeAction(...)', '\r\n' + maze.generateTextRender(true, game.Player.Location));
    return game.Actions[game.Actions.length - 1];
}
exports.finalizeAction = finalizeAction;
//# sourceMappingURL=funcs.js.map