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
const CacheItem_1 = require("./CacheItem");
const Config_1 = __importDefault(require("./Config"));
const logger_1 = __importStar(require("@mazemasterjs/logger"));
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
/**
 * Different modes for cache eviction:
 * ITEM = Evicts A single item by objectId (evictArg=objectId).
 * COUNT = Evicts a specific number of items (evictArg=numberToEvict), sorted by age / hitcount
 * PERCENT = Evicts enough items to free a percentage of space (evictArg=targetPercent)
 */
var EVICT_MODES;
(function (EVICT_MODES) {
    EVICT_MODES[EVICT_MODES["ITEM"] = 0] = "ITEM";
    EVICT_MODES[EVICT_MODES["COUNT"] = 1] = "COUNT";
    EVICT_MODES[EVICT_MODES["PERCENT"] = 2] = "PERCENT";
})(EVICT_MODES || (EVICT_MODES = {}));
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
     * @returns CacheItem or undefined (if not found)
     */
    fetchItem(cacheType, objId) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `fetchItem(${CACHE_TYPES[cacheType]}, ${objId})`;
            const cache = this.getCacheArray(cacheType);
            // search the array for a matching item
            log.debug(__filename, method, 'Searching cache...');
            let cacheItem = yield cache.find(ci => {
                return ci.Item.Id === objId;
            });
            if (cacheItem === undefined) {
                // Cache miss - we'll try to pull it from the service
                log.warn(__filename, method, 'Item not found in cache, attempting to pull from service...');
                // make a call to the axios get wrapper
                cacheItem = yield fns
                    .doGet(`${fns.getSvcUrl(cacheType)}/get?id=${objId}`)
                    .then(itemArray => {
                    // we got a response - convert to cache item and give it a hit
                    // all /get calls return arrays - dealing with a single item, so go straight to element 0
                    const newCacheItem = new CacheItem_1.CacheItem(itemArray[0], cacheType);
                    newCacheItem.addHit();
                    // then store it in the cache
                    this.storeItem(cacheType, newCacheItem);
                    // and return so we can continue
                    return newCacheItem;
                })
                    .catch(getError => {
                    log.warn(__filename, method, 'Item not returned from service -> ' + getError.message);
                });
            }
            // return may be undefined
            if (cacheItem !== undefined) {
                cacheItem.addHit();
                log.debug(__filename, method, 'Returning objectId ' + cacheItem.item.Id);
                return Promise.resolve(cacheItem.item);
            }
            else {
                return Promise.reject(new Error(`${CACHE_TYPES[cacheType]} object ${objId} not found in cache or by service.`));
            }
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
            const cache = this.getCacheArray(cacheType);
            log.debug(__filename, method, `Searching for index of objectId: ${objectId}`);
            const index = yield cache.findIndex(ci => {
                return ci.Item.Id === objectId;
            });
            // got an index - evict and return eviction count (1)
            if (index === -1) {
                log.warn(__filename, method, `Attempted to evict non-existent tenant: cache=${CACHE_TYPES[cacheType]}, objectId=${objectId}, index=NOT_FOUND`);
                return Promise.reject(-1);
            }
            // we found 'em... now evict 'em!
            cache.splice(index, 1);
            // all done - log and return
            log.debug(__filename, method, `Eviction: cache=${CACHE_TYPES[cacheType]}, objectId=${objectId}, index=${index}`);
            this.logCacheStatus();
            return Promise.resolve(1);
        });
    }
    /**
     * Returns an array of all items in the requested cache
     * @param cacheType
     */
    fetchItems(cacheType) {
        const cache = this.getCacheArray(cacheType);
        const retArray = new Array();
        for (const cacheItem of cache) {
            retArray.push(cacheItem.Item);
        }
        log.debug(__filename, `fetchItems(${CACHE_TYPES[cacheType]})`, `Returning array of ${retArray.length} items.`);
        return retArray;
    }
    /**
     * Returns count of elements in the given cache
     * @param cacheType
     */
    countItems(cacheType) {
        return this.getCacheArray(cacheType).length;
    }
    /**
     * Dumps the specified cache stats to log
     * @param cacheType
     */
    dumpCache(cacheType) {
        // don't do this if the log level isn't high enough!
        if (log.LogLevel < logger_1.LOG_LEVELS.DEBUG) {
            return;
        }
        const method = `dumpCache(${CACHE_TYPES[cacheType]})`;
        const cache = this.getCacheArray(cacheType);
        for (const ci of cache) {
            const msg = `cache: ${CACHE_TYPES[cacheType]}, id=${ci.Item.Id} value=${ci.SortKey}, hits:${ci.HitCount}, lastHit=${ci.LastHitTime}`;
            log.debug(__filename, method, msg);
        }
    }
    /**
     * Pushes an object onto the bottom of the given cache array.
     * If the cache is full (cache.length >= env.CACHE_SIZE_<NAME>), shift top element before pushing
     *
     * @param newCacheItem
     * @param cacheType
     */
    storeItem(cacheType, newCacheItem) {
        const method = `storeItem(${CACHE_TYPES[cacheType]}, Object: ${newCacheItem.Item.Id})`;
        const cache = this.getCacheArray(cacheType);
        const max = this.getCacheSize(cacheType);
        // if the cache is full, sort it and pop off the bottom (lowest value) cached element
        if (cache.length >= max) {
            this.sortCache(cache);
            const trash = cache.pop();
            log.warn(__filename, method, `${CACHE_TYPES[cacheType]} full. ${trash ? trash.Item.Id : 'undefined'} removed from cache.`);
        }
        // now we can push the new item onto the cache
        cache.push(newCacheItem);
    }
    sortCache(cache) {
        return __awaiter(this, void 0, void 0, function* () {
            log.debug(__filename, 'sortCache(Array<CacheItem>)', `Sorting cache of ${cache.length} items.`);
            yield cache.sort((first, second) => {
                return second.SortKey - first.SortKey;
            });
        });
    }
    /**
     * Asynchronous cache intialization function preloads the mostly static data from
     * the database to improve overall performance
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // load the maze cache
            yield this.loadCache(config.SERVICE_MAZE + '/get', CACHE_TYPES.MAZE).catch(error => {
                log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
                return Promise.reject(error);
            });
            // load the trophy cache
            yield this.loadCache(config.SERVICE_TROPHY + '/get', CACHE_TYPES.TROPHY).catch(error => {
                log.error(__filename, 'constructor()', 'Error loading trophy cache ->', error);
                return Promise.reject(error);
            });
            // load the team cache
            yield this.loadCache(config.SERVICE_TEAM + '/get', CACHE_TYPES.TEAM).catch(error => {
                log.error(__filename, 'constructor()', 'Error loading team cache ->', error);
                return Promise.reject(error);
            });
            return Promise.resolve();
        });
    }
    loadCache(url, cacheType) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `loadCache(${fns.trimUrl(url)}, ${CACHE_TYPES[cacheType]})`;
            const startTime = Date.now();
            // set some cache-specific reference vars
            const cache = this.getCacheArray(cacheType);
            const max = this.getCacheSize(cacheType);
            // we'll use this to capture errors from arrow functions
            let error;
            // get the data we need to cache from the service passed via the url parameter
            const data = yield fns.doGet(url).catch(getDataError => {
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
                if (cacheType === CACHE_TYPES.MAZE) {
                    jsonObj = yield fns.doGet(url + `?id=${ele.id}`);
                    jsonObj = jsonObj[0]; // all /api/get calls return array, even for single-object responses
                }
                else {
                    jsonObj = ele;
                }
                try {
                    // pass the data through the coerce function to validate the data and get a fully functioning class object
                    const cacheItem = new CacheItem_1.CacheItem(jsonObj, cacheType);
                    // now attempt to push it onto the cache
                    this.storeItem(cacheType, cacheItem);
                    if (cache.length >= this.getCacheSize(cacheType)) {
                        log.warn(__filename, method, `${CACHE_TYPES[cacheType]} cache capacity reached (${max} loaded, ${data.length - max} uncached), aborting cache load.`);
                        break;
                    }
                }
                catch (storeError) {
                    log.warn(__filename, method, `Unable to cache ${CACHE_TYPES[cacheType]} item -> ${storeError.message}`);
                }
            }
            log.debug(__filename, method, `${CACHE_TYPES[cacheType]} cache loaded with ${cache.length} (max: ${max}) elements in ${Date.now() - startTime}ms.`);
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
        const cache = this.getCacheArray(cacheType);
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
    getCacheArray(cacheType) {
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
}
exports.Cache = Cache;
exports.default = Cache;
//# sourceMappingURL=Cache.js.map