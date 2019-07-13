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
Object.defineProperty(exports, "__esModule", { value: true });
const actTaste_1 = require("./controllers/actTaste");
const actSmell_1 = require("./controllers/actSmell");
const Cache_1 = require("./Cache");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Config_1 = require("./Config");
const actFeel_1 = require("./controllers/actFeel");
const actListen_1 = require("./controllers/actListen");
const actLook_1 = require("./controllers/actLook");
const GameLang_1 = __importDefault(require("./GameLang"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@mazemasterjs/logger");
const MazeLoc_1 = require("@mazemasterjs/shared-library/MazeLoc");
const actMove_1 = require("./controllers/actMove");
const util_1 = require("util");
const Monster_1 = __importDefault(require("@mazemasterjs/shared-library/Monster"));
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
// tslint:disable-next-line: no-string-literal
axios_1.default.defaults.headers.common['Authorization'] = 'Basic ' + config.PRIMARY_SERVICE_ACCOUNT;
/**
 * Builds a standard response status message for logging
 *
 * @param url
 * @param res
 */
function genResMsg(url, res) {
    return `RESPONSE: status=${res.status}, statusText=${res.statusText}, elementCount=${res.data.length}, url=${url}`;
}
exports.genResMsg = genResMsg;
/**
 * Returns IGameStub versions of all games in the cache
 */
function getGameStubs() {
    logTrace(__filename, 'getGameStubs()', 'Building array of game stubs.');
    const games = Cache_1.Cache.use().fetchItems(Cache_1.CACHE_TYPES.GAME);
    const stubs = new Array();
    for (const game of games) {
        stubs.push(game.getStub(config.EXT_URL_GAME));
    }
    logDebug(__filename, 'getGameStubs()', `Returning array with ${stubs.length} IGameStub items.`);
    return stubs;
}
exports.getGameStubs = getGameStubs;
/**
 * Returns just the service URL path
 */
function trimUrl(url) {
    const pos = url.indexOf('/api');
    return pos > 0 ? url.substr(pos) : '/';
}
exports.trimUrl = trimUrl;
/**
 * Returns the service url that backs the given cache type
 *
 * @param cacheType
 */
function getSvcUrl(cacheType) {
    switch (cacheType) {
        case Cache_1.CACHE_TYPES.MAZE: {
            return config.SERVICE_MAZE;
        }
        case Cache_1.CACHE_TYPES.TEAM: {
            return config.SERVICE_TEAM;
        }
        case Cache_1.CACHE_TYPES.SCORE: {
            return config.SERVICE_SCORE;
        }
        case Cache_1.CACHE_TYPES.TROPHY: {
            return config.SERVICE_TROPHY;
        }
    }
}
exports.getSvcUrl = getSvcUrl;
/**
 * Returns the gameId of an active game, if found.  Otherwise returns '';
 *
 * @param teamId
 * @param botId
 */
function findGame(teamId, botId) {
    const method = `findGame(${teamId}, ${botId})`;
    botId = undefined ? '' : botId;
    let cacheEntry;
    logDebug(__filename, method, `Searching for active ${botId === '' ? 'TEAM' : 'BOT'} game.`);
    cacheEntry = Cache_1.Cache.use()
        .getCache(Cache_1.CACHE_TYPES.GAME)
        .find(ce => {
        const game = ce.Item;
        if (game.State === Enums_1.GAME_STATES.NEW || game.State === Enums_1.GAME_STATES.IN_PROGRESS) {
            return game.TeamId === teamId && game.BotId === botId;
        }
        else {
            return false;
        }
    });
    if (cacheEntry !== undefined) {
        logDebug(__filename, method, 'Active game found.');
        return cacheEntry.Item.Id;
    }
    else {
        logDebug(__filename, method, 'No active games found.');
        return '';
    }
}
exports.findGame = findGame;
/**
 * Returns true if the given botId exists in the given Team
 *
 * @param team
 * @param botId
 */
function findBot(team, botId) {
    const botIdx = team.Bots.findIndex(bot => {
        return bot.Id === botId;
    });
    return botIdx > -1;
}
exports.findBot = findBot;
/**
 * Returns data from the requested URL
 *
 * @param url string - Service API to request data from
 */
function doGet(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doGet(${trimUrl(url)})`;
        logTrace(__filename, method, `Requesting ${url}`);
        return yield axios_1.default
            .get(url)
            .then(res => {
            logDebug(__filename, method, genResMsg(url, res));
            if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                logDebug(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
            }
            return Promise.resolve(res.data);
        })
            .catch(axiosErr => {
            log.error(__filename, method, 'Error retrieving data ->', axiosErr);
            return Promise.reject(axiosErr);
        });
    });
}
exports.doGet = doGet;
/**
 * Puts given data to the given URL
 *
 * @param url
 * @param data
 */
function doPut(url, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doPut(${trimUrl(url)})`;
        logTrace(__filename, method, `Requesting ${url}`);
        return yield axios_1.default
            .put(url, data)
            .then(res => {
            logDebug(__filename, method, genResMsg(url, res));
            if (log.LogLevel === logger_1.LOG_LEVELS.TRACE) {
                logTrace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
            }
            return Promise.resolve(res.data);
        })
            .catch(axiosErr => {
            log.error(__filename, method, 'Error sending data ->', axiosErr);
            return Promise.reject(axiosErr);
        });
    });
}
exports.doPut = doPut;
/**
 * Clean up and standardize input, then attempt to map against available directions
 * to return the DIRS enum value of the given direction
 *
 * @param dirName
 */
