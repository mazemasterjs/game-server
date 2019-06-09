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
const fns = __importStar(require("../funcs"));
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const funcs_1 = require("../funcs");
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const Cache_1 = require("../Cache");
function doMove(game) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `doMove(${game.Id})`;
        const engram = new Engram_1.Engram();
        const action = game.Actions[game.Actions.length - 1];
        const dir = action.direction;
        const maze = new Maze_1.default(game.Maze);
        // seems that that embedded objects reliable... have to keep reinstantiating things??
        const pLoc = new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col);
        //  logDebug(__filename, 'doMove', `${action.direction} is open? `);
        funcs_1.logDebug(__filename, 'doMove', `Player Loc: ${pLoc.toString()}`);
        // set the base engram
        engram.sight = 'You see nothing';
        engram.smell = 'You smell nothing.';
        engram.touch = 'You feel nothing.';
        engram.taste = 'You Taste nothing.';
        engram.sound = 'You hear nothing.';
        if (maze.getCell(pLoc).isDirOpen(dir)) {
            // add a move
            game.Score.addMove();
            engram.sight = 'You see exits: ' + maze.getCell(pLoc).listExits();
            switch (dir) {
                case Enums_1.DIRS.NORTH: {
                    if (pLoc.equals(game.Maze.StartCell)) {
                        engram.sight = 'Lava!';
                        engram.smell = 'Lava!';
                        engram.touch = 'Lava!';
                        engram.taste = 'Lava!';
                        engram.sound = 'Lava!';
                        action.outcomes.push("You step into the lava and, well... Let's just say: Game over.");
                        game.State = Enums_1.GAME_STATES.FINISHED;
                        game.Score.GameResult = Enums_1.GAME_RESULTS.DEATH_LAVA;
                        yield Cache_1.Cache.use()
                            .fetchOrGetItem(Cache_1.CACHE_TYPES.TROPHY, Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WISHFUL_DYING])
                            .then(item => {
                            const trophy = item;
                            game.Score.addTrophy(Enums_1.TROPHY_IDS.WISHFUL_DYING);
                            game.Score.addBonusPoints(trophy.BonusAward);
                            fns.logDebug(__filename, method, 'Trophy added.');
                        })
                            .catch(fetchError => {
                            fns.logWarn(__filename, method, 'Unable to fetch trophy: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.WISHFUL_DYING] + '. Error -> ' + fetchError.message);
                        });
                        fns.summarizeGame(action, game.Score);
                        funcs_1.logDebug(__filename, method, 'The game has been LOST: \r\n' + action.outcomes.join('\r\n'));
                    }
                    else {
                        action.outcomes.push('You move cautiously to the North.');
                        pLoc.row--;
                    }
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    if (pLoc.equals(game.Maze.FinishCell)) {
                        engram.sight = 'Cheese!';
                        engram.smell = 'Cheese!';
                        engram.touch = 'Cheese!';
                        engram.taste = 'Cheese!';
                        engram.sound = 'Cheese!';
                        action.outcomes.push('You step into the light and... CHEESE!');
                        game.State = Enums_1.GAME_STATES.FINISHED;
                        game.Score.GameResult = Enums_1.GAME_RESULTS.WIN;
                        yield Cache_1.Cache.use()
                            .fetchOrGetItem(Cache_1.CACHE_TYPES.TROPHY, Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.CHICKEN_DINNER])
                            .then(item => {
                            const trophy = item;
                            game.Score.addTrophy(Enums_1.TROPHY_IDS.CHICKEN_DINNER);
                            game.Score.addBonusPoints(trophy.BonusAward);
                            fns.logDebug(__filename, method, 'Trophy added.');
                        })
                            .catch(fetchError => {
                            fns.logWarn(__filename, method, 'Unable to fetch trophy: ' + Enums_1.TROPHY_IDS[Enums_1.TROPHY_IDS.CHICKEN_DINNER] + '. Error -> ' + fetchError.message);
                        });
                        fns.summarizeGame(action, game.Score);
                        funcs_1.logDebug(__filename, method, 'The game has been WON: \r\n' + action.outcomes.join('\r\n'));
                    }
                    else {
                        action.outcomes.push('You move cautiously to the South.');
                        pLoc.row++;
                    }
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    pLoc.col++;
                    action.outcomes.push('You move cautiously to the East.');
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    pLoc.col--;
                    action.outcomes.push('You move cautiously to the West.');
                    break;
                }
                default: {
                    action.outcomes.push("You don't know where you want to go so you go nowhere.");
                }
            }
        }
        else {
            action.outcomes.push('You walk headlong into a wall.');
        }
        action.engram = engram;
        console.log(maze.generateTextRender(true, pLoc));
        game.Player.Location = pLoc;
        return Promise.resolve(action);
    });
}
exports.doMove = doMove;
//# sourceMappingURL=actMove.js.map