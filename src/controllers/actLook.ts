import { Engram } from '@mazemasterjs/shared-library/Engram';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Game } from '@mazemasterjs/shared-library/Game';
import { logDebug } from '../funcs';
import Maze from '@mazemasterjs/shared-library/Maze';

export function doLook(game: Game): IAction {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];

  const maze: Maze = new Maze(game.Maze);
  console.log(maze.generateTextRender(true, game.Player.Location));

  engram.sight = 'You see exits: ' + cell.listExits();
  engram.smell = 'You smell nothing.';
  engram.touch = 'You feel nothing.';
  engram.taste = 'You Taste nothing.';
  engram.sound = 'You hear nothing.';
  action.engram = engram;

  if (cell.Location.equals(game.Maze.StartCell)) {
    action.outcomes.push('You look around and see exits: ' + cell.listExits());
    action.outcomes.push('There is lava to the North.');
  }
  return action;
}
