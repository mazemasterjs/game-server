import CellBase from '@mazemasterjs/shared-library/CellBase';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { CELL_TRAPS, DIRS, CELL_TAGS } from '@mazemasterjs/shared-library/Enums';
import { format } from 'util';
import path from 'path';
import fs from 'fs';
import { Player } from '@mazemasterjs/shared-library/Player';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import { getDirByName } from '../funcs';
import getSelectedBitNames from '@mazemasterjs/shared-library/Helpers';
import * as fns from '../funcs';
const log = Logger.getInstance();

export function doLook(game: Game, langCode: string): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();

  // Grab the appropriate engram file
  const playerLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);
  const north: any[] = ['NORTH:'];
  const south: any[] = ['SOUTH:'];
  const east: any[] = ['EAST:'];
  const west: any[] = ['WEST:'];
  engram.sight.push(north);
  engram.sight.push(south);
  engram.sight.push(east);
  engram.sight.push(west);
  const northList = engram.sight[engram.sight.indexOf(north)];
  const southList = engram.sight[engram.sight.indexOf(south)];
  const eastList = engram.sight[engram.sight.indexOf(east)];
  const westList = engram.sight[engram.sight.indexOf(west)];
  // Look forward in the direcgtion the player is looking, and one cell in the periphery
  switch (game.Player.Facing) {
    case DIRS.NORTH: {
      lookForward(game, langCode, cell, northList, DIRS.NORTH, 0);
      lookForward(game, langCode, cell, eastList, DIRS.EAST, 0, 2);
      lookForward(game, langCode, cell, westList, DIRS.WEST, 0, 2);
      lookForward(game, langCode, cell, southList, DIRS.SOUTH, 0, 2);
      break;
    }
    case DIRS.EAST: {
      lookForward(game, langCode, cell, northList, DIRS.NORTH, 0, 2);
      lookForward(game, langCode, cell, eastList, DIRS.EAST, 0);
      lookForward(game, langCode, cell, southList, DIRS.SOUTH, 0, 2);
      lookForward(game, langCode, cell, westList, DIRS.WEST, 0, 2);
      break;
    }
    case DIRS.SOUTH: {
      lookForward(game, langCode, cell, eastList, DIRS.EAST, 0, 2);
      lookForward(game, langCode, cell, southList, DIRS.SOUTH, 0);
      lookForward(game, langCode, cell, westList, DIRS.WEST, 0, 2);
      lookForward(game, langCode, cell, northList, DIRS.NORTH, 0, 2);
      break;
    }
    case DIRS.WEST: {
      lookForward(game, langCode, cell, northList, DIRS.NORTH, 0, 2);
      lookForward(game, langCode, cell, southList, DIRS.SOUTH, 0, 2);
      lookForward(game, langCode, cell, westList, DIRS.WEST, 0);
      lookForward(game, langCode, cell, eastList, DIRS.EAST, 0, 2);
      break;
    }
  } // end switch(game.Player.Facing)
  action.engram.sight = engram.sight;
  // action.engram.sound = fns.getSound(game, langCode, cell);

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push('You see the entrace filled with lava');
    action.outcomes.push('North is lava');
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(game.Maze.generateTextRender(true, game.Player.Location));

  return action;
}

export function lookForward(game: Game, lang: string, cell: CellBase, engram: string[], dir: DIRS, distance: number, maxDistance?: number): string[] {
  const log = Logger.getInstance();
  const data = GameLang.getInstance(lang);
  const currentCell = game.Maze.Cells[cell.Location.row][cell.Location.col];
  let nextCell = currentCell;
  maxDistance = maxDistance === undefined ? 10 : maxDistance;
  // Gets the players direction and prepends the sight engram with the characters direction
  if (currentCell.Traps === 0 && !(distance === 0)) {
    engram.push('EMPTY');
  }

  if (!!(currentCell.Tags & CELL_TAGS.START) && dir === DIRS.NORTH) {
    engram.push(data.entities.lava.sight.adjective);
    return engram;
  }

  if (!!(currentCell.Tags & CELL_TAGS.FINISH) && dir === DIRS.SOUTH) {
    engram.push(data.entities.cheese.sight.adjective);
    return engram;
  }
  // Looks to see if the current cell contains a trap
  if (!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance) {
    if (!!(currentCell.Traps & CELL_TRAPS.PIT)) {
      engram.push(data.entities.PIT.sight.adjective);
    }
    if (!!(currentCell.Traps & CELL_TRAPS.FLAMETHROWER)) {
      engram.push(data.entities.FLAMETHROWER.sight.adjective);
    }
    if (!!(currentCell.Traps & CELL_TRAPS.TARPIT)) {
      engram.push(data.entities.TARPIT.sight.adjective);
    }
    if (!!(currentCell.Traps & CELL_TRAPS.MOUSETRAP)) {
      engram.push(data.entities.MOUSETRAP.sight.adjective);
    }
  } // end if(!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance)

  // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
  if (distance >= data.entities.DARKNESS.sight.intensity || distance >= maxDistance) {
    engram.push(data.entities.DARKNESS.sight.adjective);
  } else if (!currentCell.isDirOpen(dir)) {
    engram.push(data.entities.WALL.sight.adjective);
  } else {
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
    }
    lookForward(game, lang, nextCell, engram, dir, distance + 1, maxDistance);
  } // end if (currentCell.isDirOpen(dir))
  return engram;
} // end lookForward()
