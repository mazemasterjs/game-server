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
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const funcs_1 = require("../funcs");
const GameLang_1 = __importDefault(require("../GameLang"));
const fns = __importStar(require("../funcs"));
const actMove_1 = require("./actMove");
const util_1 = require("util");
function doJump(game, lang) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = GameLang_1.default.getInstance(lang);
        let moveCost = 2;
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.SLOWED)) {
            moveCost += 2;
        }
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stunned);
            game.Player.removeState(Enums_1.PLAYER_STATES.STUNNED);
        }
        else {
            if (!!(game.Player.State & Enums_1.PLAYER_STATES.SITTING)) {
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jump.sitting);
                game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
            }
            else if (!!(game.Actions[game.Actions.length - 1].direction & Enums_1.DIRS.NONE)) {
                game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.JUMPING_JACK_FLASH);
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jump.noDirection);
            }
            else {
                fns.trapCheck(game, lang, true);
                if (fns.monsterInCell(game, lang)) {
                    game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.monster.deathCat);
                    actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
                }
                jumpNext(game, lang, 0);
            }
        }
        const startScore = game.Score.getTotalScore();
        return Promise.resolve(fns.finalizeAction(game, moveCost, startScore, lang));
    });
}
exports.doJump = doJump;
/**
 * A recursive function that sees if the cell has an exit in the direction the player is facing.
 * The player will continue to move cells in that direction until they hit the maxmum distance,
 * of the player would hit a wall.
 * @param game
 * @param lang
 * @param distance how far the player has traveled
 * @param maxDistance that maximum distance before the player lands
 */
function jumpNext(game, lang, distance, maxDistance = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        const method = `jumpNext(${game.Id},${lang},${distance})`;
        const cell = game.Maze.getCell(new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col));
        const dir = game.Actions[game.Actions.length - 1].direction;
        const outcomes = game.Actions[game.Actions.length - 1].outcomes;
        game.Player.Facing = dir;
        const data = GameLang_1.default.getInstance(lang);
        if (distance <= maxDistance) {
            if (cell.isDirOpen(dir)) {
                // Check to see if the player jumped into the entrance or exit...
                if (!!(cell.Tags & Enums_1.CELL_TAGS.START) && dir === Enums_1.DIRS.NORTH) {
                    outcomes.push(util_1.format(data.outcomes.jump.jumping, data.directions[Enums_1.DIRS[dir]]));
                    outcomes.push(data.outcomes.jump.lava);
                    actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_LAVA);
                    return;
                }
                else if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH) && dir === Enums_1.DIRS.SOUTH) {
                    fns.logDebug(__filename, method, 'Player leaped south into the exit (cheese).');
                    outcomes.push(util_1.format(data.outcomes.jump.jumping, data.directions[Enums_1.DIRS[dir]]));
                    outcomes.push(data.outcomes.jump.land);
                    outcomes.push(data.outcomes.win);
                    // game over: WINNER or WIN_FLAWLESS
                    if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
                        actMove_1.finishGame(game, Enums_1.GAME_RESULTS.WIN_FLAWLESS);
                    }
                    else {
                        actMove_1.finishGame(game, Enums_1.GAME_RESULTS.WIN);
                    }
                    return;
                }
                // if not, the player moves and it checks the next cell
                fns.movePlayer(game, lang, false);
                // If the player tried to jump over a flamethrower trap, it triggers anyways
                const pCell = game.Maze.getCell(game.Player.Location);
                if (pCell.Traps > 0 && !!(pCell.Traps & Enums_1.CELL_TRAPS.FLAMETHROWER)) {
                    game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.MIGHTY_MOUSE);
                }
                if (!!(pCell.Traps & Enums_1.CELL_TRAPS.FLAMETHROWER)) {
                    fns.trapCheck(game, lang, true);
                }
                jumpNext(game, lang, distance + 1);
            }
            else {
                funcs_1.logDebug(__filename, method, 'Player crashed into a wall while jumping');
                outcomes.push(util_1.format(data.outcomes.jump.jumping, data.directions[Enums_1.DIRS[dir]]));
                outcomes.push(data.outcomes.jump.wall);
                game.Player.addState(Enums_1.PLAYER_STATES.SITTING);
                game.Player.addState(Enums_1.PLAYER_STATES.STUNNED);
            }
        }
        else {
            outcomes.push(util_1.format(data.outcomes.jump.jumping, data.directions[Enums_1.DIRS[dir]]));
            outcomes.push(data.outcomes.jump.land);
            fns.trapCheck(game, lang);
            if (fns.monsterInCell(game, lang)) {
                game.Player.addState(Enums_1.PLAYER_STATES.DEAD);
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.monster.deathCat);
                actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_TRAP);
            }
        }
    });
}
exports.jumpNext = jumpNext;
//# sourceMappingURL=actJump.js.map