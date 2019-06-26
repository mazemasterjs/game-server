import CellBase from '@mazemasterjs/shared-library/CellBase';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { CELL_TRAPS, DIRS, CELL_TAGS } from '@mazemasterjs/shared-library/Enums';
import { format } from 'util';
import path from 'path';
import fs, { exists } from 'fs';
import { Player } from '@mazemasterjs/shared-library/Player';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import { getDirByName } from '../funcs';
import getSelectedBitNames from '@mazemasterjs/shared-library/Helpers';
import * as fns from '../funcs';
import { ISenses } from '@mazemasterjs/shared-library/Interfaces/ISenses';
const log = Logger.getInstance();

export function doLook(game: Game, langCode: string, engram: Engram): Engram {
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();

  // Grab the appropriate engram file
  const playerLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);
  const exitList: string[] = cell.listExits().split(', ');
  engram.north.see.pop();
  engram.south.see.pop();
  engram.east.see.pop();
  engram.west.see.pop();

  if (exitList.includes('NORTH')) {
    engram.north.see.push({ sight: 'exit', distance: 0 });
  } else {
    engram.north.see.push({ sight: 'wall', distance: 0 });
  }

  if (exitList.includes('SOUTH')) {
    engram.south.see.push({ sight: 'exit', distance: 0 });
  } else {
    engram.north.see.push({ sight: 'wall', distance: 0 });
  }

  if (exitList.includes('EAST')) {
    engram.east.see.push({ sight: 'exit', distance: 0 });
  } else {
    engram.north.see.push({ sight: 'wall', distance: 0 });
  }

  if (exitList.includes('WEST')) {
    engram.west.see.push({ sight: 'exit', distance: 0 });
  } else {
    engram.north.see.push({ sight: 'wall', distance: 0 });
  }

  action.engram = engram;
  // action.engram.sound = fns.getSound(game, langCode, cell);

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push('You see the entrace filled with lava');
    action.outcomes.push('North is lava');
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(game.Maze.generateTextRender(true, game.Player.Location));

  return engram;
}