function getDirByName(dirName) {
    switch (dirName.toUpperCase().trim()) {
        case 'NORTH': {
            return Enums_1.DIRS.NORTH;
        }
        case 'SOUTH': {
            return Enums_1.DIRS.SOUTH;
        }
        case 'EAST': {
            return Enums_1.DIRS.EAST;
        }
        case 'WEST': {
            return Enums_1.DIRS.WEST;
        }
        case 'NONE': {
            return Enums_1.DIRS.NONE;
        }
        case 'LEFT': {
            return Enums_1.DIRS.LEFT;
        }
        case 'RIGHT': {
            return Enums_1.DIRS.RIGHT;
        }
        default:
            log.warn(__filename, `getDirByName(${dirName})`, 'Invalid direction received, returning DIRS.NONE.');
            return Enums_1.DIRS.NONE;
    }
}
exports.getDirByName = getDirByName;
/**
 * Clean up and standardize input, then attempt to map against available commands
 * to return the correct COMMANDS enum value
 *
 * @param dirName
 */
function getCmdByName(cmdName) {
    switch (cmdName.toUpperCase().trim()) {
        case 'LOOK': {
            return Enums_1.COMMANDS.LOOK;
        }
        case 'JUMP': {
            return Enums_1.COMMANDS.JUMP;
        }
        case 'MOVE': {
            return Enums_1.COMMANDS.MOVE;
        }
        case 'SIT': {
            return Enums_1.COMMANDS.SIT;
        }
        case 'STAND': {
            return Enums_1.COMMANDS.STAND;
        }
        case 'TURN': {
            return Enums_1.COMMANDS.TURN;
        }
        case 'WRITE': {
            return Enums_1.COMMANDS.WRITE;
        }
        case 'QUIT': {
            return Enums_1.COMMANDS.QUIT;
        }
        case 'NONE': {
            return Enums_1.COMMANDS.NONE;
        }
        default:
            log.warn(__filename, `getCmdByName(${cmdName})`, 'Invalid command received, returning COMMANDS.NONE.');
            return Enums_1.COMMANDS.NONE;
    }
}
exports.getCmdByName = getCmdByName;
/**
 * Handles updating the player's location, associated maze cell visit/backtrack
 * counters.  MoveCount / action.MoveCount are handled in finalizeAction.
 *
 * @param game: Game - the current game
 * @param action: IAction - the pre-validated IAction behind this move
 */
