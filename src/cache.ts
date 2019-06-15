import * as fns from './funcs';
import { CacheEntry } from './CacheEntry';
import Config from './Config';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GAME_STATES } from '@mazemasterjs/shared-library/Enums';

// useful constants
const config: Config = Config.getInstance();
const log: Logger = Logger.getInstance();

// cache type enums
export enum CACHE_TYPES {
  MAZE,
  TEAM,
  GAME,
  SCORE,
  TROPHY,
}

export class Cache {
  // intialization of singleton - promise-based to ensure cache loads before server starts
  public static async getInstance(): Promise<Cache> {
    if (this.instance === undefined) {
      this.instance = new Cache();
      await this.instance.initialize().catch(initError => {
        log.error(__filename, 'getInstance()', 'Cache Initialization Error ->', initError);
        return Promise.reject(initError);
      });
    }

    // log all cache status
    this.instance.logCacheStatus();

    // all done!
    return Promise.resolve(this.instance);
  }

  /**
   * A non-promise based option for getting the static instance which useful for accessing the
   * cache outside of async functions.  WARNING: getNewInstance() MUST be called first or this will throw an exception!
   */
  public static use(): Cache {
    if (this.instance === undefined) {
      const instanceError = new Error(
        'Class not instantiated, use Cache.getInstance() BEFORE Cache.use()!  Tip: Avoid calling Cache.use() in a module/class global declaration.',
      );
      log.error(__filename, 'use()', 'Instance Error ->', instanceError);
      throw instanceError;
    }

    return this.instance;
  }

  // set instance variable
  private static instance: Cache;

  // initialize cache arrays
  private maze: Array<CacheEntry> = new Array<CacheEntry>();
  private team: Array<CacheEntry> = new Array<CacheEntry>();
  private score: Array<CacheEntry> = new Array<CacheEntry>();
  private game: Array<CacheEntry> = new Array<CacheEntry>();
  private trophy: Array<CacheEntry> = new Array<CacheEntry>();

  // private constructor
  private constructor() {}

  /**
   * Searches the given cache for matching object and returns if found.
   *
   * @param cache
   * @param objId
   * @returns CacheEntry.Item or undefined (if not found)
   */
  public fetchItem(cacheType: CACHE_TYPES, objId: string): any {
    const method = `fetchItem(${CACHE_TYPES[cacheType]}, ${objId})`;
    const cache: Array<CacheEntry> = this.getCache(cacheType);

    // search the array for a matching item
    fns.logTrace(__filename, method, 'Searching cache...');
    const cacheEntryAny: any = cache.find(ci => {
      return ci.Item.Id === objId;
    });

    // return may be undefined
    if (cacheEntryAny !== undefined) {
      const cacheEntry: CacheEntry = cacheEntryAny;
      cacheEntry.addHit();
      fns.logDebug(__filename, method, 'Item found.');
      return cacheEntry.Item;
    } else {
      fns.logDebug(__filename, method, 'Item not in cache.');
      const fetchError = new Error(`${CACHE_TYPES[cacheType]} item ${objId} not in cache.`);
      log.error(__filename, method, 'Error Fetching', fetchError);
      throw fetchError;
    }
  }

  /**
   * First attempts to fetch an item from the cache - if it's not found there, will
   * attempt to get the item from the appropriate service
   *
   * @param cacheType
   * @param itemId
   */
  public async fetchOrGetItem(cacheType: CACHE_TYPES, itemId: string): Promise<any> {
    const method = `fetchOrGetItem(${CACHE_TYPES[cacheType]}, ${itemId})`;

    // there is no games database or service, so do not attempt to get games
    if (cacheType === CACHE_TYPES.GAME) {
      return Promise.reject(new Error('INVALID CACHE TYPE -> GAME.  The game cache is not persisted.  Use Cache.fetchItem() instead.'));
    }

    fns.logTrace(__filename, method, 'Fetching item from cache...');

    try {
      return Promise.resolve(Cache.use().fetchItem(cacheType, itemId));
    } catch (fetchErr) {
      log.warn(__filename, method, 'Fetch failed -> ' + fetchErr.message);
    }

    // didn't find it in the cache
    fns.logTrace(__filename, method, 'Item not in cache, retrieving from service...');

    // So retrieve it from the appropriate service
    return await fns
      .doGet(`${fns.getSvcUrl(cacheType)}/get?id=${itemId}`)
      .then(itemArray => {
        if (itemArray.length === 0) {
          const notFoundError = new Error('Document not found.');
          fns.logWarn(__filename, method, notFoundError.message);
          return Promise.reject(notFoundError);
        }
        const cacheEntry = Cache.use().storeItem(cacheType, itemArray[0]);
        // and return so we can continue
        return Promise.resolve(cacheEntry.Item);
      })
      .catch(getError => {
        log.warn(__filename, method, `${fns.getSvcUrl(cacheType)}/get?id=${itemId} failed -> ${getError.message}`);
        return Promise.reject(getError);
      });
  }

