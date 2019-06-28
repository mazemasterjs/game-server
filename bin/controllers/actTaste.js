"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("../funcs");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const GameLang_1 = __importDefault(require("../GameLang"));
function doTasteLocal(game, lang) {
    const method = `doTasteLocal(${game.Id}, ${lang})`;
    funcs_1.logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram;
    const data = GameLang_1.default.getInstance(lang);
    // get the local sounds
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
        setTaste(engram.north.taste, { taste: data.entities.lava.taste.adjective, strength: data.entities.lava.taste.intensity });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
        setTaste(engram.south.taste, { taste: data.entities.cheese.taste.adjective, strength: data.entities.cheese.taste.intensity });
    }
    // taste specific, get tastes in the cell
    doTasteDirected(game, lang, cell, engram.here.taste, Enums_1.DIRS.NONE, 0);
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col));
                    doTasteDirected(game, lang, nextCell, engram.north.taste, Enums_1.DIRS.SOUTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                    doTasteDirected(game, lang, nextCell, engram.south.taste, Enums_1.DIRS.NORTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                    doTasteDirected(game, lang, nextCell, engram.east.taste, Enums_1.DIRS.WEST, 1);
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                    doTasteDirected(game, lang, nextCell, engram.west.taste, Enums_1.DIRS.EAST, 1);
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
}
exports.doTasteLocal = doTasteLocal;
function doTasteDirected(game, lang, cell, engramDir, lastDirection, distance) {
    const data = GameLang_1.default.getInstance(lang);
    const method = `dotasteDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
    const MAX_DISTANCE = 0;
    funcs_1.logDebug(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
        setTaste(engramDir, { taste: data.entities.lava.taste.adjective, strength: distance });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
        setTaste(engramDir, { taste: data.entities.cheese.taste.adjective, strength: distance });
    }
    if (cell.Traps !== Enums_1.CELL_TRAPS.NONE) {
        for (let pos = 0; pos < 9; pos++) {
            const trapEnum = 1 << pos;
            const trapType = Enums_1.CELL_TRAPS[trapEnum];
            if (!!(cell.Traps & trapEnum)) {
                try {
                    const intensity = data.entities[trapType.toLowerCase()].taste.intensity;
                    const adjective = data.entities[trapType.toLowerCase()].taste.adjective;
                    if (distance < intensity) {
                        setTaste(engramDir, { taste: adjective, strength: distance });
                    }
                }
                catch (err) {
                    funcs_1.logDebug(__filename, method, err);
                }
            } // end (!!(cell.Traps & trapEnum))
        } // end for(pos<9)}
    } // if (!!(cell.Traps & CELL_TRAPS.NONE))
    //  loop through the cardinal directions in DIRS
    if (distance < MAX_DISTANCE) {
        for (let pos = 0; pos < 4; pos++) {
            const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
            switch (dir) {
                case Enums_1.DIRS.NORTH: {
                    if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0 && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col));
                        doTasteDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.SOUTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                        doTasteDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.NORTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                        doTasteDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.WEST, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0 && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                        doTasteDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.EAST, distance + 1);
                    }
                    break;
                }
            } // end switch(dir)
        } // end for (pos<4)
    }
} // end dotasteDirected
exports.doTasteDirected = doTasteDirected;
/**
 * Update the given taste array with given scent if taste[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param taste
 * @param scent
 */
function setTaste(tastes, taste) {
    if (tastes[0].taste === '') {
        tastes[0] = taste;
    }
    else {
        tastes.push(taste);
    }
}
//# sourceMappingURL=actTaste.js.map