"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
function doLook(game) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    const maze = new Maze_1.default(game.Maze);
    console.log(maze.generateTextRender(true, game.Player.Location));
    engram.sight = 'You see exits: ' + cell.listExits();
    engram.smell = 'You smell nothing.';
    engram.touch = 'You feel nothing.';
    engram.taste = 'You Taste nothing.';
    engram.sound = 'You hear nothing.';
    action.engram = engram;
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push('You look around and see exits: ' + cell.listExits());
        action.outcomes.push('There is lava to the North.');
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    return action;
}
exports.doLook = doLook;
//# sourceMappingURL=actLook.js.map