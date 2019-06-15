import { Engram } from '@mazemasterjs/shared-library/Engram';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Game } from '@mazemasterjs/shared-library/Game';
import { logDebug } from '../funcs';
import Maze from '@mazemasterjs/shared-library/Maze';
import en from '../lang/en';
import Ilanguage from 'src/lang/Ilanguage';

export function doLook(game: Game, language: Ilanguage): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const preMoveScore = game.Score.getTotalScore();
  //makes sure it's using the appropriate language object
  const messages =  language.getInstance().messages;
  const maze: Maze = new Maze(game.Maze);
  console.log(maze.generateTextRender(true, game.Player.Location));

  engram.sight = messages.actions.engrams.sight +  messages.nothing + cell.listExits();
  engram.smell = messages.actions.engrams.smell + messages.nothing;
  engram.touch = messages.actions.engrams.touch + messages.nothing;
  engram.taste = messages.actions.engrams.taste + messages.nothing;
  engram.sound = messages.actions.engrams.sound + ": " + messages.nothing;
  action.engram = engram;

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push(messages.actions.engramDescriptions.sight.local.exit + cell.listExits());
    action.outcomes.push(messages.actions.outcome.entrance);
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  return action;
}
