"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fns = __importStar(require("../funcs"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const Helpers_1 = require("@mazemasterjs/shared-library/Helpers");
const funcs_1 = require("../funcs");
function doTurn(game, langCode) {
    funcs_1.logDebug(__filename, `doTurn(${game.Id}, ${langCode})`, 'Player has issued the Turn command.');
    const startScore = game.Score.getTotalScore();
    const action = game.Actions[game.Actions.length - 1];
    const direction = action.direction;
    // Turns left or right
    switch (direction) {
        case Enums_1.DIRS.RIGHT: {
            action.outcomes.push('You turn to the right.');
            game.Player.Facing = Helpers_1.getNextDir(game.Player.Facing);
            break;
        } // end case DIRS.RIGHT
        case Enums_1.DIRS.LEFT: {
            action.outcomes.push('You turn to the left.');
            game.Player.Facing = Helpers_1.getNextDir(game.Player.Facing, true);
            break;
        } // end case DIRS.LEFT
        default: {
            action.outcomes.push('You turn 360 degrees and moonwalk in place');
        }
    }
    // finalize and return the turn action results
    return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
}
exports.doTurn = doTurn;
//# sourceMappingURL=actTurn.js.map