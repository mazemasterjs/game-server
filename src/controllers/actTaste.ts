import { Game } from '@mazemasterjs/shared-library/Game';

import { logDebug } from '../funcs';

import { DIRS, CELL_TAGS, CELL_TRAPS } from '@mazemasterjs/shared-library/Enums';

import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';

import CellBase from '@mazemasterjs/shared-library/CellBase';

import { ITaste } from '@mazemasterjs/shared-library/Interfaces/ISenses';

import GameLang from '../GameLang';

export function doTasteLocal(game: Game, lang: string) {
  const method = `doTasteLocal(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;

  const data = GameLang.getInstance(lang);
  // get the local sounds
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setTaste(engram.north.taste, { taste: data.entities.lava.taste.adjective, strength: data.entities.lava.taste.intensity });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setTaste(engram.south.taste, { taste: data.entities.cheese.taste.adjective, strength: data.entities.cheese.taste.intensity });
  }

  // taste specific, get tastes in the cell
  doTasteDirected(game, lang, cell, engram.here.taste, DIRS.NONE, 0);

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doTasteDirected(game, lang, nextCell, engram.north.taste, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doTasteDirected(game, lang, nextCell, engram.south.taste, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doTasteDirected(game, lang, nextCell, engram.east.taste, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doTasteDirected(game, lang, nextCell, engram.west.taste, DIRS.EAST, 1);
        }
        break;
      }
    } // end switch(dir)
  } // end for (pos<4)
}
export function doTasteDirected(game: Game, lang: string, cell: CellBase, engramDir: ITaste[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `dotasteDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  const MAX_DISTANCE = 0;
  logDebug(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setTaste(engramDir, { taste: data.entities.lava.taste.adjective, strength: distance });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setTaste(engramDir, { taste: data.entities.cheese.taste.adjective, strength: distance });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.entities[trapType.toLowerCase()].taste.intensity;
          const adjective = data.entities[trapType.toLowerCase()].taste.adjective;
          if (distance < intensity) {
            setTaste(engramDir, { taste: adjective, strength: distance });
          }
        } catch (err) {
          logDebug(__filename, method, err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
  //  loop through the cardinal directions in DIRS
  if (distance < MAX_DISTANCE) {
    for (let pos = 0; pos < 4; pos++) {
      const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
      switch (dir) {
        case DIRS.NORTH: {
          if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0 && !(lastDirection === dir)) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
          }
          break;
        }
        case DIRS.SOUTH: {
          if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && !(lastDirection === dir)) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
          }
          break;
        }
        case DIRS.EAST: {
          if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && !(lastDirection === dir)) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
          }
          break;
        }
        case DIRS.WEST: {
          if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && !(lastDirection === dir)) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
          }
          break;
        }
      } // end switch(dir)
    } // end for (pos<4)
  }
} // end dotasteDirected

/**
 * Update the given taste array with given scent if taste[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param taste
 * @param scent
 */
function setTaste(tastes: Array<ITaste>, taste: ITaste) {
  if (tastes[0].taste === '') {
    tastes[0] = taste;
  } else {
    tastes.push(taste);
  }
}
