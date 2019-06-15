"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const util_1 = require("util");
const GameLang_1 = require("../GameLang");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
function doLook(game, langCode) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    const lang = GameLang_1.GameLang.getInstance(langCode);
    // makes sure it's using the appropriate language object
    // const messages = lang.actions;
    const maze = new Maze_1.Maze(game.Maze);
    engram.sight = util_1.format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()); // lang.actions.engrams.sight +  lang.nothing + cell.listExits();
    engram.smell = lang.actions.engrams.smell + lang.nothing;
    engram.touch = lang.actions.engrams.touch + lang.nothing;
    engram.taste = lang.actions.engrams.taste + lang.nothing;
    engram.sound = lang.actions.engrams.sound + lang.nothing;
    action.engram = engram;
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push(util_1.format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()));
        action.outcomes.push(util_1.format(lang.actions.outcome.entrance, Enums_1.DIRS[Enums_1.DIRS.NORTH]));
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(maze.generateTextRender(true, game.Player.Location));
    return action;
}
exports.doLook = doLook;
//# sourceMappingURL=actLook.js.map