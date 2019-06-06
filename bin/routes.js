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
const fns = __importStar(require("./funcs"));
const logger_1 = require("@mazemasterjs/logger");
const Cache_1 = require("./Cache");
const Game_1 = require("@mazemasterjs/shared-library/Game");
const Player_1 = require("@mazemasterjs/shared-library/Player");
const Config_1 = require("./Config");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Score_1 = __importDefault(require("@mazemasterjs/shared-library/Score"));
require("./controllers/actLook");
const actLook_1 = require("./controllers/actLook");
// set constant utility references
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
/**
 * Creates a new, single-player game.
 *
 * @param req
 * @param res
 */
exports.createGame = (req, res) => __awaiter(this, void 0, void 0, function* () {
    logRequest('createGame', req);
    const mazeId = req.params.mazeId;
    const teamId = req.params.teamId;
    const botId = req.params.botId === undefined ? '' : req.params.botId;
    const method = `createGame(${mazeId}, ${teamId}, ${botId})`;
    try {
        // get maze - bail on fail
        const maze = yield Cache_1.Cache.use()
            .fetchOrGetItem(Cache_1.CACHE_TYPES.MAZE, mazeId)
            .catch(mazeErr => {
            log.warn(__filename, method, 'Unable to get maze');
            throw mazeErr;
        });
        // get team - bail on fail
        const team = yield Cache_1.Cache.use()
            .fetchOrGetItem(Cache_1.CACHE_TYPES.TEAM, teamId)
            .catch(teamErr => {
            log.warn(__filename, method, 'Unable to get team');
            throw teamErr;
        });
        // if a bot is given, verify it - bail on fail
        if (botId !== '' && !fns.findBot(team, botId)) {
            const botErr = new Error(`Bot (${botId}) not found in team (${teamId})`);
            log.warn(__filename, method, 'Unable to find bot in team.');
            throw botErr;
        }
        // now check to see if an active game already exists in memory for this team or team/bot
        const activeGameId = fns.findGame(teamId, botId);
        if (activeGameId !== '') {
            return res.status(400).json({ status: 400, message: 'Invalid Request - An active game for team/bot already exists.', gameId: activeGameId });
        }
        // so far so good!  Let's create the rest of the game objects...
        // Players always start sitting down in the maze's start cell
        const player = new Player_1.Player(maze.StartCell, Enums_1.PLAYER_STATES.SITTING);
        // break this down into two steps so we can better tell where any errors come from
        let game = new Game_1.Game(maze, player, new Score_1.default(), 1, teamId, botId);
        game = Cache_1.Cache.use().storeItem(Cache_1.CACHE_TYPES.GAME, game).Item;
        // Return json containing status, message, gameId, and initial action
        // TODO: Add initial action!
        return res.status(200).json({ status: 200, message: 'Game Created', gameId: game.Id, getUrl: `${config.EXT_URL_GAME}/get/${game.Id}` });
    }
    catch (err) {
        log.error(__filename, method, 'Game creation failed ->', err);
        res.status(400).json({ status: 500, message: 'Game Creation Error', error: err.message });
    }
});
/**
 * Returns game data for the requested Game.Id
 */
exports.getGame = (req, res) => {
    logRequest('getGames', req);
    return Cache_1.Cache.use()
        .fetchItem(Cache_1.CACHE_TYPES.GAME, req.params.gameId)
        .then(game => {
        return res.status(200).json(game.getStub(config.EXT_URL_GAME));
    })
        .catch(fetchError => {
        res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
};
/**
 * Returns a list of stubbed game data for all games currently
 * held in memory.
 */
exports.listGames = (req, res) => {
    logRequest('listGames', req);
    try {
        return res.status(200).json(fns.getGameStubs());
    }
    catch (gameStubsError) {
        return res.status(500).json({ status: '500', message: 'Server Error', error: gameStubsError.message });
    }
};
exports.countGames = (req, res) => {
    logRequest('countGames', req);
    return res.status(200).json({ count: Cache_1.Cache.use().countItems(Cache_1.CACHE_TYPES.GAME) });
};
exports.processAction = (req, res) => {
    logRequest('getGames', req);
    let game;
    return Cache_1.Cache.use()
        .fetchItem(Cache_1.CACHE_TYPES.GAME, req.body.gameId)
        .then(cachedGame => {
        game = cachedGame;
        if (game.State >= Enums_1.GAME_STATES.FINISHED) {
            log.warn(__filename, req.path, `Action sent to ${Enums_1.GAME_STATES[game.State]} gameId ${game.Id}.`);
            return res.status(400).json({ status: 400, message: 'Game Over', gameState: Enums_1.GAME_STATES[game.State] });
        }
        else {
            const action = fns.createIAction(req.body, game);
            game.State = Enums_1.GAME_STATES.IN_PROGRESS;
            game.addAction(action);
            switch (action.action.toUpperCase()) {
                case 'LOOK': {
                    // const err = new Error('The "LOOK" action has not been implemented yet.');
                    // log.error(__filename, req.path, 'Not Implemented', err);
                    // return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                    const outcome = actLook_1.doLook(game);
                    return res.status(200).json({ outcome });
                }
                case 'MOVE': {
                    const err = new Error('The "MOVE" action has not been implemented yet.');
                    log.error(__filename, req.path, 'Not Implemented', err);
                    return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                }
                case 'JUMP': {
                    const err = new Error('The "JUMP" action has not been implemented yet.');
                    log.error(__filename, req.path, 'Not Implemented', err);
                    return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                }
                case 'STAND': {
                    const err = new Error('The "STAND" action has not been implemented yet.');
                    log.error(__filename, req.path, 'Not Implemented', err);
                    return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                }
                case 'WRITE': {
                    const err = new Error('The "WRITE" action has not been implemented yet.');
                    log.error(__filename, req.path, 'Not Implemented', err);
                    return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                }
                default: {
                    const err = new Error('Invalid Action: ' + action.action.toUpperCase());
                    log.error(__filename, req.path, 'Not Implemented', err);
                    return res.status(500).json({ status: 500, message: 'Action Not Implemented', error: err.message });
                }
            }
        }
        //      return res.status(200).json(game.getStub(config.EXT_URL_GAME));
    })
        .catch(fetchError => {
        res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
    // {
    //     "gameId":"c440d650-733e-4db9-9814-59061b737df7",
    //     "action":"look",
    //     "direction":"north",
    //     "message":"test",
    //     "cohesionScores":[1,0.5,1,0.5,null,null]
    //  }
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
        log.trace(__filename, req.method, 'Handling request -> ' + req.url);
    }
    else {
        log.debug(__filename, req.method, 'Handling request -> ' + req.url);
    }
}
//# sourceMappingURL=routes.js.map