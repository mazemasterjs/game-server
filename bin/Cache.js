"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fns = __importStar(require("./funcs"));
const CacheEntry_1 = require("./CacheEntry");
const Config_1 = __importDefault(require("./Config"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
// useful constants
const config = Config_1.default.getInstance();
const log = logger_1.default.getInstance();
// cache type enums
var CACHE_TYPES;
(function (CACHE_TYPES) {
    CACHE_TYPES[CACHE_TYPES["MAZE"] = 0] = "MAZE";
    CACHE_TYPES[CACHE_TYPES["TEAM"] = 1] = "TEAM";
    CACHE_TYPES[CACHE_TYPES["GAME"] = 2] = "GAME";
    CACHE_TYPES[CACHE_TYPES["SCORE"] = 3] = "SCORE";
    CACHE_TYPES[CACHE_TYPES["TROPHY"] = 4] = "TROPHY";
})(CACHE_TYPES = exports.CACHE_TYPES || (exports.CACHE_TYPES = {}));
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
    /**
     * A non-promise based option for getting the static instance which useful for accessing the
     * cache outside of async functions.  WARNING: getNewInstance() MUST be called first or this will throw an exception!
     */
    static use() {
        if (this.instance === undefined) {
            const instanceError = new Error('Class not instantiated, use Cache.getInstance() BEFORE Cache.use()!  Tip: Avoid calling Cache.use() in a module/class global declaration.');
            log.error(__filename, 'use()', 'Instance Error ->', instanceError);
            throw instanceError;
        }
        return this.instance;
    }
    /**
     * Searches the given cache for matching object and returns if found.
     *
     * @param cache
     * @param objId
     * @returns CacheEntry.Item or undefined (if not found)
     */
    fetchItem(cacheType, objId) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `fetchItem(${CACHE_TYPES[cacheType]}, ${objId})`;
            const cache = this.getCache(cacheType);
            // search the array for a matching item
            fns.logTrace(__filename, method, 'Searching cache...');
            const cacheEntryAny = cache.find(ci => {
                return ci.Item.Id === objId;
            });
            // return may be undefined
            if (cacheEntryAny !== undefined) {
                const cacheEntry = cacheEntryAny;
                cacheEntry.addHit();
                fns.logDebug(__filename, method, 'Item found.');
                return Promise.resolve(cacheEntry.Item);
            }
            else {
                fns.logDebug(__filename, method, 'Item not in cache.');
                const fetchError = new Error(`${CACHE_TYPES[cacheType]} item ${objId} not in cache.`);
                fns.logWarn(__filename, method, fetchError.message);
                return Promise.reject(fetchError);
            }
        });
    }
    /**
     * First attempts to fetch an item from the cache - if it's not found there, will
     * attempt to get the item from the appropriate service
     *
     * @param cacheType
     * @param itemId
     */
    fetchOrGetItem(cacheType, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `fetchOrGetItem(${CACHE_TYPES[cacheType]}, ${itemId})`;
            // there is no games database or service, so do not attempt to get games
            if (cacheType === CACHE_TYPES.GAME) {
                return Promise.reject(new Error('INVALID CACHE TYPE -> GAME.  The game cache is not persisted.  Use Cache.fetchItem() instead.'));
            }
            fns.logTrace(__filename, method, 'Fetching item from cache...');
            let item = yield this.fetchItem(cacheType, itemId)
                .then(cacheItem => {
                return Promise.resolve(cacheItem);
            })
                .catch(fetchError => {
                fns.logTrace(__filename, method, fetchError.message + '-> Item not in cache, retrieving from service.');
            });
            // not in cache so retrieve it from the appropriate service
            if (item === undefined) {
                item = yield fns
                    .doGet(`${fns.getSvcUrl(cacheType)}/get?id=${itemId}`)
                    .then(itemArray => {
                    const cacheEntry = Cache.use().storeItem(cacheType, itemArray[0]);
                    return Promise.resolve(cacheEntry.item);
                })
                    .catch(getError => {
                    log.warn(__filename, method, `${fns.getSvcUrl(cacheType)}/get?id=${itemId} failed -> ${getError.message}`);
                    return Promise.reject(getError);
                });
            }
            return item; // item is a promise reject/resolve
        });
    }
    /**
     * Attempts to evict the cached object with the given objectId
     *
     * @param cacheType
     * @param objectId
     */
    evictItem(cacheType, objectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `evictItem(${CACHE_TYPES[cacheType]}, ${objectId})`;
            const cache = this.getCache(cacheType);
            fns.logTrace(__filename, method, 'Searching for object index.');
            const index = cache.findIndex(ci => {
                return ci.Item.Id === objectId;
            });
            // got an index - evict and return eviction count (1)
            if (index === -1) {
                log.warn(__filename, method, 'Attempted to evict non-existent tenant.');
                return Promise.reject(-1);
            }
            // we found 'em... now evict 'em!
            cache.splice(index, 1);
            // all done - log and return
            fns.logDebug(__filename, method, 'Item evicted.');
            return Promise.resolve(1);
        });
    }
    /**
     * Returns an array of all items in the requested cache
     * @param cacheType
     */
    fetchItems(cacheType) {
        const cache = this.getCache(cacheType);
        const retArray = new Array();
        for (const cacheEntry of cache) {
            retArray.push(cacheEntry.Item);
        }
        fns.logDebug(__filename, `fetchItems(${CACHE_TYPES[cacheType]})`, `Fetch complete, returning ${retArray.length} items.`);
        return retArray;
    }
    /**
     * Returns count of elements in the given cache
     * @param cacheType
     */
    countItems(cacheType) {
        return this.getCache(cacheType).length;
    }
    /**
     * Returns the requested cache's max size
     *
     * @param cacheType
     */
    getCacheSize(cacheType) {
        switch (cacheType) {
            case CACHE_TYPES.MAZE: {
                return config.CACHE_SIZE_MAZES;
            }
            case CACHE_TYPES.TEAM: {
                return config.CACHE_SIZE_TEAMS;
            }
            case CACHE_TYPES.SCORE: {
                return config.CACHE_SIZE_SCORES;
            }
            case CACHE_TYPES.GAME: {
                return config.CACHE_SIZE_GAMES;
            }
            case CACHE_TYPES.TROPHY: {
                return config.CACHE_SIZE_TROPHIES;
            }
        }
        // this is bad news...
        const cacheError = new Error(`${cacheType} is not a valid cache array name.`);
        log.error(__filename, `getCacheSizeByName(${cacheType})`, 'Invalid Cache Name', cacheError);
        throw cacheError;
    }
    /**
     * Returns the requested cache array
     *
     * @param cacheType
     */
    getCache(cacheType) {
        switch (cacheType) {
            case CACHE_TYPES.MAZE: {
                return this.maze;
            }
            case CACHE_TYPES.TEAM: {
                return this.team;
            }
            case CACHE_TYPES.SCORE: {
                return this.score;
            }
            case CACHE_TYPES.GAME: {
                return this.game;
            }
            case CACHE_TYPES.TROPHY: {
                return this.trophy;
            }
        }
        // this is bad news...
        const cacheError = new Error(`${cacheType} is not a valid cache array name.`);
        log.error(__filename, `getCacheArrayByName(${cacheType})`, 'Invalid Cache Name', cacheError);
        throw cacheError;
    }
    /**
     * Dumps the specified cache stats to log
     * @param cacheType
     */
    dumpCache(cacheType) {
        const method = `dumpCache(${CACHE_TYPES[cacheType]})`;
        const cache = this.getCache(cacheType);
        for (const ci of cache) {
            const msg = `cache: ${CACHE_TYPES[cacheType]}, id=${ci.Item.Id} value=${ci.SortKey}, hits:${ci.HitCount}, lastHit=${ci.LastHitTime}`;
            fns.logTrace(__filename, method, msg);
        }
        this.logCacheStatus();
    }
    /**
     * Pushes an object onto the bottom of the given cache array.
     * If the cache is full (cache.length >= env.CACHE_SIZE_<NAME>), shift top element before pushing
     *
     * @param cacheType
     * @param object any - an appropriate Maze Master JSON object or instantiated class
     * @returns CacheItem - The CacheItem created while storing the mmjs Object into memory
     */
    storeItem(cacheType, object) {
        const method = `storeItem(${CACHE_TYPES[cacheType]}, Object: ${object.id})`;
        fns.logTrace(__filename, method, 'Storing item in cache.');
        const cache = this.getCache(cacheType);
        const max = this.getCacheSize(cacheType);
        // create CacheEntry
        const cacheEntry = new CacheEntry_1.CacheEntry(cacheType, object);
        // give the new item a hit
        cacheEntry.addHit();
        // if the cache is full, attempt to make some space
        if ((cache.length / max) * 100 > config.CACHE_PRUNE_TRIGGER_PERCENT) {
            try {
                this.pruneCache(cacheType);
            }
            catch (pruneError) {
                log.error(__filename, method, 'Cache Full ->', pruneError);
                throw pruneError;
            }
        }
        // now we can push the new entry onto the cache
        cache.push(cacheEntry);
        // offer the new cacheEntry as a return
        fns.logDebug(__filename, method, 'Item cached.');
        this.logCacheStatus();
        return cacheEntry;
    }
    /**
     * Sorts the given cache using Array.Sort() and CacheEntry.SortKey
     *
     * @param cache
     */
    sortCache(cacheType) {
        const method = `sortCache(${CACHE_TYPES[cacheType]})`;
        const cache = this.getCache(cacheType);
        fns.logTrace(__filename, method, `Sorting cache of ${cache.length} items.`);
        cache.sort((first, second) => {
            if (cacheType === CACHE_TYPES.GAME) {
                // For games only, we'll massively devalue games that aren't IN_PROGRESS
                const fVal = first.Item.State >= Enums_1.GAME_STATES.FINISHED ? first.SortKey / 2 : first.SortKey;
                const sVal = second.Item.State >= Enums_1.GAME_STATES.FINISHED ? second.SortKey / 2 : second.SortKey;
                return sVal - fVal;
            }
            else {
                // for everyting else, we'll use the existing hit/time-based value
                return second.SortKey - first.SortKey;
            }
        });
        fns.logDebug(__filename, method, 'Cache sorted.');
    }
    /**
     * Triggered when cache utilization is above env.CACHE_PRUNE_TRIGGER_PERCENT, will attempt to remove items
     * until utilization is env.CACHE_FREE_TARGET_PERCENT or lower.
     *
     * @param cacheType
     */
    pruneCache(cacheType) {
        const method = `pruneCache(${CACHE_TYPES[cacheType]})`;
        fns.logDebug(__filename, method, `Cache utilization above ${config.CACHE_PRUNE_TRIGGER_PERCENT}%, pruning.`);
        const cache = this.getCache(cacheType);
        const max = this.getCacheSize(cacheType);
        this.sortCache(cacheType);
        while ((cache.length / max) * 100 > config.CACHE_FREE_TARGET_PERCENT) {
            // special rules for game cache...
            if (cacheType === CACHE_TYPES.GAME) {
                const game = cache[cache.length - 1].Item;
                if (game.State >= Enums_1.GAME_STATES.FINISHED) {
                    cache.pop();
                    fns.logDebug(__filename, method, `Evicted item from GAME cache: ${game.Id}`);
                }
                else {
                    const pruneError = new Error(`GAME cache is ${(cache.length / max) * 100}% full with ACTIVE or very high cache-value games!`);
                    log.error(__filename, method, 'GAME cache is full!', pruneError);
                    this.logCacheStatus();
                    throw pruneError;
                }
            }
            else {
                const ce = cache.pop();
                if (ce !== undefined) {
                    fns.logDebug(__filename, method, `Evicted item from ${CACHE_TYPES[cacheType]} cache: ${!ce.Item.Id}`);
                }
                else {
                    log.warn(__filename, method, `Eviction error! Cache size too low? Check env.CACHE_SIZE_[cache-name]!`);
                }
            }
        }
        // log a cache status report
        this.logCacheStatus();
    }
    /**
     * Asynchronous cache intialization function preloads the mostly static data from
     * the database to improve overall performance
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // load the maze cache
            yield this.loadCache(CACHE_TYPES.MAZE, config.SERVICE_MAZE + '/get').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
                return Promise.reject(error);
            });
            // load the trophy cache
            yield this.loadCache(CACHE_TYPES.TROPHY, config.SERVICE_TROPHY + '/get').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading trophy cache ->', error);
                return Promise.reject(error);
            });
            // load the team cache
            yield this.loadCache(CACHE_TYPES.TEAM, config.SERVICE_TEAM + '/get').catch(error => {
                log.error(__filename, 'constructor()', 'Error loading team cache ->', error);
                return Promise.reject(error);
            });
            return Promise.resolve();
        });
    }
    /**
     * Pulls data from the MMJS service backing the given cache type
     *
     * @param svcUrl
     * @param cacheType
     */
    loadCache(cacheType, svcUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `loadCache(${fns.trimUrl(svcUrl)}, ${CACHE_TYPES[cacheType]})`;
            const startTime = Date.now();
            // set some cache-specific reference vars
            const cache = this.getCache(cacheType);
            const max = this.getCacheSize(cacheType);
            let errorCount = 0; // <-- will use this to track errors and abort program if things look too bad
            const MAX_ERRORS = Math.ceil(max / config.CACHE_LOAD_MAX_FAIL_PERCENT);
            // get the data we need to cache from the service passed via the url parameter
            const data = yield fns.doGet(svcUrl).catch(getDataError => {
                log.error(__filename, method, 'Error requesting data ->', getDataError);
            });
            // we'll need to reject the promise if data returned undefined
            if (data === undefined) {
                return Promise.reject(data);
            }
            // iterate through the elements in the returned JSON object array
            for (const ele of data) {
                let jsonObj;
                // api/maze/get only returns stubs, so we have to make a second request
                // to get the full maze data that we need for the cache
                if (cacheType === CACHE_TYPES.MAZE) {
                    jsonObj = yield fns.doGet(svcUrl + `?id=${ele.id}`);
                    jsonObj = jsonObj[0]; // all /api/get calls return array, even for single-object responses
                }
                else {
                    jsonObj = ele;
                }
                // now attempt to push it onto the cache (and give it a hit)
                try {
                    fns.logTrace(__filename, method, 'Caching item.');
                    this.storeItem(cacheType, jsonObj);
                }
                catch (storeError) {
                    errorCount += 1;
                    log.warn(__filename, method, `Error #${errorCount} (max ${MAX_ERRORS}) -> ${storeError.message}`);
                    if (errorCount > MAX_ERRORS) {
                        const maxFailError = new Error(`${errorCount} load error(s) exceeds the ${config.CACHE_LOAD_MAX_FAIL_PERCENT}% cache load failure rate, aborting startup.`);
                        log.error(__filename, method, `Cache Load Failure Rate Exceeded ->`, maxFailError);
                        return Promise.reject(maxFailError);
                    }
                }
                if (cache.length >= max) {
                    log.warn(__filename, method, `Cache capacity reached, aborting load with ${data.length - cache.length} elements uncached.`);
                    break;
                }
            }
            fns.logDebug(__filename, method, `${cache.length} items loaded in ${Date.now() - startTime}ms.`);
            return Promise.resolve(cache.length);
        });
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
        msg += `:   MAZE | ${this.getCacheStats(CACHE_TYPES.MAZE)} :\r\n`;
        msg += `:   TEAM | ${this.getCacheStats(CACHE_TYPES.TEAM)} :\r\n`;
        msg += `:   GAME | ${this.getCacheStats(CACHE_TYPES.GAME)} :\r\n`;
        msg += `:  SCORE | ${this.getCacheStats(CACHE_TYPES.SCORE)} :\r\n`;
        msg += `: TROPHY | ${this.getCacheStats(CACHE_TYPES.TROPHY)} :\r\n`;
        msg += '========================================\r\n';
        log.info(__filename, `logCacheStatus()`, msg);
    }
    getCacheStats(cacheType) {
        const stats = { len: '', max: '', pct: '', hits: '' };
        const cache = this.getCache(cacheType);
        const cLen = cache.length;
        const cMax = this.getCacheSize(cacheType);
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
        for (const ci of cache) {
            totalHits += ci.HitCount;
        }
        return totalHits;
    }
}
exports.Cache = Cache;
exports.default = Cache;
//# sourceMappingURL=Cache.js.map