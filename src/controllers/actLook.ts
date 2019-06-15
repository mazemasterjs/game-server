import { Engram } from '@mazemasterjs/shared-library/Engram';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import * as lang from '../lang/langIndex';
import { format } from 'util';

export function doLook(game: Game, language: lang.Ilanguage): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  //makes sure it's using the appropriate language object
  const messages =  language.myInstance().messages;
  const maze: Maze = new Maze(game.Maze);

  engram.sight = format(messages.actions.engramDescriptions.sight.local.exit, cell.listExits());//messages.actions.engrams.sight +  messages.nothing + cell.listExits();
  engram.smell = messages.actions.engrams.smell + messages.nothing;
  engram.touch = messages.actions.engrams.touch + messages.nothing;
  engram.taste = messages.actions.engrams.taste + messages.nothing;
  engram.sound = messages.actions.engrams.sound + messages.nothing;
  action.engram = engram;

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push(format(messages.actions.engramDescriptions.sight.local.exit, cell.listExits()));
    action.outcomes.push(messages.actions.outcome.entrance);
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(maze.generateTextRender(true, game.Player.Location));

  return action;
}
