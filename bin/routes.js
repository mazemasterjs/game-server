"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("./Config");
const logger_1 = require("@mazemasterjs/logger");
const Cache_1 = require("./Cache");
const Game_1 = require("@mazemasterjs/shared-library/Game");
const Player_1 = require("@mazemasterjs/shared-library/Player");
const fns = __importStar(require("./funcs"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Score_1 = __importDefault(require("@mazemasterjs/shared-library/Score"));
// set constant utility references
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
exports.createSinglePlayerGame = (req, res) => __awaiter(this, void 0, void 0, function* () {
    logRequest('createGame', req);
    const startTime = Date.now();
    const mazeId = req.params.mazeId;
    const teamId = req.params.teamId;
    const botId = req.params.botId;
    const method = `createSinglePlayerGame(${mazeId}, ${teamId}, ${botId})`;
    try {
        // get maze - bail on fail
        const maze = yield fns.getItem(Cache_1.CACHE_TYPES.MAZE, mazeId).catch(mazeErr => {
            log.warn(__filename, method, 'Unable to get maze');
            throw mazeErr;
        });
        // get team - bail on fail
        const team = yield fns.getItem(Cache_1.CACHE_TYPES.TEAM, teamId).catch(teamErr => {
            log.warn(__filename, method, 'Unable to get team');
            throw teamErr;
        });
        // verify bot - bail on fail
        if (!fns.findBot(team, botId)) {
            const botErr = new Error(`Bot (${botId}) not found in team (${teamId})`);
            log.warn(__filename, method, 'Unable to find bot in team.');
            throw botErr;
        }
        // so far so good!  Let's create the rest of the game objects...
        // Players always start sitting down in the maze's start cell
        const player = new Player_1.Player(maze.StartCell, Enums_1.PLAYER_STATES.SITTING);
        const game = new Game_1.Game(maze, player, new Score_1.default(), 1, botId, teamId);
        // set the game mode
        game.Mode = Enums_1.GAME_MODES.SINGLE_PLAYER;
        // put the game on the game cache
        Cache_1.Cache.use().storeItem(Cache_1.CACHE_TYPES.GAME, game);
        // return json containing status, message, gameId, and initial action
        // TODO: Add initial action!
        return res.status(200).json({ status: 200, message: 'Game Created', gameId: game.Id, execTime: Date.now() - startTime });
    }
    catch (err) {
        log.error(__filename, method, 'Game creation failed ->', err);
        res.status(400).json({ status: 400, message: 'Invalid Data Provided', error: err.message, execTime: Date.now() - startTime });
    }
});
exports.getGame = (req, res) => __awaiter(this, void 0, void 0, function* () {
    logRequest('getGames', req);
    const startTime = Date.now();
    return yield Cache_1.Cache.use()
        .fetchItem(Cache_1.CACHE_TYPES.GAME, req.params.gameId)
        .then(game => {
        return res.status(200).json({ status: 200, message: 'Game Located', gameId: game.Id, execTime: Date.now() - startTime });
    })
        .catch(fetchError => {
        res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message, execTime: Date.now() - startTime });
    });
});
exports.listGames = (req, res) => {
    logRequest('listGames', req);
    const games = Cache_1.Cache.use().fetchItems(Cache_1.CACHE_TYPES.GAME);
    if (games !== undefined) {
        return res.status(200).json(games);
    }
    else {
        return res.status(500).json({ status: '500', message: 'Server Error', error: 'Unable to retrieve list of games.' });
    }
};
exports.countGames = (req, res) => {
    logRequest('countGames', req);
    return res.status(200).json({ count: Cache_1.Cache.use().countItems(Cache_1.CACHE_TYPES.GAME) });
};
exports.dumpCache = (req, res) => {
    logRequest('dumpCache - MAZE', req);
    Cache_1.Cache.use().dumpCache(Cache_1.CACHE_TYPES.MAZE);
    logRequest('dumpCache - GAME', req);
    Cache_1.Cache.use().dumpCache(Cache_1.CACHE_TYPES.GAME);
    return res.status(200).json({ status: 200, message: 'OK' });
};
/**
 * Liveness and Readiness probe for K8s/OpenShift.
 * A response indicates service alive/ready.
 */
exports.livenessProbe = (req, res) => {
    logRequest('livenessProbe', req, true);
    res.status(200).json({ probeType: 'liveness', status: 'alive' });
};
exports.readinessProbe = (req, res) => {
    logRequest('readinessProbe', req, true);
    res.status(200).json({ probeType: 'readiness', status: 'ready' });
};
// Quick little log wrapper short-circuit called into logger when debug/trace is not enabled
function logRequest(fnName, req, trace) {
    // bail out if we aren't at least at debug level
    if (log.LogLevel < logger_1.LOG_LEVELS.DEBUG) {
        return;
    }
    // otherwise check log as trace or debug
    if (trace && log.LogLevel >= logger_1.LOG_LEVELS.TRACE) {
        log.trace(__filename, req.path, 'Handling request -> ' + req.url);
    }
    else {
        log.debug(__filename, req.path, 'Handling request -> ' + req.url);
    }
}
//# sourceMappingURL=routes.js.map