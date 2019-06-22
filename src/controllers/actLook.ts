import CellBase from '@mazemasterjs/shared-library/CellBase';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { CELL_TRAPS, DIRS } from '@mazemasterjs/shared-library/Enums';
import { format } from 'util';
import path from 'path';
import fs from 'fs';
import { Player } from '@mazemasterjs/shared-library/Player';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import { getDirByName } from '../funcs';
import getSelectedBitNames from '@mazemasterjs/shared-library/Helpers';

export function doLook(game: Game, langCode: string): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  // Grab the appropriate engram file
  const maze: Maze = new Maze(game.Maze);
  const playerLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);
  // Look forward in the direcgtion the player is looking, and one cell in the periphery
  switch (game.Player.Facing) {
    case DIRS.NORTH: {
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.NORTH, 0).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.EAST, 0, 2).sight;
      // engram.sight += ` BEHIND: [${DIRS[game.Player.Facing]}] `;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.WEST, 0, 2).sight;
      break;
    }
    case DIRS.EAST: {
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.NORTH, 0, 2).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.EAST, 0).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.SOUTH, 0, 2).sight;
      // engram.sight += ` BEHIND: [${DIRS[game.Player.Facing]}] `;
      break;
    }
    case DIRS.SOUTH: {
      //  engram.sight += ` BEHIND: [${DIRS[game.Player.Facing]}] `;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.EAST, 0, 2).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.SOUTH, 0).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.WEST, 0, 2).sight;
      break;
    }
    case DIRS.WEST: {
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.NORTH, 0, 2).sight;
      // engram.sight += ` BEHIND: [${DIRS[game.Player.Facing]}] `;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.SOUTH, 0, 2).sight;
      engram.sight += lookForward(game, langCode, cell, engram, DIRS.WEST, 0).sight;
      break;
    }
  } // end switch(game.Player.Facing)
  action.engram.sight = engram.sight;

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push('You see the entrace filled with lava');
    action.outcomes.push('North is lava');
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(maze.generateTextRender(true, game.Player.Location));

  return action;
}

export function lookForward(game: Game, lang: string, cell: CellBase, engram: Engram, dir: DIRS, distance: number, maxDistance?: number): Engram {
  const log = Logger.getInstance();
  const data = GameLang.getInstance(lang);
  let cellEmpty = true;
  const currentCell = game.Maze.Cells[cell.Location.row][cell.Location.col];
  let nextCell = currentCell;
  maxDistance = maxDistance === undefined ? 10 : maxDistance;
  // Gets the players direction and prepends the sight engram with the characters direction
  if (distance === 0 && DIRS[dir] === DIRS[game.Player.Facing]) {
    engram.sight = `FACING: [${DIRS[dir]} : `;
  } else if (distance === 0) {
    engram.sight = `[${DIRS[dir]} : `;
  } else {
    engram.sight += '';
  }
  // Looks to see if the current cell contains a trap
  if (!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance) {
    const trapType: string = CELL_TRAPS[currentCell.Traps];
    switch (trapType) {
      case 'PIT': {
        if (data.entities.PIT.sight.intensity - distance * 10 >= 0) {
          engram.sight += data.entities.PIT.sight.adjective;
          cellEmpty = false;
        }
        break;
      }
      case 'BEARTRAP': {
        if (data.entities.BEARTRAP.sight.intensity - distance * 10 >= 0) {
          engram.sight += data.entities.BEARTRAP.sight.adjective;
          cellEmpty = false;
        }
        break;
      }
      case 'TARPIT': {
        if (data.entities.TARPIT.sight.intensity - distance * 10 >= 0) {
          engram.sight += data.entities.TARPIT.sight.adjective;
          cellEmpty = false;
        }
        break;
      }
      case 'FLAMETHOWER': {
        if (data.entities.FLAMETHROWER.sight.intensity - distance * 10 >= 0) {
          engram.sight += data.entities.FLAMETHROWER.sight.adjective;
          cellEmpty = false;
        }
        break;
      }
      default:
        log.debug(__filename, 'lookForward(): ', 'Unidentified trap detected');
        break;
    }
  } // end if(!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance)

  // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
  if (currentCell.isDirOpen(dir) && distance * 10 <= data.entities.DARKNESS.sight.intensity && distance < maxDistance) {
    switch (dir) {
      case DIRS.NORTH:
        if (currentCell.Location.row - 1 >= 0) {
          nextCell = game.Maze.Cells[currentCell.Location.row - 1][currentCell.Location.col];
        }
        break;
      case DIRS.EAST:
        if (currentCell.Location.col + 1 <= game.Maze.Width - 1) {
          nextCell = game.Maze.Cells[currentCell.Location.row][currentCell.Location.col + 1];
        }
        break;
      case DIRS.SOUTH:
        if (currentCell.Location.row + 1 <= game.Maze.Height - 1) {
          nextCell = game.Maze.Cells[currentCell.Location.row + 1][currentCell.Location.col];
        }
        break;
      case DIRS.WEST:
        if (currentCell.Location.col - 1 >= 0) {
          nextCell = game.Maze.Cells[currentCell.Location.row][currentCell.Location.col - 1];
        }
        break;
      default:
        break;
    } // end switch(dir)
    // An empty cell yields no additional information
    if (cellEmpty && distance > 0 && distance <= maxDistance) {
      engram.sight += ' ... ';
    }
    engram = lookForward(game, lang, nextCell, engram, dir, ++distance, maxDistance);
  } // end if (currentCell.isDirOpen(dir) && distance * 10 <= data.entities.DARKNESS.sight.intensity && distance < maxDistance)
  else if (!currentCell.isDirOpen(dir) && distance < maxDistance) {
    if (cellEmpty && distance !== 0) {
      engram.sight += ' ... ';
    }
    engram.sight += data.entities.wall.sight.adjective + '] ';
  } else {
    engram.sight += data.entities.DARKNESS.sight.adjective + '] ';
  }
  return engram;
} // end lookForward()
