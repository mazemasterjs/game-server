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
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const GameLang_1 = __importDefault(require("../GameLang"));
function doStand(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doStand(${game.Id}, ${langCode})`, 'Player has issued the STAND command.');
        const startScore = game.Score.getTotalScore();
        const data = GameLang_1.default.getInstance(langCode);
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
            game = yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.STAND_HARDER);
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.standwhilestanding);
        }
        else {
            // execute the stand command
            game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
            // TODO: Add trophy TAKING_A_STAND once it's pushed live
            game = yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.TAKING_A_STAND);
            game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stand);
        }
        // finalize and return action
        return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
    });
}
exports.doStand = doStand;
//# sourceMappingURL=actStand.js.map