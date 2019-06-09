import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import { CACHE_TYPES } from './Cache';

const log = Logger.getInstance();
const LAST_HIT_MODIFIER = 500;

export class CacheEntry {
  private item: any;
  private hitCount: number;
  private createTime: number;
  private lastHitTime: number;
  private cacheValue: number;

  constructor(cacheType: CACHE_TYPES, item: any) {
    const now = Date.now();
    this.item = this.coerce(cacheType, item);
    this.hitCount = 0;
    this.createTime = now;
    this.lastHitTime = Math.floor(now / LAST_HIT_MODIFIER); // convert now to minutes
    this.cacheValue = 0;
    logTrace(`constructor(${CACHE_TYPES[cacheType]}, ${item.id})`, 'CacheEntry instantiated.');
  }

  public get Item(): any {
    return this.item;
  }

  public get HitCount(): number {
    return this.hitCount;
  }

  public get LastHitTime(): number {
    return this.lastHitTime;
  }

  public get CreateTime(): number {
    return this.createTime;
  }

  public get SortKey(): number {
    return this.cacheValue;
  }

  /**
   * Adds to hit count and adjusts item's value in the cache based on
   * the last hit time and the total hit count.
   */
  public addHit() {
    this.hitCount++;
    this.lastHitTime = Math.floor(Date.now() / LAST_HIT_MODIFIER);
    this.cacheValue = this.lastHitTime + this.hitCount;
  }

  /**
   * Attempts to load raw JSON object into a specific class according to the given data type name
   *
   * @param object
   * @param cacheType
   */
  private coerce(cacheType: CACHE_TYPES, object: any): any {
    const method = `coerce(${object}, ${CACHE_TYPES[cacheType]})`;
    logTrace(method, `Attempting coercion. ${object.id}`);

    // if trace logging, we'll dump the actual JSON object too
    if (log.LogLevel === LOG_LEVELS.TRACE) {
      logTrace(method, JSON.stringify(object).substr(0, 100));
    }

    // when appropriate, try to instantiate specific class with the given data
    try {
      switch (cacheType) {
        case CACHE_TYPES.MAZE: {
          logTrace(method, `MazeBase coercion complete.`);
          return new MazeBase(object);
        }
        case CACHE_TYPES.TEAM: {
          logTrace(method, `Team coercion complete.`);
          return new Team(object);
        }
        case CACHE_TYPES.TROPHY: {
          logTrace(method, `Trophy coercion complete.`);
          return new Trophy(object);
        }
      }
    } catch (coerceError) {
      log.error(__filename, method, 'Coercion Error ->', coerceError);
      throw coerceError;
    }

    // if we get here with no errors, this dataType doesn't need to be coerced

    logTrace(method, `Coercion not required.`);
    return object;
  }
}

function logTrace(method: string, msg: string) {
  if (log.LogLevel >= LOG_LEVELS.DEBUG) {
    log.trace(__filename, method, msg);
  }
}
export default CacheEntry;