function movePlayer(game, lang, printOutcome = true) {
    const act = game.Actions[game.Actions.length - 1];
    const data = GameLang_1.default.getInstance(lang);
    // reposition the player - all move validation is preformed prior to this call
    switch (act.direction) {
        case Enums_1.DIRS.NORTH: {
            game.Player.Location.row--;
            if (printOutcome) {
                act.outcomes.push(data.outcomes.move.north);
            }
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            game.Player.Location.row++;
            if (printOutcome) {
                act.outcomes.push(data.outcomes.move.south);
            }
            break;
        }
        case Enums_1.DIRS.EAST: {
            game.Player.Location.col++;
            if (printOutcome) {
                act.outcomes.push(data.outcomes.move.east);
            }
            break;
        }
        case Enums_1.DIRS.WEST: {
            game.Player.Location.col--;
            if (printOutcome) {
                act.outcomes.push(data.outcomes.move.west);
            }
            break;
        }
    } // end switch(act.direction)
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    // until blindness or something is added, always see exits
    // commented for testing purposes
    // check for backtracking
    if (game.Maze.Cells[game.Player.Location.row][game.Player.Location.col].VisitCount > 0) {
        game.Score.addBacktrack();
    }
    // and update the cell visit count
    cell.addVisit(game.Score.MoveCount);
    // send the updated game back
    return game;
}
exports.movePlayer = movePlayer;
function movePlayerAbsolute(game, lang, x, y) {
    const cell = game.Maze.Cells[y][x];
    cell.addVisit(game.Score.MoveCount);
    game.Player.Location = new MazeLoc_1.MazeLoc(y, x);
    // send the updated game back
    return game;
}
exports.movePlayerAbsolute = movePlayerAbsolute;
/**
 * Adds the requested trophy and related bonusPoints to the given
 * game.Score object.
 *
 * @param game
 * @param trophyId
 * @returns Promise<Game>
 */
function grantTrophy(game, trophyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `grantTrophy(${game.Id}, ${Enums_1.TROPHY_IDS[trophyId]})`;
        yield Cache_1.Cache.use()
            .fetchOrGetItem(Cache_1.CACHE_TYPES.TROPHY, Enums_1.TROPHY_IDS[trophyId])
            .then(item => {
            const trophy = item;
            // TODO: Add a getStub() function to Trophy
            // add trophy stub data to the action so we can track ongoing score during playback
            game.Actions[game.Actions.length - 1].trophies.push({ id: trophy.Id, count: 1 });
            game.Actions[game.Actions.length - 1].score += trophy.BonusAward;
            // add the trophy and points to the game's score, too (obviously)
            game.Score.addTrophy(trophyId);
            game.Score.addBonusPoints(trophy.BonusAward);
            logDebug(__filename, method, 'Trophy added.');
        })
            .catch(fetchError => {
            game.Actions[game.Actions.length - 1].outcomes.push('Error adding add trophy ' + Enums_1.TROPHY_IDS[trophyId] + ' -> ' + fetchError.message);
            logWarn(__filename, method, 'Unable to fetch trophy: ' + Enums_1.TROPHY_IDS[trophyId] + '. Error -> ' + fetchError.message);
        });
        return Promise.resolve(game);
    });
}
exports.grantTrophy = grantTrophy;
/**
 * Appeneds game summary as outcome strings on given action using values
 * from the given score
 *
 * @param action
 * @param score
 */
function summarizeGame(action, score) {
    action.outcomes.push(`Game Result: ${Enums_1.GAME_RESULTS[score.GameResult]}`);
    action.outcomes.push(`Moves: ${score.MoveCount}`);
    action.outcomes.push(`Backtracks: ${score.BacktrackCount}`);
    action.outcomes.push(`Bonus Points: ${score.BonusPoints}`);
    action.outcomes.push(`Trophies: ${score.Trophies.length}`);
    action.outcomes.push(`Total Score: ${score.getTotalScore()}`);
}
exports.summarizeGame = summarizeGame;
/**
 * Simple trace wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logTrace(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.TRACE) {
        log.trace(file, method, msg);
    }
}
exports.logTrace = logTrace;
/**
 * Simple debug wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logDebug(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.DEBUG) {
        log.debug(file, method, msg);
    }
}
exports.logDebug = logDebug;
/**
 * Simple warn wrapper to reduce the number of useless module calls
 * @param file
 * @param method
 * @param msg
 */
function logWarn(file, method, msg) {
    if (log.LogLevel >= logger_1.LOG_LEVELS.WARN) {
        log.warn(file, method, msg);
    }
}
exports.logWarn = logWarn;
/**
 * Simple error wrapper - really just here for consistency
 * @param file
 * @param method
 * @param msg
 */
