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
Object.defineProperty(exports, "__esModule", { value: true });
const fns = __importStar(require("./funcs"));
const Action_1 = require("@mazemasterjs/shared-library/Action");
const actStand_1 = require("./controllers/actStand");
const actLook_1 = require("./controllers/actLook");
const actMove_1 = require("./controllers/actMove");
const lang = __importStar(require("./lang/langIndex"));
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Config_1 = require("./Config");
const Game_1 = require("@mazemasterjs/shared-library/Game");
const logger_1 = require("@mazemasterjs/logger");
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
    // make sure that the request body has the minimum parameters defined
    if (!req.params.mazeId || !req.params.teamId) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid Request',
            error: 'Request body must include the following elements: { mazeId:<string>, teamId: <string> }',
        });
    }
    // set some vars from req parameters
    const mazeId = req.params.mazeId;
    const teamId = req.params.teamId;
    const botId = req.params.botId;
    const forceId = req.query.forceId;
    const method = `createGame(${mazeId}, ${teamId}, ${botId})`;
    // get maze - bail on fail
    return yield Cache_1.Cache.use()
        .fetchOrGetItem(Cache_1.CACHE_TYPES.MAZE, mazeId)
        .then(maze => {
        Cache_1.Cache.use()
            .fetchOrGetItem(Cache_1.CACHE_TYPES.TEAM, teamId)
            .then(team => {
            // if there's a bot id, it must be in the team
            if (botId && !fns.findBot(team, botId)) {
                const botErr = new Error(`Bot not found in team`);
                log.warn(__filename, method, 'Unable to get Bot');
                return res.status(404).json({ status: 404, message: 'Invalid Request - Bot not found.', error: botErr.message });
            }
            else {
                // now check to see if an active game already exists in memory for this team or team/bot
                const activeGameId = fns.findGame(teamId, botId);
                if (activeGameId !== '') {
                    const gameType = botId ? 'SINGLE_PLAYER (bot)' : 'MULTIPLAYER (team)';
                    return res
                        .status(400)
                        .json({ status: 400, message: 'Invalid Request - An active ' + gameType + ' game already exists.', gameId: activeGameId, teamId, botId });
                }
                else {
                    // break this down into two steps so we can better tell where any errors come from
                    const game = new Game_1.Game(maze, teamId, botId);
                    // add a visit to the start cell of the maze since the player just walked in
                    game.Maze.Cells[game.Maze.StartCell.row][game.Maze.StartCell.col].addVisit(0);
                    // force-set the gameId if the query parameter was set
                    if (forceId) {
                        game.forceSetId(forceId);
                    }
                    // store the game on the cache
                    Cache_1.Cache.use().storeItem(Cache_1.CACHE_TYPES.GAME, game);
                    // return json game stub: game.Id, getUrl: `${config.EXT_URL_GAME}/get/${game.Id}
                    return res.status(200).json({ status: 200, message: 'Game Created', game: game.getStub(`${config.EXT_URL_GAME}/get/`) });
                }
            }
        })
            .catch(teamErr => {
            log.warn(__filename, method, 'Unable to get Team');
            return res.status(404).json({ status: 404, message: 'Invalid Request - Team not found.', error: teamErr.message });
        });
    })
        .catch(mazeErr => {
        log.warn(__filename, method, 'Unable to get Maze');
        return res.status(404).json({ status: 404, message: 'Invalid Request - Maze not found.', error: mazeErr.message });
    });
});
/**
 * Returns abandons a game currently in memory
 */
