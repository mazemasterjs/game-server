import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Game } from '@mazemasterjs/shared-library/Game';
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
   * @param jsonObj
   * @param cacheType
   */
  private coerce(cacheType: CACHE_TYPES, jsonObj: any): any {
    const method = `coerce(Object: ${jsonObj.id}, ${CACHE_TYPES[cacheType]})`;
    log.debug(__filename, method, `Attempting coercion.`);

    // if trace logging, we'll dump the actual JSON object too
    if (log.LogLevel === LOG_LEVELS.TRACE) {
      log.trace(__filename, method, JSON.stringify(jsonObj).substr(0, 100));
    }

    // when appropriate, try to instantiate specific class with the given data
    try {
      switch (cacheType) {
        case CACHE_TYPES.MAZE: {
          return new MazeBase(jsonObj);
        }
        case CACHE_TYPES.TEAM: {
          return new Team(jsonObj);
        }
        case CACHE_TYPES.TROPHY: {
          return new Trophy(jsonObj);
        }
      }
    } catch (coerceError) {
      log.error(__filename, method, 'Coercion Error ->', coerceError);
      throw coerceError;
    }

    // if we get here with no errors, this dataType doesn't need to be coerced
    log.debug(__filename, method, `Coercion not required.`);
    return jsonObj;
  }
}

export default CacheEntry;
