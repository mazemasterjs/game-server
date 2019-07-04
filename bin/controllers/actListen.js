"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const funcs_1 = require("../funcs");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const GameLang_1 = __importDefault(require("../GameLang"));
function doListenLocal(game, lang) {
    const method = `doListenLocal(${game.Id}, ${lang})`;
    funcs_1.logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram;
    const data = GameLang_1.default.getInstance(lang);
    // get the local sounds
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
        setSound(engram.north.hear, { sound: data.entities.lava.sound.adjective, volume: 1 });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
        setSound(engram.south.hear, { sound: data.entities.cheese.sound.adjective, volume: 1 });
    }
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col));
                    doListenDirected(game, lang, nextCell, engram.north.hear, Enums_1.DIRS.SOUTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                    doListenDirected(game, lang, nextCell, engram.south.hear, Enums_1.DIRS.NORTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                    doListenDirected(game, lang, nextCell, engram.east.hear, Enums_1.DIRS.WEST, 1);
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                    doListenDirected(game, lang, nextCell, engram.west.hear, Enums_1.DIRS.EAST, 1);
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
}
exports.doListenLocal = doListenLocal;
/**
 *
 * @param game
 * @param lang
 * @param cell
 * @param engramDir the original direction from which the function is walking through, centered on the player
 * @param lastDirection used to make sure the function isn't checking going to the direction it just checked
 * @param distance how many cells from the first call of the function it is checking / depth of recursion
 */
function doListenDirected(game, lang, cell, engramDir, lastDirection, distance) {
    const data = GameLang_1.default.getInstance(lang);
    const method = `doListenDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
    const MAX_DISTANCE = 10;
    funcs_1.logDebug(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START) && distance < data.entities.lava.sound.intensity) {
        setSound(engramDir, { sound: data.entities.lava.sound.adjective, volume: parseFloat((distance / data.entities.lava.sound.intensity).toFixed(2)) });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH) && distance < data.entities.cheese.sound.intensity) {
        setSound(engramDir, { sound: data.entities.cheese.sound.adjective, volume: parseFloat((distance / data.entities.cheese.sound.intensity).toFixed(2)) });
    }
    if (cell.Traps !== Enums_1.CELL_TRAPS.NONE) {
        for (let pos = 0; pos < 9; pos++) {
            const trapEnum = 1 << pos;
            const trapType = Enums_1.CELL_TRAPS[trapEnum];
            if (!!(cell.Traps & trapEnum)) {
                try {
                    const intensity = data.traps[trapType.toUpperCase()].sound.intensity;
                    const adjective = data.traps[trapType.toUpperCase()].sound.adjective;
                    // const intensityString = `data.entities.${trapType}.smell.intensity`;
                    // const adjectiveString = `data.entities.${trapType}.smell.adjective`;
                    // const intensity = eval(intensityString);  <-- very clever, but an unsafe operation that the linter opposes
                    // const adjective = eval(adjectiveString);  <-- very clever, but an unsafe operation that the linter opposes
                    if (distance < intensity && distance !== 0) {
                        setSound(engramDir, { sound: adjective, volume: parseFloat((distance / intensity).toFixed(2)) });
                    }
                    else if (distance < intensity && distance === 0) {
                        setSound(engramDir, { sound: adjective, volume: 1 });
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
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.SOUTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.NORTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.WEST, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0 && !(lastDirection === dir)) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.EAST, distance + 1);
                    }
                    break;
                }
            } // end switch(dir)
        } // end for (pos<4)
    }
} // end doListenDirected
exports.doListenDirected = doListenDirected;
function setSound(sounds, sound) {
    if (sounds[0].sound === '') {
        sounds[0] = sound;
    }
    else {
        sounds.push(sound);
    }
}
//# sourceMappingURL=actListen.js.map