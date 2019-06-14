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
const funcs_1 = require("../funcs");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const MazeLoc_1 = require("@mazemasterjs/shared-library/MazeLoc");
// need a config object for some of this
const config = Config_1.Config.getInstance();
function doMove(game) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doMove(${game.Id})`;
        const action = game.Actions[game.Actions.length - 1];
        const engram = action.engram;
        const dir = action.direction;
        const maze = new Maze_1.Maze(game.Maze);
        // grab the current score so we can update action with points earned or lost during this move
        const startScore = game.Score.getTotalScore();
        // seems that that embedded objects reliable... have to keep reinstantiating things??
        const pLoc = new MazeLoc_1.MazeLoc(game.Player.Location.row, game.Player.Location.col);
        // first make sure the player can move at all
        if (!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
            fns.logDebug(__filename, method, 'Player tried to move while not standing.');
            // add the trophy for walking without standing
            fns.grantTrophy(game, Enums_1.TROPHY_IDS.SPINNING_YOUR_WHEELS);
            action.outcomes.push('Try standing up before you move.');
            // finalize and return action
            return Promise.resolve(finalizeAction(game, maze, action, startScore));
        }
        // now check for start/finish cell win & lose conditions
        if (maze.getCell(pLoc).isDirOpen(dir)) {
            if (dir === Enums_1.DIRS.NORTH && pLoc.equals(game.Maze.StartCell)) {
                fns.logDebug(__filename, method, 'Player moved north into the entrance (lava).');
                engram.sight = 'Lava!';
                engram.smell = 'Lava!';
                engram.touch = 'Lava!';
                engram.taste = 'Lava!';
                engram.sound = 'Lava!';
                action.outcomes.push("You step into the lava and, well... Let's just say: Game over.");
                finishGame(game, action, Enums_1.GAME_RESULTS.DEATH_LAVA);
            }
            else if (dir === Enums_1.DIRS.SOUTH && pLoc.equals(game.Maze.FinishCell)) {
                fns.logDebug(__filename, method, 'Player moved south into the exit (cheese).');
                engram.sight = 'Cheese!';
                engram.smell = 'Cheese!';
                engram.touch = 'Cheese!';
                engram.taste = 'Cheese!';
                engram.sound = 'Cheese!';
                action.outcomes.push('You step into the light and find... CHEESE!');
                // game over: WINNER or WIN_FLAWLESS
                if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
                    finishGame(game, finalizeAction(game, maze, action, startScore), Enums_1.GAME_RESULTS.WIN_FLAWLESS);
                }
                else {
                    finishGame(game, finalizeAction(game, maze, action, startScore), Enums_1.GAME_RESULTS.WIN);
                }
            }
            else {
                game = fns.movePlayer(game, action);
            }
        }
        else {
            // they tried to walk in a direction that has a wall
            fns.grantTrophy(game, Enums_1.TROPHY_IDS.YOU_FOUGHT_THE_WALL);
            game.Player.addState(Enums_1.PLAYER_STATES.SITTING);
            engram.sight = `You get a very close up view of the wall to the ${Enums_1.DIRS[dir]}.`;
            engram.touch = 'You feel the wall... with your face.';
            engram.sound = 'Your ears are ringing.';
            action.outcomes.push(`You walk headlong into the wall to the ${Enums_1.DIRS[dir]}, which knocks you down.`);
            action.outcomes.push(`Your are now ${Enums_1.DIRS[dir]} now ${Enums_1.PLAYER_STATES[game.Player.State]}.`);
        }
        // game continues - return the action (with outcomes and engram)
        return Promise.resolve(finalizeAction(game, maze, action, startScore));
    });
}
exports.doMove = doMove;
/**
 * Aggregates some commmon scoring and debugging
 *
 * @param game
 * @param maze
 * @param action
 * @param startScore
 * @param finishScore
 */
function finalizeAction(game, maze, action, startScore) {
    // increment move counters
    game.Score.addMove();
    action.moveCount++;
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - startScore;
    // TODO: Remove summarize from every every move - here now for DEV/DEBUG  purposes
    fns.summarizeGame(action, game.Score);
    // TODO: text render - here now just for DEV/DEBUG purposess
    action.outcomes.push('DEBUG MAZE RENDER\r\n: ' + maze.generateTextRender(true, game.Player.Location));
    return action;
}
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
function finishGame(game, lastAct, gameResult) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `finishGame(${game.Id}, ${Enums_1.GAME_RESULTS[gameResult]})`;
        // update the basic game state & result fields
        game.State = Enums_1.GAME_STATES.FINISHED;
        game.Score.GameResult = gameResult;
        switch (gameResult) {
            case Enums_1.GAME_RESULTS.WIN_FLAWLESS: {
                // add bonus WIN_FLAWLESS if the game was perfect
                // there is no break here on purpose - flawless winner also gets a CHEDDAR_DINNER
                yield fns
                    .grantTrophy(game, Enums_1.TROPHY_IDS.FLAWLESS_VICTORY)
                    .then(() => {
                    fns.logDebug(__filename, method, 'FLAWLESS_VICTORY awarded to score for game ' + game.Id);
                })
                    .catch(trophyErr => {
                    fns.logWarn(__filename, method, 'Unable to add FLAWLESS_VICTORY trophy to score. Error -> ' + trophyErr);
                });
            }
            case Enums_1.GAME_RESULTS.WIN: {
                yield fns
                    .grantTrophy(game, Enums_1.TROPHY_IDS.CHEDDAR_DINNER)
                    .then(() => {
                    fns.logDebug(__filename, method, 'CHEDDAR_DINNER awarded to score for game ' + game.Id);
                })
                    .catch(trophyErr => {
                    fns.logWarn(__filename, method, 'Unable to add CHEDDAR_DINNER trophy to score. Error -> ' + trophyErr);
                });
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
        fns.summarizeGame(lastAct, game.Score);
        funcs_1.logDebug(__filename, method, `Game Over. Game Result: [${Enums_1.GAME_RESULTS[gameResult]}] Final Outcomes:\r\n + ${lastAct.outcomes.join('\r\n')}`);
        // save the game's score
        saveScore(game);
        // Append a timestamp to any game.Id starting with the word 'FORCED' so the original IDs can
        // be re-used - very handy for testing and development
        if (game.Id.startsWith('FORCED')) {
            game.forceSetId(`${game.Id}__${Date.now()}`);
        }
        return Promise.resolve(game);
    });
}
//# sourceMappingURL=actMove.js.map