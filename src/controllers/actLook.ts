import * as fns from '../funcs';
import GameLang from '../GameLang';
import { Cell } from '@mazemasterjs/shared-library/Cell';
import { CELL_TAGS, CELL_TRAPS, DIRS, MONSTER_TAGS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { ISight } from '@mazemasterjs/shared-library/Interfaces/ISenses';

let MAX_SIGHT_DISTANCE = 3;

export function doLook(game: Game, langCode: string) {
  fns.logTrace(__filename, 'doLook()', 'Entering');
  const data = GameLang.getInstance(langCode);
  const startScore = game.Score.getTotalScore();
  game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.look);
  return fns.finalizeAction(game, 1, startScore, langCode);
}

/**
 * Update the
 * @param game
 * @param langCode
 */
export function doLookLocal(game: Game, langCode: string) {
  const method = `doLookLocal(${game.Id}, ${langCode})`;
  fns.logTrace(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  const data = GameLang.getInstance(langCode);
  MAX_SIGHT_DISTANCE = data.entities.darkness.sight.intensity;

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH:
        let nRow = cell.Location.row;
        while (nRow >= 0) {
          const thisCell = game.Maze.Cells[nRow][cell.Location.col];
          const distance = Math.abs(cell.Location.row - nRow);
          seeTraps(game, langCode, thisCell, engram.north.see, distance);
          seeMonsters(game, langCode, thisCell, engram.north.see, distance);
          // bail out if we hit max distance
          if (distance >= MAX_SIGHT_DISTANCE) {
            setSee(engram.north.see, { sight: data.entities.darkness.sight.adjective, distance: MAX_SIGHT_DISTANCE });
            break;
          }

          // no exit north, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.NORTH)) {
            setSee(engram.north.see, { sight: data.entities.wall.sight.adjective, distance });
            break;
          }

          // at the entrance - report exit lava and stop travelling (OR YOU WILL DIE IN A FIRE!! AHHHH!!)
          if (!!(thisCell.Tags & CELL_TAGS.START)) {
            setSee(engram.north.see, { sight: data.entities.lava.sight.adjective, distance: distance + 1 }); // lava is just *outside* the maze
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
          seeTraps(game, langCode, thisCell, engram.south.see, distance);
          seeMonsters(game, langCode, thisCell, engram.south.see, distance);
          // bail out if we hit max distance
          if (distance >= MAX_SIGHT_DISTANCE) {
            setSee(engram.south.see, { sight: data.entities.darkness.sight.adjective, distance: MAX_SIGHT_DISTANCE });
            break;
          }

          // no exit south, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.SOUTH)) {
            setSee(engram.south.see, { sight: data.entities.wall.sight.adjective, distance });
            break;
          }

          // at the exit - report exit and cheese, then stop travelling
          if (!!(thisCell.Tags & CELL_TAGS.FINISH)) {
            setSee(engram.south.see, { sight: data.entities.exit.sight.adjective, distance: distance + 1 }); // cheese is just *outside* the maze
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
          seeTraps(game, langCode, thisCell, engram.east.see, distance);
          seeMonsters(game, langCode, thisCell, engram.east.see, distance);
          // bail out if we hit max distance
          if (distance >= MAX_SIGHT_DISTANCE) {
            setSee(engram.east.see, { sight: data.entities.darkness.sight.adjective, distance: data.entities.darkness.sight.intensity });
            break;
          }

          // no exit east, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.EAST)) {
            setSee(engram.east.see, { sight: data.entities.wall.sight.adjective, distance });
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
          seeTraps(game, langCode, thisCell, engram.west.see, distance);
          seeMonsters(game, langCode, thisCell, engram.west.see, distance);
          // bail out if we hit max distance
          if (distance >= MAX_SIGHT_DISTANCE) {
            setSee(engram.west.see, { sight: data.entities.darkness.sight.adjective, distance: MAX_SIGHT_DISTANCE });
            break;
          }

          // no exit west, report wall and stop travelling
          if (!(thisCell.Exits & DIRS.WEST)) {
            setSee(engram.west.see, { sight: data.entities.wall.sight.adjective, distance });
            break;
          }

          wCol--;
        }
        break;
    } // end switch(dir)
  } // end for(pos)
} // end doLookLocal

/**
 * Update the given see array with given sight if see[0].sight is empty (as is the
 * case if new Engram()), otherwise push sight onto the see array.
 *
 * @param see
 * @param sight
 */
function setSee(see: Array<ISight>, sight: ISight) {
  if (see[0].sight === 'nothing') {
    see[0] = sight;
  } else {
    see.push(sight);
  }
}

function seeMonsters(game: Game, lang: string, cell: Cell, engramDir: ISight[], dist: number) {
  const data = GameLang.getInstance(lang);
  const method = `seeMonsters(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${dist})`;
  fns.logTrace(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.MONSTER)) {
    game.Monsters.forEach(monster => {
      const monsterType = MONSTER_TAGS[monster.getTag()];
      fns.logTrace(__filename, 'seeMonsters(): ', `${monster.getTag()}`);
      const adj = data.monsters[monsterType.toUpperCase()].sight.adjective;
      const int = data.monsters[monsterType.toUpperCase()].sight.intensity;
      if (monster.Location.equals(cell.Location) && int >= dist) {
        setSee(engramDir, { sight: adj, distance: dist });
      }
    });
  }
}

function seeTraps(game: Game, lang: string, cell: Cell, engram: ISight[], dist: number) {
  const method = `seeTraps(${game.Id},${lang},${cell.Location}, ISight[], ${dist})`;
  const data = GameLang.getInstance(lang);
  if (!(cell.Traps & CELL_TRAPS.NONE)) {
    for (let ps = 0; ps < 9; ps++) {
      const trapEnum = 1 << ps;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.traps[trapType.toUpperCase()].sight.intensity;
          const adjective = data.traps[trapType.toUpperCase()].sight.adjective;
          if (dist <= intensity) {
            setSee(engram, { sight: adjective, distance: dist });
          }
        } catch (err) {
          fns.logTrace(__filename, method, err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
}
