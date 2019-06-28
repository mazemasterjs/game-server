"use strict";
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
function doJump(game, lang) {
    const data = GameLang_1.default.getInstance(lang);
    if (!!(game.Player.State & Enums_1.PLAYER_STATES.SITTING)) {
        game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpwhilesitting);
        game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
    }
    else {
        jumpNext(game, lang, 0);
    }
    const startScore = game.Score.getTotalScore();
    return Promise.resolve(fns.finalizeAction(game, startScore, lang));
}
exports.doJump = doJump;
function jumpNext(game, lang, distance) {
    const method = `jumpNext(${game.Id},${lang},${distance})`;
    const cell = game.Maze.getCell(new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col));
    const dir = game.Actions[game.Actions.length - 1].direction;
    game.Player.Facing = dir;
    const data = GameLang_1.default.getInstance(lang);
    if (distance <= 1) {
        if (cell.isDirOpen(dir)) {
            // Check to see if the player jumped into the entrance or exit...
            if (!!(cell.Tags & Enums_1.CELL_TAGS.START) && dir === Enums_1.DIRS.NORTH) {
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpintolava);
                actMove_1.finishGame(game, Enums_1.GAME_RESULTS.DEATH_LAVA);
                return;
            }
            else if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH) && dir === Enums_1.DIRS.SOUTH) {
                fns.logDebug(__filename, method, 'Player leaped south into the exit (cheese).');
                game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.win);
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
            fns.movePlayer(game);
            jumpNext(game, lang, distance + 1);
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumping);
        }
        else {
            funcs_1.logDebug(__filename, method, 'Player crashed into a wall while jumping');
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpintowall);
            game.Player.addState(Enums_1.PLAYER_STATES.SITTING);
        }
    }
    else {
        game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.landfromjump);
        if (!!(cell.Traps & Enums_1.CELL_TRAPS.NONE)) {
            // placeholder for traps
        }
    }
}
exports.jumpNext = jumpNext;
//# sourceMappingURL=actJump.js.map