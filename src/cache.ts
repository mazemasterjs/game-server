import * as fns from './funcs';
import { CacheEntry } from './CacheEntry';
import Config from './Config';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';

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

/**
 * Different modes for cache eviction:
 * ITEM = Evicts A single item by objectId (evictArg=objectId).
 * COUNT = Evicts a specific number of items (evictArg=numberToEvict), sorted by age / hitcount
 * PERCENT = Evicts enough items to free a percentage of space (evictArg=targetPercent)
 */
enum EVICT_MODES {
  ITEM,
  COUNT,
  PERCENT,
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
   * @returns CacheEntry or undefined (if not found)
   */
  public async fetchItem(cacheType: CACHE_TYPES, objId: string): Promise<any> {
    const method = `fetchItem(${CACHE_TYPES[cacheType]}, ${objId})`;
    const cache: Array<CacheEntry> = this.getCacheArray(cacheType);

    // search the array for a matching item
    log.debug(__filename, method, 'Searching cache...');
    const cacheEntry: any = await cache.find(ci => {
      return ci.Item.Id === objId;
    });

    // return may be undefined
    if (cacheEntry !== undefined) {
      cacheEntry.addHit();
      log.debug(__filename, method, 'CACHE HIT!');
      return Promise.resolve(cacheEntry.item);
    } else {
      log.debug(__filename, method, 'CACHE MISS!');
      return Promise.reject(new Error(`${CACHE_TYPES[cacheType]} item ${objId} not in cache.`));
    }
  }

  /**
   * Attempts to evict the cached object with the given objectId
   *
   * @param cacheType
   * @param objectId
   */
  public async evictItem(cacheType: CACHE_TYPES, objectId: number): Promise<number> {
    const method = `evictItem(${CACHE_TYPES[cacheType]}, ${objectId})`;
    const cache = this.getCacheArray(cacheType);

    log.debug(__filename, method, `Searching for index of objectId: ${objectId}`);
    const index: number = await cache.findIndex(ci => {
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
  }

  /**
   * Returns an array of all items in the requested cache
   * @param cacheType
   */
  public fetchItems(cacheType: CACHE_TYPES): Array<any> {
    const cache = this.getCacheArray(cacheType);
    const retArray = new Array();

    for (const cacheEntry of cache) {
      retArray.push(cacheEntry.Item);
    }
    log.debug(__filename, `fetchItems(${CACHE_TYPES[cacheType]})`, `Returning array of ${retArray.length} items.`);
    return retArray;
  }

  /**
   * Returns count of elements in the given cache
   * @param cacheType
   */
  public countItems(cacheType: CACHE_TYPES): number {
    return this.getCacheArray(cacheType).length;
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
    const cache: Array<CacheEntry> = this.getCacheArray(cacheType);
    for (const ci of cache) {
      const msg = `cache: ${CACHE_TYPES[cacheType]}, id=${ci.Item.Id} value=${ci.SortKey}, hits:${ci.HitCount}, lastHit=${ci.LastHitTime}`;
      log.debug(__filename, method, msg);
    }
  }

  /**
   * Pushes an object onto the bottom of the given cache array.
   * If the cache is full (cache.length >= env.CACHE_SIZE_<NAME>), shift top element before pushing
   *
   * @param cacheType
   * @param object any - an appropriate Maze Master JSON object or instantiated class
   * @returns CacheItem - The CacheItem created while storing the mmjs Object into memory
   */
  public storeItem(cacheType: CACHE_TYPES, object: any): CacheEntry {
    const method = `storeItem(${CACHE_TYPES[cacheType]}, Object: ${object.id})`;
    const cache = this.getCacheArray(cacheType);
    const max: number = this.getCacheSize(cacheType);
    let cacheEntry: CacheEntry;

    // create CacheEntry
    cacheEntry = new CacheEntry(cacheType, object);

    // if the cache is full, sort it and pop off the bottom (lowest value) cached element
    if (cache.length >= max) {
      this.sortCache(cache);
      const trash: any = cache.pop();
      log.warn(__filename, method, `${CACHE_TYPES[cacheType]} full. ${trash ? trash.Item.Id : 'undefined'} removed from cache.`);
      // log.warn(__filename, method, `${CACHE_TYPES[cacheType]} full. Clearing an item from cache: ${JSON.stringify(trash).substr(0, 100)}`);
    }

    // now we can push the new entry onto the cache
    cache.push(cacheEntry);

    // offer the new cacheEntry as a return
    return cacheEntry;
  }

  /**
   * Sorts the given cache using Array.Sort() and CacheEntry.SortKey
   *
   * @param cache
   */
  private async sortCache(cache: Array<CacheEntry>) {
    log.debug(__filename, 'sortCache(Array<CacheEntry>)', `Sorting cache of ${cache.length} items.`);
    await cache.sort((first: CacheEntry, second: CacheEntry) => {
      return second.SortKey - first.SortKey;
    });
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
    const cache = this.getCacheArray(cacheType);
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
        log.debug(__filename, method, 'Storing item in cache.');
        this.storeItem(cacheType, jsonObj).addHit();
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

    log.debug(__filename, method, `${cache.length} items loaded in ${Date.now() - startTime}ms.`);
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
  private countCacheHits(cache: Array<CacheEntry>): number {
    let totalHits = 0;

    for (const ci of cache) {
      totalHits += ci.HitCount;
      // if (isNaN(ci.HitCount)) {
      //   console.log('NAN HC: ' + JSON.stringify(ci).substr(0, 100));
      // }
    }

    return totalHits;
  }

  /**
   * Returns the requested cache's max size
   *
   * @param cacheType
   */
  private getCacheSize(cacheType: CACHE_TYPES): number {
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
  private getCacheArray(cacheType: CACHE_TYPES): Array<CacheEntry> {
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

export default Cache;
