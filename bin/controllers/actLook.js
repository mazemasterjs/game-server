"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const Maze_1 = __importDefault(require("@mazemasterjs/shared-library/Maze"));
function doLook(game, language) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    //makes sure it's using the appropriate language object
    const messages = language.getInstance().messages;
    const maze = new Maze_1.default(game.Maze);
    console.log(maze.generateTextRender(true, game.Player.Location));
    engram.sight = messages.actions.engrams.sight + messages.nothing + cell.listExits();
    engram.smell = messages.actions.engrams.smell + messages.nothing;
    engram.touch = messages.actions.engrams.touch + messages.nothing;
    engram.taste = messages.actions.engrams.taste + messages.nothing;
    engram.sound = messages.actions.engrams.sound + ": " + messages.nothing;
    action.engram = engram;
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push(messages.actions.engramDescriptions.sight.local.exit + cell.listExits());
        action.outcomes.push(messages.actions.outcome.entrance);
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    return action;
}
exports.doLook = doLook;
//# sourceMappingURL=actLook.js.map