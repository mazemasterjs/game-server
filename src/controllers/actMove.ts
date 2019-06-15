import * as fns from '../funcs';
import { Config } from '../Config';
import { DIRS, GAME_RESULTS, GAME_STATES, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { logDebug } from '../funcs';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { MazeLoc } from '@mazemasterjs/shared-library/MazeLoc';
import { GameLang } from '../GameLang';

// need a config object for some of this
const config: Config = Config.getInstance();

export async function doMove(game: Game, langCode: string): Promise<IAction> {
  const method = `doMove(${game.Id})`;
  const engram: Engram = game.Actions[game.Actions.length - 1].engram;
  const dir: DIRS = game.Actions[game.Actions.length - 1].direction;
  const maze: Maze = new Maze(game.Maze);
  const lang = GameLang.getInstance(langCode);

  // grab the current score so we can update action with points earned or lost during this move
  const startScore = game.Score.getTotalScore();

  // seems that that embedded objects reliable... have to keep reinstantiating things??
  const pLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);

  // first make sure the player can move at all
  if (!(game.Player.State & PLAYER_STATES.STANDING)) {
    fns.logDebug(__filename, method, 'Player tried to move while not standing.');

    // add the trophy for walking without standing
    game = await fns.grantTrophy(game, TROPHY_IDS.SPINNING_YOUR_WHEELS);

    game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.outcome.move.sitting);

    // finalize and return action
    const finalAction = fns.finalizeAction(game, maze, startScore);
    game.Actions[game.Actions.length - 1] = finalAction;
    return Promise.resolve(finalAction);
  }

  // now check for start/finish cell win & lose conditions
  if (maze.getCell(pLoc).isDirOpen(dir)) {
    if (dir === DIRS.NORTH && pLoc.equals(game.Maze.StartCell)) {
      fns.logDebug(__filename, method, 'Player moved north into the entrance (lava).');
      engram.sight = lang.actions.engramDescriptions.sight.local.lava;
      engram.smell = lang.actions.engramDescriptions.smell.local.lava;
      engram.touch = lang.actions.engramDescriptions.touch.local.lava;
      engram.taste = lang.actions.engramDescriptions.taste.local.lava;
      engram.sound = lang.actions.engramDescriptions.sound.local.lava;
      game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.outcome.lava);
      finishGame(game, GAME_RESULTS.DEATH_LAVA);
    } else if (dir === DIRS.SOUTH && pLoc.equals(game.Maze.FinishCell)) {
      fns.logDebug(__filename, method, 'Player moved south into the exit (cheese).');
      engram.sight = 'Cheese!';
      engram.smell = 'Cheese!';
      engram.touch = 'Cheese!';
      engram.taste = 'Cheese!';
      engram.sound = 'Cheese!';
      game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.outcome.finish);

      // game over: WINNER or WIN_FLAWLESS
      if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
        finishGame(game, GAME_RESULTS.WIN_FLAWLESS);
      } else {
        finishGame(game, GAME_RESULTS.WIN);
      }
    } else {
      game = fns.movePlayer(game, game.Actions[game.Actions.length - 1]);
    }
  } else {
    // they tried to walk in a direction that has a wall
    game = await fns.grantTrophy(game, TROPHY_IDS.YOU_FOUGHT_THE_WALL);

    game.Player.addState(PLAYER_STATES.SITTING);

    engram.sight = format(lang.actions.engramDescriptions.sight.local.wall, DIRS[dir]); // `You get a very close up view of the wall to the ${DIRS[dir]}.`;
    engram.touch = lang.actions.engramDescriptions.touch.local.wall;
    engram.sound = lang.actions.engramDescriptions.sound.local.wall;

    game.Actions[game.Actions.length - 1].outcomes.push(format(lang.actions.outcome.wall.collide, DIRS[dir]));
    game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.posture.stunned);
  }

  // game continues - return the action (with outcomes and engram)
  return Promise.resolve(fns.finalizeAction(game, maze, startScore));
}

