"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("./funcs");
const MazeBase_1 = require("@mazemasterjs/shared-library/MazeBase");
const Team_1 = require("@mazemasterjs/shared-library/Team");
const Trophy_1 = require("@mazemasterjs/shared-library/Trophy");
const axios_1 = __importDefault(require("axios"));
const GameConfig_1 = __importDefault(require("./GameConfig"));
const logger_1 = __importStar(require("@mazemasterjs/logger"));
// useful constants
const config = GameConfig_1.default.getInstance();
const log = logger_1.default.getInstance();
class Cache {
    // private constructor
    constructor() {
        // initialize cache arrays
        this.maze = new Array();
        this.team = new Array();
        this.score = new Array();
        this.game = new Array();
        this.trophy = new Array();
        this.loadCache(config.SERVICE_MAZE + '/get', 'maze')
            .then(count => {
            log.debug(__filename, 'constructor()', `${count} mazes cached.`);
        })
            .catch(error => {
            log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
        });
    }
    // TODO: Need promise/callback to set ready state while caches are loading!!
    // intialization of singleton
    static getInstance() {
        if (this.instance === undefined) {
            this.instance = new Cache();
        }
        else {
            return this.instance;
        }
    }
    loadCache(url, arrayName) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `loadCache(${funcs_1.trimUrl(url)}, ${arrayName})`;
            // set a reference to the actuall array we're filling
            const array = this.getArrayByName(arrayName);
            // we'll use this to capture errors from arrow functions
            let error;
            // get the data we need to cache from the service passed via the url parameter
            const data = yield this.doGet(url).catch(getDataError => {
                log.error(__filename, method, 'Error requesting data ->', getDataError);
                error = getDataError;
            });
            // check for
            if (error !== undefined) {
                return Promise.reject(error);
            }
            // iterate through the elements in the returned json data array
            for (const ele of data) {
                let cacheable;
                // api/maze/get only returns stubs, so we have to make a second request
                // to get the full maze data that we need for the cache
                if (arrayName === 'maze') {
                    cacheable = yield this.doGet(url + `?id=${ele.id}`);
                }
                try {
                    array.push(this.coerceData(cacheable[0], arrayName));
                }
                catch (coerceError) {
                    log.warn(__filename, method, `Unable to coerce {${arrayName}.id:${ele.id}} into ${arrayName} class, skipping element.`);
                }
            }
            return Promise.resolve(array.length);
        });
    }
    /**
     * Attempts to load raw JSON data into a specific class according to the given data type name
     *
     * @param data
     * @param dataType
     */
    coerceData(data, dataType) {
        log.debug(__filename, `coerceData([json data], ${dataType})`, 'Attempting to coerce JSON data into ' + dataType);
        if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
            log.trace(__filename, `coerceData([json data], ${dataType})`, JSON.stringify(data));
        }
        switch (dataType) {
            case 'maze': {
                return new MazeBase_1.MazeBase(data);
            }
            case 'team': {
                return new Team_1.Team(data);
            }
            case 'trophy': {
                return new Trophy_1.Trophy(data);
            }
        }
    }
    /**
     * Returns the requested array
     *
     * @param arrayName
     */
    getArrayByName(arrayName) {
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
    }
    /**
     * Returns data from the requested URL
     *
     * @param url string - Service API to request data from
     */
    doGet(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const method = `doGet(${funcs_1.trimUrl(url)})`;
            log.debug(__filename, method, `Requesting ${url}`);
            return yield axios_1.default
                .get(url)
                .then(res => {
                log.debug(__filename, method, funcs_1.genResMsg(url, res));
                if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                    log.trace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
                }
                return Promise.resolve(res.data);
            })
                .catch(axiosErr => {
                log.error(__filename, method, 'Error retrieving data ->', axiosErr);
                return Promise.reject(axiosErr);
            });
        });
    }
}
exports.Cache = Cache;
exports.default = Cache;
//# sourceMappingURL=Cache.js.map