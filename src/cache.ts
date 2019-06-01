import { genResMsg, trimUrl } from './funcs';
import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import axios from 'axios';
import GameConfig from './GameConfig';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';

// useful constants
const config: GameConfig = GameConfig.getInstance();
const log: Logger = Logger.getInstance();

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
    return Promise.resolve(this.instance);
  }

  // set instance variable
  private static instance: Cache;

  // initialize cache arrays
  private maze: Array<MazeBase> = new Array<MazeBase>();
  private team: Array<Team> = new Array<Team>();
  private score: Array<Score> = new Array<Score>();
  private game: Array<Game> = new Array<Game>();
  private trophy: Array<Trophy> = new Array<Trophy>();

  // private constructor
  private constructor() {}

  private async initialize() {
    // load the maze cache
    await this.loadCache(config.SERVICE_MAZE + '/get', 'maze').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
      return Promise.reject(error);
    });

    // load the trophy cache
    await this.loadCache(config.SERVICE_TROPHY + '/get', 'trophy').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading trophy cache ->', error);
      return Promise.reject(error);
    });

    // load the team cache
    await this.loadCache(config.SERVICE_TEAM + '/get', 'team').catch(error => {
      log.error(__filename, 'constructor()', 'Error loading team cache ->', error);
      return Promise.reject(error);
    });

    // log all cache status
    this.logCacheStatus();

    return Promise.resolve();
  }

  private async loadCache(url: string, cacheName: string): Promise<number> {
    const method = `loadCache(${trimUrl(url)}, ${cacheName.toUpperCase()})`;
    const startTime = Date.now();

    // set some cache-specific reference vars
    const cache = this.getCacheArrayByName(cacheName);
    const max = this.getCacheSizeByName(cacheName);

    // we'll use this to capture errors from arrow functions
    let error;

    // get the data we need to cache from the service passed via the url parameter
    const data: any = await this.doGet(url).catch(getDataError => {
      log.error(__filename, method, 'Error requesting data ->', getDataError);
      error = getDataError;
    });

    // check for
    if (error !== undefined) {
      return Promise.reject(error);
    }

    // iterate through the elements in the returned JSON object array
    for (const ele of data) {
      let jsonObj: any;

      // api/maze/get only returns stubs, so we have to make a second request
      // to get the full maze data that we need for the cache
      if (cacheName === 'maze') {
        jsonObj = await this.doGet(url + `?id=${ele.id}`);

        // all /get calls return array (even for a single element), so we'll just grab the maze directly
        jsonObj = jsonObj[0];
      } else {
        jsonObj = ele;
      }

      try {
        // pass the data through the coerce function to validate the data and get a fully functioning class object
        jsonObj = this.coerce(jsonObj, cacheName);

        // now attempt to push it onto the cache
        this.pushOnCache(jsonObj, cacheName);
        if (cache.length >= this.getCacheSizeByName(cacheName)) {
          log.warn(__filename, method, `${cacheName.toUpperCase()} cache capacity reached (${max}), aborting load.`);
          break;
        }
      } catch (coerceError) {
        log.warn(
          __filename,
          method,
          `Unable to coerce {${cacheName.toUpperCase()}.id:${ele.id}} into ${cacheName.toUpperCase()} class, skipping element. Error -> ${coerceError.message}`,
        );
      }
    }

    log.debug(__filename, method, `${cacheName.toUpperCase()} cache loaded with ${cache.length} (max: ${max}) elements in ${Date.now() - startTime}ms.`);
    return Promise.resolve(cache.length);
  }

  /**
   * Pushes an object onto the bottom of the given cache array.
   * If the cache is full (cache.length >= env.CACHE_SIZE_<NAME>), shift top element before pushing
   *
   * @param object
   * @param cacheName
   */
  private pushOnCache(object: any, cacheName: string) {
    const objId: string = object.Id !== undefined ? object.Id : object.id;
    const method = `pushOnCache(Object: ${objId}, ${cacheName.toUpperCase()})`;
    const cache: Array<any> = this.getCacheArrayByName(cacheName);
    const max: number = this.getCacheSizeByName(cacheName);

    if (cache.length >= max) {
      const trash: any = cache.shift();
      log.warn(__filename, method, `Cache is full, trashing ${cacheName.toUpperCase()} object: ${trash.Id !== undefined ? trash.Id : trash.id}`);
    }

    cache.push(object);
  }

  /**
   * Attempts to load raw JSON object into a specific class according to the given data type name
   *
   * @param jsonObj
   * @param dataType
   */
  private coerce(jsonObj: any, dataType: string): any {
    const method = `coerce(Object: ${jsonObj.id}, ${dataType})`;
    log.debug(__filename, method, `Attempting to load ${dataType} with JSON object.`);

    // if trace logging, we'll dump the actual JSON object too
    if (log.LogLevel === LOG_LEVELS.TRACE) {
      log.trace(__filename, method, JSON.stringify(jsonObj));
    }

    // when appropriate, try to instantiate specific class with the given data
    try {
      switch (dataType) {
        case 'maze': {
          return new MazeBase(jsonObj);
        }
        case 'team': {
          return new Team(jsonObj);
        }
        case 'trophy': {
          return new Trophy(jsonObj);
        }
      }
    } catch (coerceError) {
      log.error(__filename, method, 'Coercion Error ->', coerceError);
      throw coerceError;
    }

    // if we get here with no errors, this dataType doesn't need to be coerced
    log.debug(__filename, method, `${dataType} does not need to be coerced, returning JSON object.`);
    return jsonObj;
  }

  /**
   * Generates and info logs a simple cache status report
   */
  private logCacheStatus() {
    let msg = '\r\n';
    msg += '==================================================\r\n';
    msg += ': CACHE STATUS REPORT                            :\r\n';
    msg += ':------------------------------------------------:\r\n';
    msg += `: MAZE CACHE   -> ${this.getCacheStats('maze')} :\r\n`;
    msg += `: TEAM CACHE   -> ${this.getCacheStats('team')} :\r\n`;
    msg += `: GAME CACHE   -> ${this.getCacheStats('game')} :\r\n`;
    msg += `: SCORE CACHE  -> ${this.getCacheStats('score')} :\r\n`;
    msg += `: TROPHY CACHE -> ${this.getCacheStats('trophy')} :\r\n`;
    msg += '==================================================\r\n';

    log.info(__filename, `logCacheStatus()`, msg);
  }

  private getCacheStats(cacheName: string): any {
    const stats = { len: '', max: '', pct: '' };
    const cache = this.getCacheArrayByName(cacheName);
    const cLen = cache.length;
    const cMax = this.getCacheSizeByName(cacheName);
    const cPct = (cache.length / cMax) * 100;

    stats.len = cLen.toString().padStart(3, ' ');
    stats.max = cMax.toString().padStart(3, ' ');
    stats.pct = cPct.toString().padStart(3, ' ');

    return `${stats.len} of ${stats.max} | UTILIZATION: ${stats.pct}%`;
  }

  /**
   * Returns the requested cache's max size
   *
   * @param arrayName
   */
  private getCacheSizeByName(arrayName: string): number {
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
  private getCacheArrayByName(arrayName: string): Array<any> {
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
  private async doGet(url: string): Promise<any> {
    const method = `doGet(${trimUrl(url)})`;
    log.debug(__filename, method, `Requesting ${url}`);

    return await axios
      .get(url)
      .then(res => {
        log.debug(__filename, method, genResMsg(url, res));
        if (log.LogLevel === LOG_LEVELS.TRACE) {
          log.trace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
        }
        return Promise.resolve(res.data);
      })
      .catch(axiosErr => {
        log.error(__filename, method, 'Error retrieving data ->', axiosErr);
        return Promise.reject(axiosErr);
      });
  }
}

export default Cache;