exports.abandonGame = (req, res) => __awaiter(this, void 0, void 0, function* () {
    logRequest('abandonGame', req);
    const gameId = req.params.gameId + '';
    const method = `abandonGame/${gameId}`;
    yield Cache_1.Cache.use()
        .fetchItem(Cache_1.CACHE_TYPES.GAME, gameId)
        .then(game => {
        if (game.State >= Enums_1.GAME_STATES.FINISHED) {
            const msg = `game.State is ${Enums_1.GAME_STATES[game.State]} - cannot abort completed games.`;
            fns.logDebug(__filename, method, msg);
            return res.status(404).json({ status: 400, message: 'Game Abort Error', error: msg });
        }
        // Force-set gameId's starting with the word 'FORCED' will be renamed
        // so the original IDs can be re-used - very handy for testing and development
        if (game.Id.startsWith('FORCED')) {
            game.forceSetId(`${game.Id}__${Date.now()}`);
        }
        // go ahead and abandon the game
        log.warn(__filename, 'abandonGame', `${game.Id} forcibly abandoned by request from ${req.ip}`);
        return res.status(200).json(game.getStub(config.EXT_URL_GAME + '/get/'));
    })
        .catch(fetchError => {
        res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
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
/**
 * Returns a quick count of the games cache
 *
 * @param req
 * @param res
 */
exports.countGames = (req, res) => {
    logRequest('countGames', req);
    return res.status(200).json({ count: Cache_1.Cache.use().countItems(Cache_1.CACHE_TYPES.GAME) });
};
/**
 * Process an incoming game action request
 *
 * @param req
 * @param res
 */
exports.processAction = (req, res) => __awaiter(this, void 0, void 0, function* () {
    logRequest('processAction', req);
    let game;
    //Gets the language header, and grabs the json with the appropriate language
    let languageHeader = req.header('accept-language') + "";
    log.force(__filename, 'Acquiring users language from the header: ', languageHeader);
    let userLanguage = languageHeader.substring(0, 2);
    log.force(__filename, 'User lanugage detected: ', userLanguage);
    var languageType;
    //Enfure that userLanugage is a supported language first
    switch (userLanguage) {
        case "es": {
            languageType = lang.Es.getInstance();
            log.force(__filename, "processAction(): ", "Detected Spanish as language, using es.ts for message strings");
            break;
        }
        default: {
            languageType = lang.En.getInstance();
            log.force(__filename, "processAction(): ", "Defaulting to english, using en.ts for message strings");
            break;
        }
    }
    // make sure that the request body has the minimum parameters defined
    if (!req.body.command || !req.body.direction || !req.body.gameId) {
        return res.status(400).json({
            status: 400,
            message: 'Invalid Request',
            error: 'Request body must include the following elements: { gameId:<string>, command: <string>, direction: <string> }',
        });
    }
    // assign some reference vars from req.body (validate cmd and dir)
    const gameId = req.body.gameId;
    const cmd = fns.getCmdByName(req.body.command);
    const dir = fns.getDirByName(req.body.direction);
    const msg = req.body.message + '';
    // first attempt to get the game by the given Id - fetchItem will throw an
    // error if the game is not found and we'll respond accordingly
    game = yield Cache_1.Cache.use()
        .fetchItem(Cache_1.CACHE_TYPES.GAME, gameId)
        .then(fetchedGame => {
        return fetchedGame;
    })
        .catch(fetchError => {
        return res.status(404).json({ status: 404, message: 'Game Not Found', error: fetchError.message });
    });
    // got a game - make sure it's not in an end-state: FINISHED, ABANDONDED, or ERROR
    if (game.State >= Enums_1.GAME_STATES.FINISHED) {
        log.warn(__filename, req.path, `Action sent to ${Enums_1.GAME_STATES[game.State]} game.`);
        return res.status(400).json({ status: 400, message: 'Game Over', gameState: Enums_1.GAME_STATES[game.State] });
    }
    // the game is still active, so create and configure an Action item
    const action = new Action_1.Action(cmd, dir, msg);
    // add the new action to the game
    game.addAction(action);
    // make sure the game
    game.State = Enums_1.GAME_STATES.IN_PROGRESS;
    switch (action.command) {
        case Enums_1.COMMANDS.LOOK: {
            return res.status(200).json(yield actLook_1.doLook(game, languageType));
        }
        case Enums_1.COMMANDS.MOVE: {
            return yield res.status(200).json(yield actMove_1.doMove(game, languageType));
        }
        case Enums_1.COMMANDS.STAND: {
            return res.status(200).json(yield actStand_1.doStand(game, languageType));
        }
        case Enums_1.COMMANDS.JUMP:
        case Enums_1.COMMANDS.SIT:
        case Enums_1.COMMANDS.WRITE:
        default: {
            const err = new Error(`${Enums_1.COMMANDS[action.command]} is not recognized. Valid commands are LOOK, MOVE, JUMP, SIT, STAND, and WRITE.`);
            log.error(__filename, req.path, 'Unrecognized Command', err);
            return res.status(500).json({ status: 400, message: 'Unrecognized Command', error: err.message });
        }
    }
});
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