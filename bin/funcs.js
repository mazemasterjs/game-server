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
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = require("./Config");
const axios_1 = __importDefault(require("axios"));
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
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
                logTrace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
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
function createIAction(actReq, game) {
    const action = {
        action: actReq.action,
        mazeId: game.Maze.Id,
        direction: Enums_1.DIRS[actReq.direction],
        location: game.Player.Location,
        score: game.Score,
        playerState: game.Player.State,
        botCohesion: actReq.cohesionScores,
        engram: new Engram_1.Engram({ sight: '', sound: '', smell: '', touch: '', taste: '' }),
        outcome: new Array(),
        trophies: new Array(),
    };
    return action;
}
exports.createIAction = createIAction;
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
//# sourceMappingURL=funcs.js.map