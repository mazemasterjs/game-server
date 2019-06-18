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
const funcs_1 = require("../funcs");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const actLook_1 = require("./actLook");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function doTurn(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doTurn(${game.Id})`, 'Player has issued the Turn command.');
        const maze = new Maze_1.Maze(game.Maze);
        const startScore = game.Score.getTotalScore();
        const method = `doTurn(${game.Id})`;
        const action = game.Actions[game.Actions.length - 1];
        const direction = action.direction;
        const engram = game.Actions[game.Actions.length - 1].engram;
        // Grab the appropriate engram file
        const file = path_1.default.resolve(`./data/engram.json`);
        const data = JSON.parse(fs_1.default.readFileSync(file, 'UTF-8'));
        switch (direction) {
            case Enums_1.DIRS.NORTH: {
                game.Player.Facing = Enums_1.DIRS.NORTH;
                action.outcomes.push('You turn to the North.');
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                game.Player.Facing = Enums_1.DIRS.SOUTH;
                action.outcomes.push('You turn to the South.');
                break;
            }
            case Enums_1.DIRS.EAST: {
                game.Player.Facing = Enums_1.DIRS.EAST;
                action.outcomes.push('You turn to the East.');
                break;
            }
            case Enums_1.DIRS.WEST: {
                game.Player.Facing = Enums_1.DIRS.WEST;
                action.outcomes.push('You turn to the West.');
                break;
            }
        }
        const newEngram = actLook_1.lookForward(game, langCode, game.Maze.Cells[game.Player.Location.row][game.Player.Location.col], engram, 0, data);
        action.engram.sight = newEngram.sight;
        // finalize the game action
        game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, maze, startScore);
        return Promise.resolve(game.Actions[game.Actions.length - 1]);
    });
}
exports.doTurn = doTurn;
//# sourceMappingURL=actTurn.js.map