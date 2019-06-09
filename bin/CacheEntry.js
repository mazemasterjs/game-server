"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
const MazeBase_1 = require("@mazemasterjs/shared-library/MazeBase");
const Team_1 = require("@mazemasterjs/shared-library/Team");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const Cache_1 = require("./Cache");
const log = logger_1.Logger.getInstance();
const LAST_HIT_MODIFIER = 500;
class CacheEntry {
    constructor(cacheType, item) {
        const now = Date.now();
        this.item = this.coerce(cacheType, item);
        this.hitCount = 0;
        this.createTime = now;
        this.lastHitTime = Math.floor(now / LAST_HIT_MODIFIER); // convert now to minutes
        this.cacheValue = 0;
        logTrace(`constructor(${Cache_1.CACHE_TYPES[cacheType]}, ${item.id})`, 'CacheEntry instantiated.');
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
     * @param object
     * @param cacheType
     */
    coerce(cacheType, object) {
        const method = `coerce(${object}, ${Cache_1.CACHE_TYPES[cacheType]})`;
        logTrace(method, `Attempting coercion. ${object.id}`);
        // if trace logging, we'll dump the actual JSON object too
        if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
            logTrace(method, JSON.stringify(object).substr(0, 100));
        }
        // when appropriate, try to instantiate specific class with the given data
        try {
            switch (cacheType) {
                case Cache_1.CACHE_TYPES.MAZE: {
                    logTrace(method, `MazeBase coercion complete.`);
                    return new MazeBase_1.MazeBase(object);
                }
                case Cache_1.CACHE_TYPES.TEAM: {
                    logTrace(method, `Team coercion complete.`);
                    return new Team_1.Team(object);
                }
                case Cache_1.CACHE_TYPES.TROPHY: {
                    logTrace(method, `Trophy coercion complete.`);
                    return new Trophy_1.Trophy(object);
                }
            }
        }
        catch (coerceError) {
            log.error(__filename, method, 'Coercion Error ->', coerceError);
            throw coerceError;
        }
        // if we get here with no errors, this dataType doesn't need to be coerced
        logTrace(method, `Coercion not required.`);
        return object;
    }
}
exports.CacheEntry = CacheEntry;
function logTrace(method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.DEBUG) {
        log.trace(__filename, method, msg);
    }
}
exports.default = CacheEntry;
//# sourceMappingURL=CacheEntry.js.map