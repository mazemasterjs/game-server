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
function doStand(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
        const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
        const startScore = game.Score.getTotalScore();
        const engram = game.Actions[game.Actions.length - 1].engram;
        // note the lava to the north if in the start cell
        // if (cell.Location.equals(game.Maze.StartCell)) {
        //   engram.sight = 'LAVA NORTH';
        // }
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
            game = yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.STAND_HARDER);
            game.Actions[game.Actions.length - 1].outcomes.push('You were already standing.');
        }
        else {
            // execute the stand command
            game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
            // TODO: Add trophy TAKING_A_STAND once it's pushed live
            game = yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.TAKING_A_STAND);
            game.Actions[game.Actions.length - 1].outcomes.push('You stand up.');
        }
        // look ahead and one space around
        engram.sight = actLook_1.doLook(game, langCode).engram.sight;
        // gather senses
        engram.smell = fns.smellJSON(game, langCode, cell, 0);
        engram.sound = fns.getSound(game, langCode, cell);
        // finalize the game action
        game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, startScore);
        return Promise.resolve(game.Actions[game.Actions.length - 1]);
    });
}
exports.doStand = doStand;
//# sourceMappingURL=actStand.js.map