import { Engram } from '@mazemasterjs/shared-library/Engram';
import { IAction } from '@mazemasterjs/shared-library/IAction';
import { Game } from '@mazemasterjs/shared-library/Game';
import { createIAction } from 'src/funcs';

export function doLook(game: Game): Game {
  const engram: Engram = new Engram();
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  engram.Sight = cell.listExits();
  game.Actions[game.Actions.length].engram = engram;

  return game;
}
