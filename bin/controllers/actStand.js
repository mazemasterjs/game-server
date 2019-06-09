"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("../funcs");
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
function doStand(game) {
    funcs_1.logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const maze = new Maze_1.default(game.Maze);
    const preStandScore = game.Score.getTotalScore();
    // note the lava to the north if in the start cell
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.engram.sight = 'There is lava to the North.';
    }
    if (!!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
        // increment move counters
        game.Score.addMove();
        action.moveCount++;
        // TODO: Add trophy STANDING_AROUND once it's pushed live
        action.outcomes.push("You're already standing.");
    }
    else {
        // increment move counters
        game.Score.addMove();
        action.moveCount++;
        // execute the stand command
        game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
        // TODO: Add trophy TAKING_A_STAND once it's pushed live
        action.outcomes.push('You struggle to your feet. You are now standing.');
    }
    // list exits
    action.engram.sight = 'You see exits: ' + cell.listExits();
    // TODO: Remove this ... it's for debugging
    console.log(maze.generateTextRender(true, game.Player.Location));
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preStandScore;
    return action;
}
exports.doStand = doStand;
//# sourceMappingURL=actStand.js.map