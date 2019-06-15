import { Engram } from '@mazemasterjs/shared-library/Engram';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { DIRS } from '@mazemasterjs/shared-library/Enums';

export function doLook(game: Game, langCode: string): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  const lang = GameLang.getInstance(langCode);

  // makes sure it's using the appropriate language object
  // const messages = lang.actions;
  const maze: Maze = new Maze(game.Maze);

  engram.sight = format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()); // lang.actions.engrams.sight +  lang.nothing + cell.listExits();
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
