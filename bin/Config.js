"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const log = logger_1.default.getInstance();
class Config {
    // singleton pattern - constructor is private, use static Config.getInstance()
    constructor() {
        /**
         * Gets and returns the value of the requested environment variable
         * as the given type.
         *
         * @param varName - the name of the environment variable to get
         * @param typeName - tye name of the type to return the value as (string | number)
         */
        this.getVar = (varName, typeName) => {
            const val = process.env[varName];
            // first see if the variable was found - if not, let's blow this sucker up
            if (val === undefined) {
                this.doError(`getVar(${varName}, ${typeName})`, 'Configuration Error', `Environment variable not set: ${varName}`);
            }
            // we have a value - log the good news
            log.info(__filename, `getVar(${varName}, ${typeName})`, `${varName}=${val}`);
            // convert to expect type and return
            switch (typeName) {
                case 'string': {
                    return val;
                }
                case 'number': {
                    return parseInt(val + '', 10); // this could blow up, but that's ok since we'd want it to
                }
                default: {
                    // we only want numbers or strings...
                    this.doError(`getVar(${varName}, ${typeName})`, 'Argument Error', `Invalid variable type name: ${typeName}. Try 'string' or 'number' instead.`);
                }
            }
        };
        this.LOG_LEVEL = this.getVar('LOG_LEVEL', 'number');
        log.LogLevel = this.LOG_LEVEL;
        this.BASE_URL_GAME = this.getVar('BASE_URL_GAME', 'string');
        this.EXT_URL_GAME = this.getVar('EXT_URL_GAME', 'string');
        this.HTTP_PORT_GAME = this.getVar('HTTP_PORT_GAME', 'number');
        this.CACHE_SIZE_MAZES = this.getVar('CACHE_SIZE_MAZES', 'number');
        this.CACHE_SIZE_GAMES = this.getVar('CACHE_SIZE_GAMES', 'number');
        this.CACHE_SIZE_SCORES = this.getVar('CACHE_SIZE_SCORES', 'number');
        this.CACHE_SIZE_TEAMS = this.getVar('CACHE_SIZE_TEAMS', 'number');
        this.CACHE_SIZE_TROPHIES = this.getVar('CACHE_SIZE_TROPHIES', 'number');
        this.SERVICE_MAZE = this.getVar('SERVICE_MAZE', 'string');
        this.SERVICE_SCORE = this.getVar('SERVICE_SCORE', 'string');
        this.SERVICE_TEAM = this.getVar('SERVICE_TEAM', 'string');
        this.SERVICE_TROPHY = this.getVar('SERVICE_TROPHY', 'string');
    }
    /**
     * Instantiate and/or returns class instance
     */
    static getInstance() {
        if (this.instance === undefined) {
            this.instance = new Config();
        }
        return this.instance;
    }
    /**
     * Wrapping log.error to clean things up a little
     *
     * @param method
     * @param title
     * @param message
     */
    doError(method, title, message) {
        const err = new Error(message);
        log.error(__filename, method, title + ' ->', err);
        throw err;
    }
}
exports.Config = Config;
exports.default = Config;
//# sourceMappingURL=Config.js.map