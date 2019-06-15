import { DIRS, GAME_RESULTS, GAME_STATES, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import * as fns from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Game } from '@mazemasterjs/shared-library/Game';
import { logDebug } from '../funcs';
import Maze from '@mazemasterjs/shared-library/Maze';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import Config from '../Config';
import Ilanguage from 'src/lang/Ilanguage';

// need a config object for some of this
const config: Config = Config.getInstance();

export async function doMove(game: Game, language: Ilanguage): Promise<IAction> {
  const method = `doMove(${game.Id})`;
  const action: IAction = game.Actions[game.Actions.length - 1];
  const engram: Engram = action.engram;
  const dir: DIRS = action.direction;
  const maze: Maze = new Maze(game.Maze);
  const messages =  language.getInstance().messages;
  // grab the current score so we can update action with points earned
  // or lost during this move
  const preMoveScore = game.Score.getTotalScore();

  // seems that that embedded objects reliable... have to keep reinstantiating things??
  const pLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);

  // first make sure the player can move at all
  if (!(game.Player.State & PLAYER_STATES.STANDING)) {
    fns.logDebug(__filename, method, 'Player tried to move while not standing.');

    // increment move counters
    game.Score.addMove();
    action.moveCount++;

    // add the trophy for walking without standing
    fns.grantTrophy(game, TROPHY_IDS.SPINNING_YOUR_WHEELS);
    action.outcomes.push(messages.actions.outcome.move.sitting);
    return Promise.resolve(action);
  }

  // now check for start/finish cell win & lose conditions
  if (maze.getCell(pLoc).isDirOpen(dir)) {
    if (dir === DIRS.NORTH && pLoc.equals(game.Maze.StartCell)) {
      fns.logDebug(__filename, method, 'Player moved north into the entrance (lava).');
      engram.sight = messages.actions.engramDescriptions.sight.local.lava;
      engram.smell = messages.actions.engramDescriptions.smell.local.lava;
      engram.touch = messages.actions.engramDescriptions.touch.local.lava;
      engram.taste = messages.actions.engramDescriptions.taste.local.lava;
      engram.sound = messages.actions.engramDescriptions.sound.local.lava;
      action.outcomes.push(messages.actions.outcome.lava);
      finishGame(game, action, GAME_RESULTS.DEATH_LAVA);
    } else if (dir === DIRS.SOUTH && pLoc.equals(game.Maze.FinishCell)) {
      fns.logDebug(__filename, method, 'Player moved south into the exit (cheese).');
      engram.sight = 'Cheese!';
      engram.smell = 'Cheese!';
      engram.touch = 'Cheese!';
      engram.taste = 'Cheese!';
      engram.sound = 'Cheese!';
      action.outcomes.push(messages.actions.outcome.finish);
      action.outcomes.push('WINNER WINNER, CHEDDAR DINNER!');
      if (game.Score.MoveCount <= game.Maze.ShortestPathLength) {
        finishGame(game, action, GAME_RESULTS.WIN_FLAWLESS);
      } else {
        finishGame(game, action, GAME_RESULTS.WIN);
      }
    } else {
      game = fns.movePlayer(game, action);
    }
  } else {
    // they tried to walk in a direction that has a wall - no special penalties
    game.Score.addMove();
    action.moveCount++;

    // but they do get a trophy
    fns.grantTrophy(game, TROPHY_IDS.YOU_FOUGHT_THE_WALL);
    action.outcomes.push(messages.actions.outcome.wall.collide);
  }

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preMoveScore;

  // TODO: Remove summarize from every - here now for debug purposes
  fns.summarizeGame(action, game.Score);
  console.log(maze.generateTextRender(true, game.Player.Location));
  return Promise.resolve(action);
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
async function finishGame(game: Game, lastAct: IAction, gameResult: GAME_RESULTS): Promise<Game> {
  const method = `finishGame(${game.Id}, ${GAME_RESULTS[gameResult]})`;

  // update the basic game state & result fields
  game.State = GAME_STATES.FINISHED;
  game.Score.GameResult = gameResult;

  switch (gameResult) {
    case GAME_RESULTS.WIN_FLAWLESS: {
      // add bonus WIN_FLAWLESS if the game was perfect
      // there is no break here on purpose - flawless winner also gets a CHEDDAR_DINNER
      await fns
        .grantTrophy(game, TROPHY_IDS.FLAWLESS_VICTORY)
        .then(() => {
          fns.logDebug(__filename, method, 'FLAWLESS_VICTORY awarded to score for game ' + game.Id);
        })
        .catch(trophyErr => {
          fns.logWarn(__filename, method, 'Unable to add FLAWLESS_VICTORY trophy to score. Error -> ' + trophyErr);
        });
    }
    case GAME_RESULTS.WIN: {
      await fns
        .grantTrophy(game, TROPHY_IDS.CHEDDAR_DINNER)
        .then(() => {
          fns.logDebug(__filename, method, 'CHEDDAR_DINNER awarded to score for game ' + game.Id);
        })
        .catch(trophyErr => {
          fns.logWarn(__filename, method, 'Unable to add CHEDDAR_DINNER trophy to score. Error -> ' + trophyErr);
        });
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
  fns.summarizeGame(lastAct, game.Score);
  logDebug(__filename, method, `Game Over. Game Result: [${GAME_RESULTS[gameResult]}] Final Outcomes:\r\n + ${lastAct.outcomes.join('\r\n')}`);

  // save the game's score
  saveScore(game);

  // Append a timestamp to any game.Id starting with the word 'FORCED' so the original IDs can
  // be re-used - very handy for testing and development
  if (game.Id.startsWith('FORCED')) {
    game.forceSetId(`${game.Id}__${Date.now()}`);
  }

  return Promise.resolve(game);
}
