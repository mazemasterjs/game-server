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
const fns = __importStar(require("../funcs"));
const Config_1 = require("../Config");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const util_1 = require("util");
const GameLang_1 = require("../GameLang");
const funcs_1 = require("../funcs");
const MazeLoc_1 = require("@mazemasterjs/shared-library/MazeLoc");
// need a config object for some of this
const config = Config_1.Config.getInstance();
function doMove(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doMove(${game.Id})`;
        let dir = game.Actions[game.Actions.length - 1].direction;
        if (dir === 0) {
            dir = game.Actions[game.Actions.length - 1].direction = game.Player.Facing;
        }
        const data = GameLang_1.GameLang.getInstance(langCode);
        // grab the current score so we can update action with points earned or lost during this move
        const startScore = game.Score.getTotalScore();
        // seems that that embedded objects reliable... have to keep reinstantiating things??
        const pLoc = new MazeLoc_1.MazeLoc(game.Player.Location.row, game.Player.Location.col);
        // first make sure the player can move at all
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
            fns.logDebug(__filename, method, 'Player tried to move while stunned.');
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stunned);
            game.Player.removeState(Enums_1.PLAYER_STATES.STUNNED);
        }
        else if (!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
            fns.logDebug(__filename, method, 'Player tried to move while not standing.');
            // add the trophy for walking without standing
            game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.SPINNING_YOUR_WHEELS);
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.moveWhileSitting);
            // finalize and return action
            return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
        }
        else {
            // now check for start/finish cell win & lose conditions
            fns.trapCheck(game, langCode, true);
            if (game.Maze.getCell(pLoc).isDirOpen(dir)) {
                if (dir === Enums_1.DIRS.NORTH && pLoc.equals(game.Maze.StartCell)) {
                    fns.logDebug(__filename, method, 'Player moved north into the entrance (lava).');
                    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.lava);
                    finishGame(game, Enums_1.GAME_RESULTS.DEATH_LAVA);
                }
                else if (dir === Enums_1.DIRS.SOUTH && pLoc.equals(game.Maze.FinishCell)) {
                    fns.logDebug(__filename, method, 'Player moved south into the exit (cheese).');
                    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.win);
                    // game over: WINNER or WIN_FLAWLESS
                    if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
                        finishGame(game, Enums_1.GAME_RESULTS.WIN_FLAWLESS);
                    }
                    else {
                        finishGame(game, Enums_1.GAME_RESULTS.WIN);
                    }
                }
                else {
                    // Changes the facing of the player and looks in that direction
                    game.Player.Facing = dir;
                    fns.movePlayer(game);
                }
            }
            else {
                // they tried to walk in a direction that has a wall
                game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL);
                game.Player.addState(Enums_1.PLAYER_STATES.SITTING);
                game.Actions[game.Actions.length - 1].outcomes.push(util_1.format(data.outcomes.walkIntoWall, data.direction[Enums_1.DIRS[dir]]));
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stunned);
            }
        }
        fns.trapCheck(game, langCode);
        // game continues - return the action (with outcomes and engram)
        return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
    });
}
exports.doMove = doMove;
/**
 * Attempts to call the score service to save a game score in the
 * database's scores collection
 *
 * @param game
 */
function saveScore(game) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `saveScore(${game.Id})`;
        // Store Score Data
        return yield fns
            .doPut(config.SERVICE_SCORE + '/insert', game.Score)
            .then(result => {
            if (parseInt(result.insertedCount, 10) !== 1) {
                fns.logWarn(__filename, method, `insertedCount=${result.insertedCount} - Score did not save successfully.`);
            }
            else {
                fns.logDebug(__filename, method, 'Score saved.');
            }
            return Promise.resolve(true);
        })
            .catch(putError => {
            fns.logError(__filename, method, 'Error saving Score ->', putError);
            return Promise.reject(putError);
        });
    });
}
/**
 *
 * @param game
 * @param lastAct
 * @param gameResult
 * @returns Promise<Game>
 */
function finishGame(game, gameResult) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `finishGame(${game.Id}, ${Enums_1.GAME_RESULTS[gameResult]})`;
        // update the basic game state & result fields
        game.State = Enums_1.GAME_STATES.FINISHED;
        game.Score.GameResult = gameResult;
        switch (gameResult) {
            case Enums_1.GAME_RESULTS.WIN_FLAWLESS: {
                // add bonus WIN_FLAWLESS if the game was perfect
                // there is no break here on purpose - flawless winner also gets a CHEDDAR_DINNER
                game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.FLAWLESS_VICTORY);
            }
            case Enums_1.GAME_RESULTS.WIN: {
                fns.grantTrophy(game, Enums_1.TROPHY_IDS.CHEDDAR_DINNER);
                break;
            }
            case Enums_1.GAME_RESULTS.DEATH_LAVA: {
                yield fns
                    .grantTrophy(game, Enums_1.TROPHY_IDS.TOO_HOT_TO_HANDLE)
                    .then(() => {
                    fns.logDebug(__filename, method, 'TOO_HOT_TO_HANDLE awarded to score for game ' + game.Id);
                })
                    .catch(trophyErr => {
                    fns.logWarn(__filename, method, 'Unable to add TOO_HOT_TO_HANDLE trophy to score. Error -> ' + trophyErr);
                });
                break;
            }
            case Enums_1.GAME_RESULTS.OUT_OF_MOVES: {
                yield fns
                    .grantTrophy(game, Enums_1.TROPHY_IDS.OUT_OF_MOVES)
                    .then(() => {
                    fns.logDebug(__filename, method, 'OUT_OF_MOVES awarded to score for game ' + game.Id);
                })
                    .catch(trophyErr => {
                    fns.logWarn(__filename, method, 'Unable to add OUT_OF_MOVES trophy to score. Error -> ' + trophyErr);
                });
                break;
            }
            case Enums_1.GAME_RESULTS.DEATH_POISON:
            case Enums_1.GAME_RESULTS.DEATH_TRAP:
            case Enums_1.GAME_RESULTS.OUT_OF_TIME:
            default: {
                fns.logDebug(__dirname, method, `GAME_RESULT not implemented: ${Enums_1.GAME_RESULTS[gameResult]}`);
            }
        }
        // Summarize and log game result
        fns.summarizeGame(game.Actions[game.Actions.length - 1], game.Score);
        funcs_1.logDebug(__filename, method, `Game Over. Game Result: [${Enums_1.GAME_RESULTS[gameResult]}] Final Outcomes:\r\n + ${game.Actions[game.Actions.length - 1].outcomes.join('\r\n')}`);
        // save the game's score
        saveScore(game);
        // Append a timestamp to any game.Id starting with the word 'FORCED' so the original IDs can
        // be re-used - very handy for testing and development
        if (game.Id.startsWith('FORCED')) {
            const oldGameId = game.Id;
            const newGameId = `${game.Id}__${Date.now()}`;
            game.forceSetId(newGameId);
            fns.logWarn(__filename, method, `Forced Game.Id changed from [${oldGameId}] to [${newGameId}]`);
        }
        return Promise.resolve(game);
    });
}
exports.finishGame = finishGame;
//# sourceMappingURL=actMove.js.map