function logError(file, method, msg, error) {
    log.error(file, method, msg, error);
}
exports.logError = logError;
/**
 * Checks for accept-language header and returns the 2-letter language code
 * or returns 'en' if none found - default language will be english (en)
 *
 * @param req
 */
function getLanguage(req) {
    const languageHeader = req.header('accept-language');
    let userLanguage = 'en';
    logDebug(__filename, 'getLanguage(req)', `Acquiring users language from the header: ${languageHeader}`);
    if (languageHeader && languageHeader.length >= 2) {
        userLanguage = languageHeader.substring(0, 2);
        logDebug(__filename, 'getLanguage(req)', 'userLanguage is ' + userLanguage);
    }
    return userLanguage;
}
exports.getLanguage = getLanguage;
/**
 * Aggregates some commmon scoring and debugging
 *
 * @param game
 * @param maze
 * @param action
 * @param startScore
 * @param finishScore
 */
function finalizeAction(game, actionMoveCount, startScore, langCode) {
    // increment move counters unless freeAction is set (new / resume game)
    game.Score.addMoves(actionMoveCount);
    game.Actions[game.Actions.length - 1].moveCount += actionMoveCount;
    // handle game out-of-moves ending
    if (game.Score.MoveCount >= game.Maze.CellCount * 3) {
        const lang = GameLang_1.default.getInstance(langCode);
        game.State = Enums_1.GAME_STATES.FINISHED;
        game.Score.GameResult = Enums_1.GAME_RESULTS.OUT_OF_MOVES;
        game.Score.addTrophy(Enums_1.TROPHY_IDS.OUT_OF_MOVES);
        if (game.Id.startsWith('FORCED')) {
            game.forceSetId(`${game.Id}__${Date.now()}`);
        }
        game.Actions[game.Actions.length - 1].outcomes.push(lang.outcomes.gameOverOutOfMoves);
    }
    else if (game.Score.MoveCount >= game.Maze.CellCount * 0.9) {
        game.Score.addTrophy(Enums_1.TROPHY_IDS.THE_LONGER_WAY_HOME);
    }
    else if (game.Score.MoveCount >= game.Maze.CellCount * 0.75) {
        game.Score.addTrophy(Enums_1.TROPHY_IDS.THE_LONG_WAY_HOME);
    }
    if (game.Score.MoveCount >= 1 && !(game.Monsters.length > 0) && game.Maze.ChallengeLevel >= 6) {
        game.addMonster(new Monster_1.default(game.Maze.FinishCell, Enums_1.MONSTER_STATES.STANDING, Enums_1.MONSTER_TAGS.CAT, Enums_1.DIRS.NORTH));
    }
    // Each monster takes a turn
    game.Monsters.forEach(monster => {
        game.Maze.getCell(monster.Location).addTag(Enums_1.CELL_TAGS.MONSTER);
        takeTurn(game, langCode, monster);
    });
    // track the score change from this one move
    game.Actions[game.Actions.length - 1].score = game.Score.getTotalScore() - startScore;
    getLocalMonster(game, langCode);
    // TODO: Move the minimap to it's own element instead of using outcomes
    try {
        const textRender = game.Maze.generateTextRender(true, game.Player.Location);
        game.Actions[game.Actions.length - 1].outcomes.push(textRender);
        logDebug(__filename, 'finalizeAction(...)', '\r\n' + textRender);
    }
    catch (renderError) {
        logError(__filename, 'finalizeAction(...)', 'Unable to generate text render of maze ->', renderError);
    }
    // update the engrams
    if (!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
        getLocal(game, langCode);
        actLook_1.doLookLocal(game, langCode);
        actSmell_1.doSmellLocal(game, langCode);
        actListen_1.doListenLocal(game, langCode);
        actTaste_1.doTasteLocal(game, langCode);
        actFeel_1.doFeelLocal(game, langCode);
    }
    else {
        logWarn(__filename, 'finalizeAction(...)', `Player state is ${Enums_1.PLAYER_STATES[game.Player.State]} (${game.Player.State}) - no engram data collected.`);
    }
    lifeCheck(game, langCode);
    return game.Actions[game.Actions.length - 1];
}
exports.finalizeAction = finalizeAction;
function getLocal(game, lang) {
    const method = `getLocal(${game.Id}, ${lang})`;
    logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram.here;
    const data = GameLang_1.default.getInstance(lang);
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH)) {
                    engram.exitNorth = true;
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH)) {
                    engram.exitSouth = true;
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST)) {
                    engram.exitEast = true;
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST)) {
                    engram.exitWest = true;
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
    if (cell.Notes.length > 0) {
        cell.Notes.forEach(element => {
            engram.messages.push(element);
        });
    }
}
exports.getLocal = getLocal;
function getLocalMonster(game, lang) {
    const data = GameLang_1.default.getInstance(lang);
    const cell = game.Maze.getCell(game.Player.Location);
    const outcomes = game.Actions[game.Actions.length - 1].outcomes;
    const method = `getLocalMonsters(${game.Id}, ${lang})`;
    logDebug(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.MONSTER)) {
        game.Monsters.forEach(monster => {
            const monsterType = Enums_1.MONSTER_TAGS[monster.getTag()];
            logDebug(__filename, method, `${cell.Location}, ${monster.getTag()}`);
            if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
                outcomes.push(util_1.format(data.outcomes.monsterHere, monsterType));
            }
        });
    }
}
exports.getLocalMonster = getLocalMonster;
function monsterInCell(game, lang) {
    const cell = game.Maze.getCell(game.Player.Location);
    const method = `monsterInCell(${game.Id}, ${lang})`;
    let isMonster = false;
    logDebug(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.MONSTER)) {
        game.Monsters.forEach(monster => {
            logDebug(__filename, method, `${cell.Location}, ${monster.getTag()}`);
            if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
                isMonster = true;
            }
        });
    }
    return isMonster;
}
exports.monsterInCell = monsterInCell;
function doWrite(game, lang, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doWrite(${game.Id}, ${lang},${message})`;
        const cell = game.Maze.getCell(new MazeLoc_1.MazeLoc(game.Player.Location.row, game.Player.Location.col));
        const startScore = game.Score.getTotalScore();
        const engram = game.Actions[game.Actions.length - 1].engram.here;
        const data = GameLang_1.default.getInstance(lang);
        engram.messages.pop();
        if (cell.Notes[0] === '') {
            cell.Notes[0] = message.substr(0, 8);
            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.SCRIBBLER);
        }
        else {
            cell.Notes.push(message.substr(0, 8));
            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.PAPERBACK_WRITER);
        }
        logDebug(__filename, method, 'executed the write command');
        game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.message);
        return Promise.resolve(finalizeAction(game, 1, startScore, lang));
    });
}
exports.doWrite = doWrite;
/**
 *
 * @param game
 * @param lang
 * @param delayTrigger flag to determine if a trap does not trigger as soon as the player enters a cell
 */
function trapCheck(game, lang, delayTrigger = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const pCell = game.Maze.getCell(game.Player.Location);
        const outcomes = game.Actions[game.Actions.length - 1].outcomes;
        const data = GameLang_1.default.getInstance(lang);
        if (!(pCell.Traps & Enums_1.CELL_TRAPS.NONE)) {
            for (let pos = 0; pos < 9; pos++) {
                const trapEnum = 1 << pos;
                if (!!(pCell.Traps & trapEnum)) {
                    switch (trapEnum) {
                        case Enums_1.CELL_TRAPS.PIT: {
                            outcomes.push(data.outcomes.trapOutcomes.pit);
                            game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.YOU_FELL_FOR_IT);
                            actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                            break;
                        }
                        case Enums_1.CELL_TRAPS.MOUSETRAP: {
                            outcomes.push(data.outcomes.trapOutcomes.mouse);
                            game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.TOO_GOOD_TO_BE_TRUE);
                            actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                            break;
                        }
                        case Enums_1.CELL_TRAPS.TARPIT: {
                            outcomes.push(data.outcomes.trapOutcomes.tar);
                            game.Player.addState(Enums_1.PLAYER_STATES.SLOWED);
                            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.THE_PITS);
                            break;
                        }
                        case Enums_1.CELL_TRAPS.FLAMETHROWER: {
                            // When the player enters the cell as a result from the previous action, tell them there is a tripwire in the direction they face
                            if (!delayTrigger) {
                                outcomes.push(util_1.format(data.outcomes.trapOutcomes.flamethrowerTrigger, data.directions[Enums_1.DIRS[game.Actions[game.Actions.length - 1].direction]]));
                            }
                            if (delayTrigger) {
                                // If the player moves or jumps in the direction the tripwire is facing, they trigger the trap
                                if (!!(game.Actions[game.Actions.length - 1].direction & game.Actions[game.Actions.length - 2].direction)
                                // || (game.Actions[game.Actions.length - 1].command === 9 && !!()
                                ) {
                                    logDebug(__filename, 'trapCheck()', `Players location within check ${game.Player.Location}`);
                                    outcomes.push(data.outcomes.trapOutcomes.flamethrower);
                                    game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                                    game = yield grantTrophy(game, Enums_1.TROPHY_IDS.TOO_HOT_TO_HANDLE);
                                    actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                                }
                            }
                            break;
                        }
                        case Enums_1.CELL_TRAPS.POISON_DART: {
                            // If the player has only entered the cell, warn them there is a pressure plate in the direciton they are facing
                            if (!delayTrigger) {
                                outcomes.push(util_1.format(data.outcomes.trapOutcomes.poisonDartTrigger, data.directions[Enums_1.DIRS[game.Actions[game.Actions.length - 1].direction]]));
                            }
                            if (delayTrigger) {
                                // if the player does the moves action in the direction of the pressure plate they saw previously, they trigger the trap
                                if (!!(game.Actions[game.Actions.length - 1].direction & game.Actions[game.Actions.length - 2].direction) &&
                                    game.Actions[game.Actions.length - 1].command === 8) {
                                    outcomes.push(data.outcomes.trapOutcomes.poisonDart);
                                    outcomes.push(data.outcomes.trapOutcomes.poisoned);
                                    game.Player.addState(Enums_1.PLAYER_STATES.POISONED);
                                }
                            }
                            break;
                        }
                        case Enums_1.CELL_TRAPS.CHEESE: {
                            outcomes.push(data.outcomes.trapOutcomes.cheese);
                            outcomes.push(data.outcomes.trapOutcomes.poisoned);
                            game.Player.addState(Enums_1.PLAYER_STATES.POISONED);
                            pCell.removeTrap(Enums_1.CELL_TRAPS.CHEESE);
                            game.Actions[game.Actions.length - 1].changedCells.push(pCell);
                            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.TOO_GOOD_TO_BE_TRUE);
                            break;
                        }
                        case Enums_1.CELL_TRAPS.FRAGILE_FLOOR: {
                            if (pCell.VisitCount < 2) {
                                outcomes.push(data.outcomes.trapOutcomes.fragileFloor);
                            }
                            if (pCell.VisitCount >= 2) {
                                outcomes.push(data.outcomes.trapOutcomes.fragileFloorCollapse);
                                game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                                actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                            }
                            break;
                        }
                        case Enums_1.CELL_TRAPS.TELEPORTER: {
                            const newX = Math.floor(Math.random() * (game.Maze.Width - 1));
                            const newY = Math.floor(Math.random() * (game.Maze.Height - 1));
                            movePlayerAbsolute(game, lang, newX, newY);
                            outcomes.push(data.outcomes.trapOutcomes.teleport);
                            game = yield grantTrophy(game, Enums_1.TROPHY_IDS.WHERE_AM_I);
                            break;
                        }
                        case Enums_1.CELL_TRAPS.DEADFALL: {
                            if (!delayTrigger) {
                                outcomes.push(data.outcomes.trapOutcomes.deadfallTrigger);
                            }
                            if (delayTrigger) {
                                switch (game.Player.Facing) {
                                    case Enums_1.DIRS.NORTH: {
                                        game.Maze.removeExit(pCell, Enums_1.DIRS.SOUTH);
                                        break;
                                    }
                                    case Enums_1.DIRS.SOUTH: {
                                        game.Maze.removeExit(pCell, Enums_1.DIRS.NORTH);
                                        break;
                                    }
                                    case Enums_1.DIRS.EAST: {
                                        game.Maze.removeExit(pCell, Enums_1.DIRS.WEST);
                                        break;
                                    }
                                    case Enums_1.DIRS.WEST: {
                                        game.Maze.removeExit(pCell, Enums_1.DIRS.EAST);
                                        break;
                                    }
                                }
                                pCell.removeTrap(Enums_1.CELL_TRAPS.DEADFALL);
                                game.Actions[game.Actions.length - 1].changedCells.push(pCell);
                                outcomes.push(data.outcomes.trapOutcomes.deadfall);
                            }
                            break;
                        }
                        default: {
                            outcomes.push('DEBUG:', Enums_1.CELL_TRAPS[trapEnum], ' currently not implemented!');
                        }
                    } // end switch
                } // end if (!!(pCell.Traps & trapEnum))
            } // end for
        } // end if CELL_TRAPS.NONE
    });
} // end trapCheck()
exports.trapCheck = trapCheck;
function lifeCheck(game, lang) {
    const status = game.Player.State;
    const outcomes = game.Actions[game.Actions.length - 1].outcomes;
    const data = GameLang_1.default.getInstance(lang);
    if (!!(status & Enums_1.PLAYER_STATES.POISONED)) {
        game.Player.Life -= 1;
        game.Actions[game.Actions.length - 1].playerLife = game.Player.Life;
    }
    if (game.Player.Life <= 0) {
        game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
        outcomes.push(data.outcomes.deathPoison);
        actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_POISON);
    }
}
exports.lifeCheck = lifeCheck;
function calculateIntensity(intensity, distance, maxDistance) {
    const test = ((intensity - (distance - 1)) / intensity) * ((maxDistance - (distance - 1)) / maxDistance);
    return ((intensity - (distance - 1)) / intensity) * ((maxDistance - (distance - 1)) / maxDistance);
}
exports.calculateIntensity = calculateIntensity;
function takeTurn(game, lang, monster) {
    const data = GameLang_1.default.getInstance(lang);
    const pLoc = game.Player.Location;
    const outcomes = game.Actions[game.Actions.length - 1].outcomes;
    const pCommand = game.Actions[game.Actions.length - 1].command;
    if (monster.Life <= 0) {
        monster.addState(Enums_1.MONSTER_STATES.DEAD);
    }
    const flip = Math.random() * 10;
    const mLoc = game.Maze.getCell(monster.Location);
    // if the monster is not dead, it tries to move forward
    if (!(Enums_1.MONSTER_STATES.DEAD & monster.State) &&
        (!(game.Player.Location.col === monster.Location.col && game.Player.Location.row === monster.Location.row) || (pCommand === 10 || pCommand === 13))) {
        // Monster will try to move randomly left, right, or forward. Otherwise it only turns.
        if (mLoc.isDirOpen(getLeft(monster.Facing))) {
            monsterMove(game, monster, getLeft(monster.Facing));
        }
        else if (mLoc.isDirOpen(monster.Facing)) {
            monsterMove(game, monster, monster.Facing);
        }
        else if (mLoc.isDirOpen(getRight(monster.Facing))) {
            monsterMove(game, monster, getRight(monster.Facing));
        }
        else {
            turnMonster(monster, Enums_1.DIRS.LEFT);
        }
    }
}
exports.takeTurn = takeTurn;
//     if (flip <= 3 && mLoc.isDirOpen(monster.Facing)) {
//       monsterMove(game, monster, monster.Facing);
//     } else if (flip >= 7 && mLoc.isDirOpen(getRight(monster.Facing))) {
//       monsterMove(game, monster, getRight(monster.Facing));
//     } else if (flip > 5 && mLoc.isDirOpen(getLeft(monster.Facing))) {
//       monsterMove(game, monster, getLeft(monster.Facing));
//     } else {
//       if (flip < 5) {
//         monster.Facing = getRight(monster.Facing);
//       } else {
//         monster.Facing = getLeft(monster.Facing);
//       }
//     }
//   }
// }
function monsterMove(game, monster, dir) {
    const method = `monsterMove([game], ${Enums_1.MONSTER_TAGS[monster.getTag()]}, ${Enums_1.DIRS[dir]}) :`;
    const oldCell = game.Maze.getCell(monster.Location);
    let newCell = game.Maze.getCell(monster.Location);
    switch (dir) {
        case Enums_1.DIRS.NORTH: {
            if (monster.Location.row - 1 >= 0) {
                monster.Location = new MazeLoc_1.MazeLoc(monster.Location.row - 1, monster.Location.col);
                newCell = game.Maze.getCell(monster.Location);
                monster.Facing = Enums_1.DIRS.NORTH;
            }
            else {
                monster.Facing = Enums_1.DIRS.SOUTH;
            }
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            if (monster.Location.row + 1 < game.Maze.Height) {
                monster.Location = new MazeLoc_1.MazeLoc(monster.Location.row + 1, monster.Location.col);
                newCell = game.Maze.getCell(monster.Location);
                monster.Facing = Enums_1.DIRS.SOUTH;
            }
            else {
                monster.Facing = Enums_1.DIRS.NORTH;
            }
            break;
        }
        case Enums_1.DIRS.EAST: {
            if (monster.Location.col + 1 < game.Maze.Width) {
                monster.Location = new MazeLoc_1.MazeLoc(monster.Location.row, monster.Location.col + 1);
                newCell = game.Maze.getCell(monster.Location);
                monster.Facing = Enums_1.DIRS.EAST;
            }
            else {
                monster.Facing = Enums_1.DIRS.WEST;
            }
            break;
        }
        case Enums_1.DIRS.WEST: {
            if (monster.Location.col - 1 >= 0) {
                monster.Location = new MazeLoc_1.MazeLoc(monster.Location.row, monster.Location.col - 1);
                newCell = game.Maze.getCell(monster.Location);
                monster.Facing = Enums_1.DIRS.WEST;
            }
            else {
                monster.Facing = Enums_1.DIRS.EAST;
            }
            break;
        }
        default: {
            monster.Facing = getRight(monster.Facing);
            break;
        }
    } // end switch dir
    oldCell.removeTag(Enums_1.CELL_TAGS.MONSTER);
    newCell.addTag(Enums_1.CELL_TAGS.MONSTER);
    logDebug(__filename, method, 'The monster has moved successfully!');
}
function getRight(dir) {
    switch (dir) {
        case Enums_1.DIRS.NORTH: {
            return Enums_1.DIRS.EAST;
        }
        case Enums_1.DIRS.SOUTH: {
            return Enums_1.DIRS.WEST;
        }
        case Enums_1.DIRS.EAST: {
            return Enums_1.DIRS.SOUTH;
        }
        case Enums_1.DIRS.WEST: {
            return Enums_1.DIRS.NORTH;
        }
        default: {
            return dir;
        }
    }
}
function getLeft(dir) {
    switch (dir) {
        case Enums_1.DIRS.NORTH: {
            return Enums_1.DIRS.WEST;
        }
        case Enums_1.DIRS.SOUTH: {
            return Enums_1.DIRS.EAST;
        }
        case Enums_1.DIRS.EAST: {
            return Enums_1.DIRS.NORTH;
        }
        case Enums_1.DIRS.WEST: {
            return Enums_1.DIRS.SOUTH;
        }
        default: {
            return dir;
        }
    }
}
function turnMonster(monster, dir) {
    switch (dir) {
        case Enums_1.DIRS.NORTH: {
            monster.Facing = Enums_1.DIRS.NORTH;
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            monster.Facing = Enums_1.DIRS.SOUTH;
            break;
        }
        case Enums_1.DIRS.EAST: {
            monster.Facing = Enums_1.DIRS.EAST;
            break;
        }
        case Enums_1.DIRS.WEST: {
            monster.Facing = Enums_1.DIRS.WEST;
            break;
        }
        case Enums_1.DIRS.LEFT: {
            switch (monster.Facing) {
                case Enums_1.DIRS.NORTH: {
                    monster.Facing = Enums_1.DIRS.WEST;
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    monster.Facing = Enums_1.DIRS.EAST;
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    monster.Facing = Enums_1.DIRS.NORTH;
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    monster.Facing = Enums_1.DIRS.SOUTH;
                    break;
                }
            }
            break;
        } // end case DIRS.LEFT
        case Enums_1.DIRS.RIGHT: {
            switch (monster.Facing) {
                case Enums_1.DIRS.NORTH: {
                    monster.Facing = Enums_1.DIRS.EAST;
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    monster.Facing = Enums_1.DIRS.WEST;
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    monster.Facing = Enums_1.DIRS.SOUTH;
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    monster.Facing = Enums_1.DIRS.NORTH;
                    break;
                }
            }
            break;
        } // end case DIRS.LEFT
    } // end switch DIR
}
//# sourceMappingURL=funcs.js.map