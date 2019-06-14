"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("../funcs");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
function doStand(game) {
    funcs_1.logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const maze = new Maze_1.Maze(game.Maze);
    const preStandScore = game.Score.getTotalScore();
    // increment move counters
    game.Score.addMove();
    action.moveCount++;
    // note the lava to the north if in the start cell
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.engram.sight = 'There is lava to the North.';
    }
    if (!!(game.Player.State & Enums_1.PLAYER_STATES.STANDING)) {
        // TODO: Add trophy STANDING_AROUND once it's pushed live
        funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.STANDING_AROUND);
        action.outcomes.push("You're already standing.");
    }
    else {
        // execute the stand command
        game.Player.addState(Enums_1.PLAYER_STATES.STANDING);
        // TODO: Add trophy TAKING_A_STAND once it's pushed live
        funcs_1.grantTrophy(game, Enums_1.TROPHY_IDS.TAKING_A_STAND);
        action.outcomes.push('You struggle to your feet. You are now standing.');
    }
    // list exits
    action.engram.sight = 'You see exits: ' + cell.listExits();
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preStandScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(maze.generateTextRender(true, game.Player.Location));
    return action;
}
exports.doStand = doStand;
//# sourceMappingURL=actStand.js.map