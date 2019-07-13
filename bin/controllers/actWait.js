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
const util_1 = require("util");
function doWait(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doWait(${game.Id}, ${langCode})`, 'Player has issued the STAND command.');
        const startScore = game.Score.getTotalScore();
        const data = GameLang_1.default.getInstance(langCode);
        const outcomes = game.Actions[game.Actions.length - 1].outcomes;
        const cell = game.Maze.getCell(game.Player.Location);
        const moveCost = 1;
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STUNNED)) {
            outcomes.push(data.outcomes.stunnedWait);
            game.Player.removeState(Enums_1.PLAYER_STATES.STUNNED);
        }
        else if (!!(cell.Tags & Enums_1.CELL_TAGS.MONSTER)) {
            game.Monsters.forEach((monster) => __awaiter(this, void 0, void 0, function* () {
                const monsterType = Enums_1.MONSTER_TAGS[monster.getTag()];
                if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
                    outcomes.push(util_1.format(data.outcomes.monsterWait, monsterType));
                    game = yield fns.grantTrophy(game, Enums_1.TROPHY_IDS.THE_WAITING_GAME);
                }
            }));
        }
        else {
            outcomes.push(data.outcomes.wait);
        }
        return Promise.resolve(fns.finalizeAction(game, moveCost, startScore, langCode));
    });
}
exports.doWait = doWait;
//# sourceMappingURL=actWait.js.map