import { Game } from '@mazemasterjs/shared-library/Game';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import { CELL_TAGS, CELL_TRAPS, DIRS, GAME_RESULTS, PLAYER_STATES } from '@mazemasterjs/shared-library/Enums';
import { logDebug } from '../funcs';
import GameLang from '../GameLang';
import * as fns from '../funcs';
import { finishGame } from './actMove';

export function doJump(game: Game, lang: string) {
  const data = GameLang.getInstance(lang);
  if (!!(game.Player.State & PLAYER_STATES.STUNNED)) {
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stunned);
    game.Player.removeState(PLAYER_STATES.STUNNED);
  } else {
    if (!!(game.Player.State & PLAYER_STATES.SITTING)) {
      game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpWhileSitting);
      game.Player.addState(PLAYER_STATES.STANDING);
    } else {
      fns.trapCheck(game, lang, true);
      jumpNext(game, lang, 0);
    }
  }
  const startScore = game.Score.getTotalScore();
  return Promise.resolve(fns.finalizeAction(game, 2, startScore, lang));
}

export function jumpNext(game: Game, lang: string, distance: number) {
  const method = `jumpNext(${game.Id},${lang},${distance})`;
  const cell = game.Maze.getCell(new MazeLoc(game.Player.Location.row, game.Player.Location.col));
  const dir: DIRS = game.Actions[game.Actions.length - 1].direction;
  game.Player.Facing = dir;
  const data = GameLang.getInstance(lang);
  if (distance <= 1) {
    if (cell.isDirOpen(dir)) {
      // Check to see if the player jumped into the entrance or exit...
      if (!!(cell.Tags & CELL_TAGS.START) && dir === DIRS.NORTH) {
        game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpingIntoLava);
        finishGame(game, GAME_RESULTS.DEATH_LAVA);
        return;
      } else if (!!(cell.Tags & CELL_TAGS.FINISH) && dir === DIRS.SOUTH) {
        fns.logDebug(__filename, method, 'Player leaped south into the exit (cheese).');

        game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.win);

        // game over: WINNER or WIN_FLAWLESS
        if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
          finishGame(game, GAME_RESULTS.WIN_FLAWLESS);
        } else {
          finishGame(game, GAME_RESULTS.WIN);
        }
        return;
      }
      // if not, the player moves and it checks the next cell
      fns.movePlayer(game);
      jumpNext(game, lang, distance + 1);
    } else {
      logDebug(__filename, method, 'Player crashed into a wall while jumping');
      game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumpingIntoWall);
      game.Player.addState(PLAYER_STATES.SITTING);
      game.Player.addState(PLAYER_STATES.STUNNED);
    }
  } else {
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.jumping);
    fns.trapCheck(game, lang);
  }
}
