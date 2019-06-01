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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("./funcs");
const CacheItem_1 = require("./CacheItem");
const axios_1 = __importDefault(require("axios"));
const GameConfig_1 = __importDefault(require("./GameConfig"));
const logger_1 = __importStar(require("@mazemasterjs/logger"));
// useful constants
const config = GameConfig_1.default.getInstance();
const log = logger_1.default.getInstance();
class Cache {
    // private constructor
    constructor() {
        // initialize cache arrays
        this.maze = new Array();
        this.team = new Array();
        this.score = new Array();
        this.game = new Array();
        this.trophy = new Array();
    }
    // intialization of singleton - promise-based to ensure cache loads before server starts
    static getInstance() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.instance === undefined) {
                this.instance = new Cache();
                yield this.instance.initialize().catch(initError => {
                    log.error(__filename, 'getInstance()', 'Cache Initialization Error ->', initError);
                    return Promise.reject(initError);
                });
            }
            // log all cache status
            this.instance.logCacheStatus();
            // all done!
            return Promise.resolve(this.instance);
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // load the maze cache
            yield this.loadCache(config.SERVICE_MAZE + '/get', 'maze').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
                return Promise.reject(error);
            });
            // load the trophy cache
            yield this.loadCache(config.SERVICE_TROPHY + '/get', 'trophy').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading trophy cache ->', error);
                return Promise.reject(error);
            });
            // load the team cache
            yield this.loadCache(config.SERVICE_TEAM + '/get', 'team').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading team cache ->', error);
                return Promise.reject(error);
            });
            return Promise.resolve();
        });
    }
    /**
     * Searches the given cache for matching object and returns if found
     *
     * @param cache
     * @param objId
     */
    getFromCache(cache, objId) {
        for (const entry of cache) {
            if (entry.item.Id === objId) {
                entry.hitCount++;
                entry.lastHitTime = Date.now();
                return entry.item;
            }
        }
    }
    loadCache(url, cacheName) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `loadCache(${funcs_1.trimUrl(url)}, ${cacheName.toUpperCase()})`;
            const startTime = Date.now();
            // set some cache-specific reference vars
            const cache = this.getCacheArrayByName(cacheName);
            const max = this.getCacheSizeByName(cacheName);
            // we'll use this to capture errors from arrow functions
            let error;
            // get the data we need to cache from the service passed via the url parameter
            const data = yield this.doGet(url).catch(getDataError => {
                log.error(__filename, method, 'Error requesting data ->', getDataError);
                error = getDataError;
            });
            // check for
            if (error !== undefined) {
                return Promise.reject(error);
            }
            // iterate through the elements in the returned JSON object array
            for (const ele of data) {
                let jsonObj;
                // api/maze/get only returns stubs, so we have to make a second request
                // to get the full maze data that we need for the cache
                if (cacheName === 'maze') {
                    jsonObj = yield this.doGet(url + `?id=${ele.id}`);
                    jsonObj = jsonObj[0]; // all /api/get calls return array, even for single-object responses
                }
                else {
                    jsonObj = ele;
                }
                try {
                    // pass the data through the coerce function to validate the data and get a fully functioning class object
                    const cacheItem = new CacheItem_1.CacheItem(jsonObj, cacheName);
                    // now attempt to push it onto the cache
                    this.pushOnCache(cacheItem, cacheName);
                    if (cache.length >= this.getCacheSizeByName(cacheName)) {
                        log.warn(__filename, method, `${cacheName.toUpperCase()} cache capacity reached (${max} loaded, ${data.length - max} uncached), aborting cache load.`);
                        break;
                    }
                }
                catch (coerceError) {
                    log.warn(__filename, method, `Unable to coerce {${cacheName.toUpperCase()}.id:${ele.id}} into ${cacheName.toUpperCase()} class, skipping element. Error -> ${coerceError.message}`);
                }
            }
            log.debug(__filename, method, `${cacheName.toUpperCase()} cache loaded with ${cache.length} (max: ${max}) elements in ${Date.now() - startTime}ms.`);
            return Promise.resolve(cache.length);
        });
    }
    /**
     * Pushes an object onto the bottom of the given cache array.
     * If the cache is full (cache.length >= env.CACHE_SIZE_<NAME>), shift top element before pushing
     *
     * @param object
     * @param cacheName
     */
    pushOnCache(object, cacheName) {
        const objId = object.Id !== undefined ? object.Id : object.id;
        const method = `pushOnCache(Object: ${objId}, ${cacheName.toUpperCase()})`;
        const cache = this.getCacheArrayByName(cacheName);
        const max = this.getCacheSizeByName(cacheName);
        if (cache.length >= max) {
            const trash = cache.shift();
            log.warn(__filename, method, `Cache is full, trashing ${cacheName.toUpperCase()} object: ${trash.Id !== undefined ? trash.Id : trash.id}`);
        }
        cache.push(object);
    }
    /**
     * Generates and info logs a simple cache status report
     */
    logCacheStatus() {
        let msg = '\r\n';
        msg += '========================================\r\n';
        msg += ':         CACHE STATUS REPORT          :\r\n';
        msg += ':--------------------------------------:\r\n';
        msg += ':  type  | cnt | max | fill |   hits   :\r\n';
        msg += ':--------------------------------------:\r\n';
        msg += `:   MAZE | ${this.getCacheStats('maze')} :\r\n`;
        msg += `:   TEAM | ${this.getCacheStats('team')} :\r\n`;
        msg += `:   GAME | ${this.getCacheStats('game')} :\r\n`;
        msg += `:  SCORE | ${this.getCacheStats('score')} :\r\n`;
        msg += `: TROPHY | ${this.getCacheStats('trophy')} :\r\n`;
        msg += '========================================\r\n';
        log.info(__filename, `logCacheStatus()`, msg);
    }
    getCacheStats(cacheName) {
        const stats = { len: '', max: '', pct: '', hits: '' };
        const cache = this.getCacheArrayByName(cacheName);
        const cLen = cache.length;
        const cMax = this.getCacheSizeByName(cacheName);
        const cPct = (cache.length / cMax) * 100;
        const cHits = this.countCacheHits(cache);
        stats.len = cLen.toString().padStart(3, ' ');
        stats.max = cMax.toString().padStart(3, ' ');
        stats.hits = cHits.toString().padStart(7, ' ');
        stats.pct = cPct
            .toFixed()
            .toString()
            .padStart(3, ' ');
        return `${stats.len} | ${stats.max} | ${stats.pct}% | ${stats.hits} `;
    }
    /**
     *  Returns the total number of cache hits for the given cache
     */
    countCacheHits(cache) {
        let totalHits = 0;
        for (const cItem of cache) {
            totalHits += cItem.hitCount;
        }
        return totalHits;
    }
    /**
     * Returns the requested cache's max size
     *
     * @param arrayName
     */
    getCacheSizeByName(arrayName) {
        switch (arrayName) {
            case 'maze': {
                return config.CACHE_SIZE_MAZES;
            }
            case 'team': {
                return config.CACHE_SIZE_TEAMS;
            }
            case 'score': {
                return config.CACHE_SIZE_SCORES;
            }
            case 'game': {
                return config.CACHE_SIZE_GAMES;
            }
            case 'trophy': {
                return config.CACHE_SIZE_TROPHIES;
            }
        }
        // this is bad news...
        const cacheError = new Error(`${arrayName} is not a valid cache array name.`);
        log.error(__filename, `getCacheSizeByName(${arrayName})`, 'Invalid Cache Name', cacheError);
        throw cacheError;
    }
    /**
     * Returns the requested cache array
     *
     * @param arrayName
     */
    getCacheArrayByName(arrayName) {
        switch (arrayName) {
            case 'maze': {
                return this.maze;
            }
            case 'team': {
                return this.team;
            }
            case 'score': {
                return this.score;
            }
            case 'game': {
                return this.game;
            }
            case 'trophy': {
                return this.trophy;
            }
        }
        // this is bad news...
        const cacheError = new Error(`${arrayName} is not a valid cache array name.`);
        log.error(__filename, `getCacheArrayByName(${arrayName})`, 'Invalid Cache Name', cacheError);
        throw cacheError;
    }
    /**
     * Returns data from the requested URL
     *
     * @param url string - Service API to request data from
     */
    doGet(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `doGet(${funcs_1.trimUrl(url)})`;
            log.debug(__filename, method, `Requesting ${url}`);
            return yield axios_1.default
                .get(url)
                .then(res => {
                log.debug(__filename, method, funcs_1.genResMsg(url, res));
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
}
exports.Cache = Cache;
exports.default = Cache;
//# sourceMappingURL=Cache.js.map