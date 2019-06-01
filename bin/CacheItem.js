"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
const MazeBase_1 = require("@mazemasterjs/shared-library/MazeBase");
const Team_1 = require("@mazemasterjs/shared-library/Team");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const log = logger_1.Logger.getInstance();
class CacheItem {
    constructor(item, itemType) {
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
    coerce(jsonObj, dataType) {
        const method = `coerce(Object: ${jsonObj.id}, ${dataType})`;
        log.debug(__filename, method, `Attempting to load ${dataType} with JSON object.`);
        // if trace logging, we'll dump the actual JSON object too
        if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
            log.trace(__filename, method, JSON.stringify(jsonObj));
        }
        // when appropriate, try to instantiate specific class with the given data
        try {
            switch (dataType) {
                case 'maze': {
                    return new MazeBase_1.MazeBase(jsonObj);
                }
                case 'team': {
                    return new Team_1.Team(jsonObj);
                }
                case 'trophy': {
                    return new Trophy_1.Trophy(jsonObj);
                }
            }
        }
        catch (coerceError) {
            log.error(__filename, method, 'Coercion Error ->', coerceError);
            throw coerceError;
        }
        // if we get here with no errors, this dataType doesn't need to be coerced
        log.debug(__filename, method, `${dataType} does not need to be coerced, returning unaltered object.`);
        return jsonObj;
    }
}
exports.CacheItem = CacheItem;
exports.default = CacheItem;
//# sourceMappingURL=CacheItem.js.map