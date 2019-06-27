import * as fns from '../funcs';
import { CELL_TAGS, DIRS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { ISight } from '@mazemasterjs/shared-library/Interfaces/ISenses';

export function doLook(game: Game, langCode: string) {
  fns.logDebug(__filename, 'doLook()', 'Entering');
  const startScore = game.Score.getTotalScore();
  game.Actions[game.Actions.length - 1].outcomes.push('You take a look around.');
  return fns.finalizeAction(game, startScore, langCode);
}

/**
 * Update the
 * @param game
 * @param langCode
 */
export function doLookLocal(game: Game, langCode: string) {
  const method = `doLookLocal(${game.Id}, ${langCode})`;
  fns.logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  const MAX_DISTANCE = 3; // TODO: Make a MAX_DISTANCE env var ?
  const OUT_OF_RANGE = 999; // Should this be 999? -1?  Something else?

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)

    switch (dir) {
      case DIRS.NORTH:
        let nRow = cell.Location.row;
        while (nRow >= 0) {
          const thisCell = game.Maze.Cells[nRow][cell.Location.col];
          const distance = Math.abs(cell.Location.row - nRow);

          // bail out if we hit max distance
          if (distance > MAX_DISTANCE) {
            setSee(engram.north.see, { sight: 'darkness', distance: OUT_OF_RANGE });
            break;
          }

          // no exit north, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.NORTH)) {
            setSee(engram.north.see, { sight: 'wall', distance });
            break;
          }

          // at the entrance - report exit lava and stop travelling (OR YOU WILL DIE IN A FIRE!! AHHHH!!)
          if (!!(thisCell.Tags & CELL_TAGS.START)) {
            setSee(engram.north.see, { sight: 'lava', distance: distance + 1 }); // lava is just *outside* the maze
            break;
          }

          nRow--;
        }

        break;
      case DIRS.SOUTH:
        let sRow = cell.Location.row;
        while (sRow <= game.Maze.Height) {
          const thisCell = game.Maze.Cells[sRow][cell.Location.col];
          const distance = Math.abs(sRow - cell.Location.row);

          // bail out if we hit max distance
          if (distance > MAX_DISTANCE) {
            setSee(engram.south.see, { sight: 'darkness', distance: OUT_OF_RANGE });
            break;
          }

          // no exit south, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.SOUTH)) {
            setSee(engram.south.see, { sight: 'wall', distance });
            break;
          }

          // at the exit - report exit and cheese, then stop travelling
          if (!!(thisCell.Tags & CELL_TAGS.FINISH)) {
            setSee(engram.south.see, { sight: 'cheese', distance: distance + 1 }); // cheese is just *outside* the maze
            break;
          }

          sRow++;
        }
        break;
      case DIRS.EAST:
        let eCol = cell.Location.col;
        while (eCol <= game.Maze.Width) {
          const thisCell = game.Maze.Cells[cell.Location.row][eCol];
          const distance = Math.abs(eCol - cell.Location.col);

          // bail out if we hit max distance
          if (distance > MAX_DISTANCE) {
            setSee(engram.east.see, { sight: 'darkness', distance: OUT_OF_RANGE });
            break;
          }

          // no exit east, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.EAST)) {
            setSee(engram.east.see, { sight: 'wall', distance });
            break;
          }

          eCol++;
        }
        break;
      case DIRS.WEST:
        let wCol = cell.Location.col;
        while (wCol >= 0) {
          const thisCell = game.Maze.Cells[cell.Location.row][wCol];
          const distance = Math.abs(wCol - cell.Location.col);

          // bail out if we hit max distance
          if (distance > MAX_DISTANCE) {
            setSee(engram.west.see, { sight: 'darkness', distance: OUT_OF_RANGE });
            break;
          }

          // no exit west, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.WEST)) {
            setSee(engram.west.see, { sight: 'wall', distance });
            break;
          }

          wCol--;
        }
        break;
    }
  }
}

/**
 * Update the given see array with given sight if see[0].sight is empty (as is the
 * case if new Engram()), otherwise push sight onto the see array.
 *
 * @param see
 * @param sight
 */
function setSee(see: Array<ISight>, sight: ISight) {
  if (see[0].sight === '') {
    see[0] = sight;
  } else {
    see.push(sight);
  }
}
