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
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const funcs_1 = require("../funcs");
const GameLang_1 = __importDefault(require("../GameLang"));
const util_1 = require("util");
function doFace(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doFace(${game.Id}, ${langCode})`, 'Player has issued the Face command.');
        const startScore = game.Score.getTotalScore();
        const action = game.Actions[game.Actions.length - 1];
        const direction = action.direction;
        const data = GameLang_1.default.getInstance(langCode);
        if (!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
            {
                switch (direction) {
                    case Enums_1.DIRS.NORTH: {
                        action.outcomes.push(util_1.format(data.outcomes.face, data.directions[Enums_1.DIRS[action.direction]]));
                        game.Player.Facing = Enums_1.DIRS.NORTH;
                        break;
                    }
                    case Enums_1.DIRS.SOUTH: {
                        action.outcomes.push(util_1.format(data.outcomes.face, data.directions[Enums_1.DIRS[action.direction]]));
                        game.Player.Facing = Enums_1.DIRS.SOUTH;
                        break;
                    }
                    case Enums_1.DIRS.WEST: {
                        action.outcomes.push(util_1.format(data.outcomes.face, data.directions[Enums_1.DIRS[action.direction]]));
                        game.Player.Facing = Enums_1.DIRS.WEST;
                        break;
                    }
                    case Enums_1.DIRS.EAST: {
                        action.outcomes.push(util_1.format(data.outcomes.face, data.directions[Enums_1.DIRS[action.direction]]));
                        game.Player.Facing = Enums_1.DIRS.EAST;
                        break;
                    }
                    default: {
                        action.outcomes.push(data.outcomes.turnWrong);
                        game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.WASTED_TIME);
                    }
                }
            }
        }
        else {
            action.outcomes.push(data.outcomes.stunned);
            game.Player.removeState(Enums_1.PLAYER_STATES.STUNNED);
            game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.DAZED_AND_CONFUSED);
        }
        // finalize and return the turn action results
        return Promise.resolve(fns.finalizeAction(game, 1, startScore, langCode));
    });
}
exports.doFace = doFace;
//# sourceMappingURL=actFace.js.map