  /**
   * Attempts to evict the cached object with the given objectId
   *
   * @param cacheType
   * @param objectId
   */
  public async evictItem(cacheType: CACHE_TYPES, objectId: number): Promise<number> {
    const method = `evictItem(${CACHE_TYPES[cacheType]}, ${objectId})`;
    const cache = this.getCache(cacheType);

    fns.logTrace(__filename, method, 'Searching for object index.');
    const index: number = cache.findIndex(ci => {
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
    this.logCacheStatus();
    return Promise.resolve(1);
  }

  /**
   * Returns an array of all items in the requested cache
   * @param cacheType
   */
  public fetchItems(cacheType: CACHE_TYPES): Array<any> {
    const cache: Array<CacheEntry> = this.getCache(cacheType);
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
  public countItems(cacheType: CACHE_TYPES): number {
    return this.getCache(cacheType).length;
  }

  /**
   * Returns the requested cache's max size
   *
   * @param cacheType
   */
  public getCacheSize(cacheType: CACHE_TYPES): number {
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
  public getCache(cacheType: CACHE_TYPES): Array<CacheEntry> {
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
  public dumpCache(cacheType: CACHE_TYPES) {
    // don't do this if the log level isn't high enough!
    if (log.LogLevel < LOG_LEVELS.DEBUG) {
      return;
    }

    const method = `dumpCache(${CACHE_TYPES[cacheType]})`;
    const cache: Array<CacheEntry> = this.getCache(cacheType);
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
  public storeItem(cacheType: CACHE_TYPES, object: any): any {
    const method = `storeItem(${CACHE_TYPES[cacheType]}, Object: ${object.id})`;
    fns.logTrace(__filename, method, 'Storing item in cache.');
    const cache = this.getCache(cacheType);
    const max: number = this.getCacheSize(cacheType);

    // create CacheEntry
    const cacheEntry = new CacheEntry(cacheType, object);

    // give the new item a hit
    cacheEntry.addHit();

    // if the cache is full, attempt to make some space
    if ((cache.length / max) * 100 > config.CACHE_PRUNE_TRIGGER_PERCENT) {
      try {
        this.pruneCache(cacheType);
      } catch (pruneError) {
        log.error(__filename, method, 'Cache Full ->', pruneError);
        throw pruneError;
      }
    }

    // now we can push the new entry onto the cache
    cache.push(cacheEntry);

    // offer the new cacheEntry as a return
    fns.logDebug(__filename, method, 'Item cached.');
    return cacheEntry;
  }

  /**
   * Sorts the given cache using Array.Sort() and CacheEntry.SortKey
   *
   * @param cache
   */
  private sortCache(cacheType: CACHE_TYPES) {
    const method = `sortCache(${CACHE_TYPES[cacheType]})`;
    const cache = this.getCache(cacheType);
    fns.logTrace(__filename, method, `Sorting cache of ${cache.length} items.`);
    cache.sort((first: CacheEntry, second: CacheEntry) => {
      if (cacheType === CACHE_TYPES.GAME) {
        // For games only, we'll massively devalue games that aren't IN_PROGRESS
        const fVal = first.Item.State >= GAME_STATES.FINISHED ? first.SortKey / 2 : first.SortKey;
        const sVal = second.Item.State >= GAME_STATES.FINISHED ? second.SortKey / 2 : second.SortKey;
        return sVal - fVal;
      } else {
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
  private pruneCache(cacheType: CACHE_TYPES) {
    const method = `pruneCache(${CACHE_TYPES[cacheType]})`;
    fns.logDebug(__filename, method, `Cache utilization above ${config.CACHE_PRUNE_TRIGGER_PERCENT}%, pruning.`);

    const cache = this.getCache(cacheType);
    const max = this.getCacheSize(cacheType);
    this.sortCache(cacheType);

    while ((cache.length / max) * 100 > config.CACHE_FREE_TARGET_PERCENT) {
      // special rules for game cache...
      if (cacheType === CACHE_TYPES.GAME) {
        const game: Game = cache[cache.length - 1].Item;
        if (game.State >= GAME_STATES.FINISHED) {
          cache.pop();
          fns.logDebug(__filename, method, `Evicted item from GAME cache: ${game.Id}`);
        } else {
          const pruneError = new Error(`GAME cache is ${(cache.length / max) * 100}% full with ACTIVE or very high cache-value games!`);
          log.error(__filename, method, 'GAME cache is full!', pruneError);
          this.logCacheStatus();
          throw pruneError;
        }
      } else {
        const ce = cache.pop();
        if (ce !== undefined) {
          fns.logDebug(__filename, method, `Evicted item from ${CACHE_TYPES[cacheType]} cache: ${!ce.Item.Id}`);
        } else {
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
  private async initialize() {
    // load the maze cache
    await this.loadCache(CACHE_TYPES.MAZE, config.SERVICE_MAZE + '/get').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
      return Promise.reject(error);
    });

    // load the trophy cache
    await this.loadCache(CACHE_TYPES.TROPHY, config.SERVICE_TROPHY + '/get').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading trophy cache ->', error);
      return Promise.reject(error);
    });

    // load the team cache
    await this.loadCache(CACHE_TYPES.TEAM, config.SERVICE_TEAM + '/get').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading team cache ->', error);
      return Promise.reject(error);
    });

    return Promise.resolve();
  }

  /**
   * Pulls data from the MMJS service backing the given cache type
   *
   * @param svcUrl
   * @param cacheType
   */
  private async loadCache(cacheType: CACHE_TYPES, svcUrl: string): Promise<number> {
    const method = `loadCache(${fns.trimUrl(svcUrl)}, ${CACHE_TYPES[cacheType]})`;
    const startTime = Date.now();

    // set some cache-specific reference vars
    const cache = this.getCache(cacheType);
    const max = this.getCacheSize(cacheType);

    let errorCount = 0; // <-- will use this to track errors and abort program if things look too bad
    const MAX_ERRORS = Math.ceil(max / config.CACHE_LOAD_MAX_FAIL_PERCENT);

    // get the data we need to cache from the service passed via the url parameter
    const data: any = await fns.doGet(svcUrl).catch(getDataError => {
      log.error(__filename, method, 'Error requesting data ->', getDataError);
    });

    // we'll need to reject the promise if data returned undefined
    if (data === undefined) {
      return Promise.reject(data);
    }

    // iterate through the elements in the returned JSON object array
    for (const ele of data) {
      let jsonObj: any;

      // api/maze/get only returns stubs, so we have to make a second request
      // to get the full maze data that we need for the cache
      if (cacheType === CACHE_TYPES.MAZE) {
        jsonObj = await fns.doGet(svcUrl + `?id=${ele.id}`);
        jsonObj = jsonObj[0]; // all /api/get calls return array, even for single-object responses
      } else {
        jsonObj = ele;
      }

      // now attempt to push it onto the cache (and give it a hit)
      try {
        fns.logTrace(__filename, method, 'Caching item.');
        this.storeItem(cacheType, jsonObj);
      } catch (storeError) {
        errorCount += 1;
        log.warn(__filename, method, `Error #${errorCount} (max ${MAX_ERRORS}) -> ${storeError.message}`);
        if (errorCount > MAX_ERRORS) {
          const maxFailError = new Error(
            `${errorCount} load error(s) exceeds the ${config.CACHE_LOAD_MAX_FAIL_PERCENT}% cache load failure rate, aborting startup.`,
          );
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
  }

  /**
   * Generates and info logs a simple cache status report
   */
  private logCacheStatus() {
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

  private getCacheStats(cacheType: CACHE_TYPES): any {
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
  private countCacheHits(cache: Array<CacheEntry>): number {
    let totalHits = 0;

    for (const ci of cache) {
      totalHits += ci.HitCount;
    }

    return totalHits;
  }
}

export default Cache;
