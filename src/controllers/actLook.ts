import { Engram } from '@mazemasterjs/shared-library/Engram';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { DIRS } from '@mazemasterjs/shared-library/Enums';
import CellBase from '@mazemasterjs/shared-library/CellBase';
import path from 'path';
import fs from 'fs';
import { Player } from '@mazemasterjs/shared-library/Player';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import Logger from '@mazemasterjs/logger';
import { getDirByName } from '../funcs'

export function doLook(game: Game, langCode: string): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  const lang = GameLang.getInstance(langCode);

  const maze: Maze = new Maze(game.Maze);
  const playerLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);
  engram.sight = game.Player.Facing + " : " + lookForward(game, langCode, cell, engram, 0).sight;
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

export function lookForward(game: Game, lang: string, cell: CellBase, engram: Engram, distance: number): Engram {
  let engramNext: Engram = new Engram;
  const log = Logger.getInstance();
  if (distance === 0) {engramNext.sight = game.Player.Facing + " : "}
  engramNext.sight ="";
  const file = path.resolve(`./data/engram.json`);
  const data = JSON.parse(fs.readFileSync(file, 'UTF-8'));
  
  const direction = game.Player.Facing;
  const maze: Maze = new Maze(game.Maze);
  const lookCell: MazeLoc = new MazeLoc(cell.Location.row, cell.Location.col);
  let nextCell: MazeLoc = new MazeLoc(cell.Location.row, cell.Location.col);
  if (maze.getCell(lookCell).isDirOpen(direction)){
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
      engramNext.sight += "[OPEN]"
      engramNext = lookForward(game,lang,maze.getCell(nextCell),engramNext,distance++);
    }
    else // if (!(game.Maze.getCell(lookCell).isOpen(direction)) && ((data.entities.wall.sight.intensity/10)< distance))
    {
      engram.sight += data.entities.wall.sight.adjective;
    }
    engram.sight += engramNext.sight;
    return engram;

}
