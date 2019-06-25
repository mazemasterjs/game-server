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
const funcs_1 = require("../funcs");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const actLook_1 = require("./actLook");
function doTurn(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doTurn(${game.Id})`, 'Player has issued the Turn command.');
        const startScore = game.Score.getTotalScore();
        const method = `doTurn(${game.Id})`;
        const action = game.Actions[game.Actions.length - 1];
        const direction = action.direction;
        const engram = game.Actions[game.Actions.length - 1].engram;
        // Turns left or right
        switch (direction) {
            case Enums_1.DIRS.LEFT: {
                switch (game.Player.Facing) {
                    case Enums_1.DIRS.NORTH:
                        game.Player.Facing = action.direction = Enums_1.DIRS.WEST;
                        action.outcomes.push('You turn to the left.');
                        break;
                    case Enums_1.DIRS.WEST:
                        game.Player.Facing = action.direction = Enums_1.DIRS.SOUTH;
                        action.outcomes.push('You turn to the left.');
                        break;
                    case Enums_1.DIRS.SOUTH:
                        game.Player.Facing = action.direction = Enums_1.DIRS.EAST;
                        action.outcomes.push('You turn to the left.');
                        break;
                    case Enums_1.DIRS.EAST:
                        game.Player.Facing = action.direction = Enums_1.DIRS.NORTH;
                        action.outcomes.push('You turn to the left.');
                        break;
                }
                break;
            } // end case DIRS.LEFT
            case Enums_1.DIRS.RIGHT: {
                switch (game.Player.Facing) {
                    case Enums_1.DIRS.NORTH:
                        game.Player.Facing = action.direction = Enums_1.DIRS.EAST;
                        action.outcomes.push('You turn to the Right.');
                        break;
                    case Enums_1.DIRS.WEST:
                        game.Player.Facing = action.direction = Enums_1.DIRS.NORTH;
                        action.outcomes.push('You turn to the Right.');
                        break;
                    case Enums_1.DIRS.SOUTH:
                        game.Player.Facing = action.direction = Enums_1.DIRS.WEST;
                        action.outcomes.push('You turn to the Right.');
                        break;
                    case Enums_1.DIRS.EAST:
                        game.Player.Facing = action.direction = Enums_1.DIRS.SOUTH;
                        action.outcomes.push('You turn to the Rightt.');
                        break;
                }
                break;
            } // end case DIRS.RIGHT
            default: {
                action.outcomes.push('You turn 360 degrees and moonwalk in place');
            }
        }
        action.engram.sight.push(actLook_1.doLook(game, langCode).engram.sight);
        // finalize the game action
        game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, startScore);
        return Promise.resolve(game.Actions[game.Actions.length - 1]);
    });
}
exports.doTurn = doTurn;
//# sourceMappingURL=actTurn.js.map