/**
 * Attempts to call the score service to save a game score in the
 * database's scores collection
 *
 * @param game
 */
async function saveScore(game: Game): Promise<boolean> {
  const method = `saveScore(${game.Id})`;

  // Store Score Data
  return await fns
    .doPut(config.SERVICE_SCORE + '/insert', game.Score)
    .then(result => {
      if (parseInt(result.insertedCount, 10) !== 1) {
        fns.logWarn(__filename, method, `insertedCount=${result.insertedCount} - Score did not save successfully.`);
      } else {
        fns.logDebug(__filename, method, 'Score saved.');
      }
      return Promise.resolve(true);
    })
    .catch(putError => {
      fns.logError(__filename, method, 'Error saving Score ->', putError);
      return Promise.reject(putError);
    });
}

/**
 *
 * @param game
 * @param lastAct
 * @param gameResult
 * @returns Promise<Game>
 */
async function finishGame(game: Game, gameResult: GAME_RESULTS): Promise<Game> {
  const method = `finishGame(${game.Id}, ${GAME_RESULTS[gameResult]})`;

  // update the basic game state & result fields
  game.State = GAME_STATES.FINISHED;
  game.Score.GameResult = gameResult;

  switch (gameResult) {
    case GAME_RESULTS.WIN_FLAWLESS: {
      // add bonus WIN_FLAWLESS if the game was perfect
      // there is no break here on purpose - flawless winner also gets a CHEDDAR_DINNER
      game = await fns.grantTrophy(game, TROPHY_IDS.FLAWLESS_VICTORY);
    }
    case GAME_RESULTS.WIN: {
      fns.grantTrophy(game, TROPHY_IDS.CHEDDAR_DINNER);
      break;
    }
    case GAME_RESULTS.DEATH_LAVA: {
      await fns
        .grantTrophy(game, TROPHY_IDS.TOO_HOT_TO_HANDLE)
        .then(() => {
          fns.logDebug(__filename, method, 'TOO_HOT_TO_HANDLE awarded to score for game ' + game.Id);
        })
        .catch(trophyErr => {
          fns.logWarn(__filename, method, 'Unable to add TOO_HOT_TO_HANDLE trophy to score. Error -> ' + trophyErr);
        });
      break;
    }
    case GAME_RESULTS.OUT_OF_MOVES: {
      await fns
        .grantTrophy(game, TROPHY_IDS.OUT_OF_MOVES)
        .then(() => {
          fns.logDebug(__filename, method, 'OUT_OF_MOVES awarded to score for game ' + game.Id);
        })
        .catch(trophyErr => {
          fns.logWarn(__filename, method, 'Unable to add OUT_OF_MOVES trophy to score. Error -> ' + trophyErr);
        });
      break;
    }
    case GAME_RESULTS.DEATH_POISON:
    case GAME_RESULTS.DEATH_TRAP:
    case GAME_RESULTS.OUT_OF_TIME:
    default: {
      fns.logDebug(__dirname, method, `GAME_RESULT not implemented: ${GAME_RESULTS[gameResult]}`);
    }
  }

  // Summarize and log game result
  fns.summarizeGame(game.Actions[game.Actions.length - 1], game.Score);
  logDebug(
    __filename,
    method,
    `Game Over. Game Result: [${GAME_RESULTS[gameResult]}] Final Outcomes:\r\n + ${game.Actions[game.Actions.length - 1].outcomes.join('\r\n')}`,
  );

  // save the game's score
  saveScore(game);

  // Append a timestamp to any game.Id starting with the word 'FORCED' so the original IDs can
  // be re-used - very handy for testing and development
  if (game.Id.startsWith('FORCED')) {
    const oldGameId = game.Id;
    const newGameId = `${game.Id}__${Date.now()}`;
    game.forceSetId(newGameId);
    fns.logWarn(__filename, method, `Forced Game.Id changed from [${oldGameId}] to [${newGameId}]`);
  }

  return Promise.resolve(game);
}
