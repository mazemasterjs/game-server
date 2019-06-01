import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';

const log = Logger.getInstance();

export class CacheItem {
  public item: any;
  public itemType: string;
  public hitCount: number;
  public lastHitTime: number;
  public createTime: number;

  constructor(item: any, itemType: string) {
    this.item = this.coerce(item, itemType);
    this.itemType = itemType;
    this.hitCount = 0;
    this.lastHitTime = 0;
    this.createTime = Date.now();
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
    log.debug(__filename, method, `${dataType} does not need to be coerced, returning unaltered object.`);
    return jsonObj;
  }
}

export default CacheItem;
