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
import { getDirByName } from '../funcs'
import getSelectedBitNames from '@mazemasterjs/shared-library/Helpers';

export function doLook(game: Game, langCode: string): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  const lang = GameLang.getInstance(langCode);

  const maze: Maze = new Maze(game.Maze);
  const playerLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);
  engram.sight = "You see exits: " + game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];// lookForward(game, langCode, cell, engram, 0).sight;
  engram.smell = lang.actions.engrams.smell + lang.nothing;
  engram.touch = lang.actions.engrams.touch + lang.nothing;
  engram.taste = lang.actions.engrams.taste + lang.nothing;
  engram.sound = lang.actions.engrams.sound + lang.nothing;
  action.engram = engram;

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push(format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()));
    action.outcomes.push(format(lang.actions.outcome.entrance, DIRS[DIRS.NORTH]));
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(maze.generateTextRender(true, game.Player.Location));

  return action;
}

export function lookForward(game: Game, lang: string, cell: CellBase, engram: Engram, distance: number, data: any): Engram {
  const log = Logger.getInstance();
  let cellEmpty = true;
  // Makes a new maze  and maze locations so it can determine the next cell to look at later
  const maze: Maze = new Maze(game.Maze);
  const currentCell: MazeLoc = new MazeLoc(cell.Location.row, cell.Location.col);
  let nextCell: MazeLoc = new MazeLoc(cell.Location.row, cell.Location.col);
  // Gets the players direction and prefixs the sight engram with the characters direction
  const direction = game.Player.Facing;
  if (distance === 0) {engram.sight = `${DIRS[direction]}` + " : ";}
  log.debug(__filename,"DEBUG: engram.json: ", data.entities.BEARTRAP.sight.intensity);

  // Looks to see if the current cell contains a trap
  if (!(maze.getCell(currentCell).Traps === 0 && distance>0)){
    const trapType : string = CELL_TRAPS[maze.getCell(currentCell).Traps];
    switch(trapType){
      case "PIT":
          {
            if ((data.entities.PIT.sight.intensity - (distance*10) ) >= 0 ){
              engram.sight += data.entities.PIT.sight.adjective;
              cellEmpty = false;
            }
            break;
          }
      case "BEARTRAP":
          {
            if ((data.entities.BEARTRAP.sight.intensity - (distance*10) ) >= 0 ){
              engram.sight += data.entities.BEARTRAP.sight.adjective;
              cellEmpty = false;
            }
            break;
          }
      case "TARPIT":
          {
            if ((data.entities.TARPIT.sight.intensity - (distance*10) ) >= 0 ){
              engram.sight += data.entities.TARPIT.sight.adjective;
              cellEmpty = false;
            }
            break;
          }
      case "FLAMETHOWER":
          {
            if ((data.entities.FLAMETHOWER.sight.intensity - (distance*10) ) >= 0 ){
              engram.sight += data.entities.FLAMETHOWER.sight.adjective;
              cellEmpty = false;
            }
            break;
          }
      default:
          log.debug(__filename,"lookForward(): ", "Unidentified trap detected");
          break;
    }
  }

  // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
  if (maze.getCell(currentCell).isDirOpen(direction) && (distance*10 <= data.entities.DARKNESS.sight.intensity)){
      switch(direction){
        case DIRS.NORTH:
          nextCell = new MazeLoc(cell.Location.row - 1, cell.Location.col);
          break;
        case DIRS.EAST:
          nextCell = new MazeLoc(cell.Location.row, cell.Location.col+1) ;
          break;
        case DIRS.SOUTH:
            nextCell = new MazeLoc(cell.Location.row + 1, cell.Location.col)
          break
        case DIRS.WEST:
            nextCell = new MazeLoc(cell.Location.row , cell.Location.col - 1)
          break;
        default:
          break;
      }
      // An empty cell yields no additional information
      if (cellEmpty && distance>0) {engram.sight += " ... "};
      engram = lookForward(game,lang,maze.getCell(nextCell),engram,++distance, data);
    }
    else if (!(maze.getCell(currentCell).isDirOpen(direction)))
    {
      engram.sight += data.entities.wall.sight.adjective;
    }
    else {
      engram.sight += data.entities.DARKNESS.sight.adjective;
    }
    return engram;

}
