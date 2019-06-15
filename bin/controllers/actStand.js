"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const GameLang_1 = require("../GameLang");
const funcs_1 = require("../funcs");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
function doStand(game, langCode) {
    return __awaiter(this, void 0, void 0, function* () {
        funcs_1.logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
        const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
        const action = game.Actions[game.Actions.length - 1];
        const maze = new Maze_1.Maze(game.Maze);
        const preStandScore = game.Score.getTotalScore();
        const lang = GameLang_1.GameLang.getInstance(langCode);
        // increment move counters
        game.Score.addMove();
        action.moveCount++;
        // note the lava to the north if in the start cell
        if (cell.Location.equals(game.Maze.StartCell)) {
            action.engram.sight = lang.actions.engramDescriptions.sight.local.entrance;
        }
        if (!!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
            // TODO: Add trophy STANDING_AROUND once it's pushed live
            yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.STANDING_AROUND);
            action.outcomes.push(lang.actions.outcome.stand.standing);
        }
        else {
            // execute the stand command
            game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
            // TODO: Add trophy TAKING_A_STAND once it's pushed live
            yield funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.TAKING_A_STAND);
            action.outcomes.push(lang.actions.outcome.stand.sitting);
        }
        // list exits
        action.engram.sight = util_1.format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()); // lang.actions.engramDescriptions.sight.local.exit + cell.listExits();
        // track the score change from this one move
        action.score = game.Score.getTotalScore() - preStandScore;
        // TODO: text render - here now just for DEV/DEBUG purposes
        action.outcomes.push(maze.generateTextRender(true, game.Player.Location));
        return Promise.resolve(action);
    });
}
exports.doStand = doStand;
//# sourceMappingURL=actStand.js.map