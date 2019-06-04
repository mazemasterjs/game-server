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
const Cache_1 = require("./Cache");
const logger_1 = require("@mazemasterjs/logger");
const Config_1 = require("./Config");
const axios_1 = __importDefault(require("axios"));
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
    log.debug(__filename, 'getGameStubs()', 'Building array of game stubs.');
    const games = Cache_1.Cache.use().fetchItems(Cache_1.CACHE_TYPES.GAME);
    const stubs = new Array();
    for (const game of games) {
        stubs.push(game.getStub(config.EXT_URL_GAME));
    }
    log.debug(__filename, 'getGameStubs()', `Returning array with ${stubs.length} IGameStub items.`);
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
        log.debug(__filename, method, `Requesting ${url}`);
        return yield axios_1.default
            .get(url)
            .then(res => {
            log.debug(__filename, method, genResMsg(url, res));
            if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                log.trace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
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
function getItem(cacheType, itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `getItem(${Cache_1.CACHE_TYPES[cacheType]}, ${itemId})`;
        log.debug(__filename, method, 'Fetching item from cache...');
        let cachedItem = yield Cache_1.Cache.use()
            .fetchItem(cacheType, itemId)
            .catch(fetchErr => {
            log.warn(__filename, method, 'Fetch failed -> ' + fetchErr.message);
        });
        // didn't find it in the cache
        if (cachedItem !== undefined) {
            log.debug(__filename, method, 'Fetch successful, returning ' + cachedItem.Id);
            return Promise.resolve(cachedItem);
        }
        else {
            log.debug(__filename, method, 'Item not in cache, retrieving...');
            return yield doGet(`${getSvcUrl(cacheType)}/get?id=${itemId}`)
                .then(itemArray => {
                // got the item, lets cache it!
                cachedItem = Cache_1.Cache.use().storeItem(cacheType, itemArray[0]);
                // and return so we can continue
                return Promise.resolve(cachedItem.item);
            })
                .catch(getError => {
                log.warn(__filename, method, `${getSvcUrl(cacheType)}/get?id=${itemId} failed -> ${getError.message}`);
                return Promise.reject(getError);
            });
        }
    });
}
exports.getItem = getItem;
//# sourceMappingURL=funcs.js.map