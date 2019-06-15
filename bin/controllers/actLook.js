"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const util_1 = require("util");
function doLook(game, language) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    //makes sure it's using the appropriate language object
    const messages = language.myInstance().messages;
    const maze = new Maze_1.Maze(game.Maze);
    engram.sight = util_1.format(messages.actions.engramDescriptions.sight.local.exit, cell.listExits()); //messages.actions.engrams.sight +  messages.nothing + cell.listExits();
    engram.smell = messages.actions.engrams.smell + messages.nothing;
    engram.touch = messages.actions.engrams.touch + messages.nothing;
    engram.taste = messages.actions.engrams.taste + messages.nothing;
    engram.sound = messages.actions.engrams.sound + messages.nothing;
    action.engram = engram;
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push(util_1.format(messages.actions.engramDescriptions.sight.local.exit, cell.listExits()));
        action.outcomes.push(messages.actions.outcome.entrance);
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(maze.generateTextRender(true, game.Player.Location));
    return action;
}
exports.doLook = doLook;
//# sourceMappingURL=actLook.js.map