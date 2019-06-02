"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
const MazeBase_1 = require("@mazemasterjs/shared-library/MazeBase");
const Team_1 = require("@mazemasterjs/shared-library/Team");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const Cache_1 = require("./Cache");
const log = logger_1.Logger.getInstance();
const LAST_HIT_MODIFIER = 500;
class CacheItem {
    constructor(item, cacheType) {
        const now = Date.now();
        this.item = this.coerce(item, cacheType);
        this.hitCount = 0;
        this.createTime = now;
        this.lastHitTime = Math.floor(now / LAST_HIT_MODIFIER); // convert now to minutes
        this.cacheValue = 0;
    }
    get Item() {
        return this.item;
    }
    get HitCount() {
        return this.hitCount;
    }
    get LastHitTime() {
        return this.lastHitTime;
    }
    get CreateTime() {
        return this.createTime;
    }
    get SortKey() {
        return this.cacheValue;
    }
    /**
     * Adds to hit count and adjusts item's value in the cache based on
     * the last hit time and the total hit count.
     */
    addHit() {
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
    coerce(jsonObj, cacheType) {
        const method = `coerce(Object: ${jsonObj.id}, ${Cache_1.CACHE_TYPES[cacheType]})`;
        log.debug(__filename, method, `Attempting to load ${Cache_1.CACHE_TYPES[cacheType]} with JSON object.`);
        // if trace logging, we'll dump the actual JSON object too
        if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
            log.trace(__filename, method, JSON.stringify(jsonObj));
        }
        // when appropriate, try to instantiate specific class with the given data
        try {
            switch (cacheType) {
                case Cache_1.CACHE_TYPES.MAZE: {
                    return new MazeBase_1.MazeBase(jsonObj);
                }
                case Cache_1.CACHE_TYPES.TEAM: {
                    return new Team_1.Team(jsonObj);
                }
                case Cache_1.CACHE_TYPES.TROPHY: {
                    return new Trophy_1.Trophy(jsonObj);
                }
            }
        }
        catch (coerceError) {
            log.error(__filename, method, 'Coercion Error ->', coerceError);
            throw coerceError;
        }
        // if we get here with no errors, this dataType doesn't need to be coerced
        log.debug(__filename, method, `${Cache_1.CACHE_TYPES[cacheType]} does not need to be coerced, returning unaltered object.`);
        return jsonObj;
    }
}
exports.CacheItem = CacheItem;
exports.default = CacheItem;
//# sourceMappingURL=CacheItem.js.map