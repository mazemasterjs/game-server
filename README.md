# game-server

MazeMasterJS Game Server

# shared-library

The MazeMasterJS Game Server provides the API that creates and manages games.

## API Documentation

- get: '/game/count' - Returns a count of games currently in memory
- get: '/game/get' - Returns a list all games currently in memory (stubbed data)
- get: '/game/:gameId' - Returns the full game object for the matching gameId
- put: '/game/new/:mazeId/:teamId' - Creates a new, multiplayer team game in the given maze
- put: '/game/new/:mazeId/:teamId/:botId' - Creates a new, single-player bot game in the given maze
- put: '/game/action' - Send an action command to an active game, returns action results.
  - Requires req.body with at least a gameId and a command
    - COMMANDS: _look_, _move_, _stand_, jump (pending), sit (pending), stand, write (pending), quit (pending)
    - DIRECTIONS: north, south, east, west
      - req.body samples:
        - `{ "gameId": "<GAME-UUID>", "command": "move", "direction": "north" }`
        - `{ "gameId": "<GAME-UUID>", "command": "look", "direction": "" }`
        - `{ "gameId": "<GAME-UUID>", "command": "look", "direction": "north" }`
        - `{ "gameId": "<GAME-UUID>", "command": "move", "direction": "south" }`
        - `{ "gameId": "<GAME-UUID>", "command": "stand", "direction": "" }`
- delete: '/game/abandon/:gameId' - Marks a game as abandoned, allowing that team/bot to start a new game

## TODO

- [ ] All language files are loaded on GameLang instantiation - This should be changed to load language files on demand
- [x] Adjust values for the various engrams, current they are all based on distance
- [x] Prevent changes to the maze are permanent until the cache is refreshed or server is restarted
- [x] Deadfall traps block every exit, instead of only 1
- [x] Fix Action scores / trophies not being returned with the actual action response
- [x] Add logic to automatically end games after a certain period of inactivity (set GAMES_STATES.ABANDONED)
- [x] When a character turns walls are detected where there should not be
- [x] Peripheral vision is seeing more cells further than it should be
- [x] Fragile Floor traps are persistent between mazes
- [x] Implement the rest of the engram senses for monsters
- [ ] Monster wanders randomly instead of following walls
- [x] Monster deaths needs to use the apropriate GAME_RESULT

## Change Notes

### v1.0.4

- cohesionScores now maps to action.botCohesion (when provided)

### v1.0.3

- hacked playerLoc into return data to support playback
- added /getFull endpoint that returns entire action list from completed game

### v1.0.2

- added awaits to finishGame - win-state trophies now return with final action

### v1.0.1

- checkTraps() on jumpNext() was not ending game properly due to being out of sync.
- Traps offer hints on how to avoid them
- Empty string in the engram.message constructor is replaced with the messages in a cell, if any

### v0.11.5

- added facing command

### v0.11.4

- Fixed game-ending bug for FLAMETHROWER trap by adding await to actMove.ts:61 -> **await** fns.trapCheck(game, langCode, true);
- Added a couple of debug log lines

### v0.11.3

- life is now tracted in game.actions
- added trophies to various functions
- the cat now only spawns if the maze challenge difficulty is 6 or higher
- deadfall traps now give a message in outcomes

### v0.11.2

- actSmell.doSmellDirected will now only update the smell strength if the next instance of the same scent is more smelly (which should never happen?)
- Replaced tripwire messages with laser grid messages ('tripwire' made people think jumping should work)

### v0.11.1

- Cleaned up some smells SonarQube identified

### v0.11.0

- Monster now emits all engram senses
- Flamethrowers no longer trigger even if you jump away from the tripwire
- The cat must be avoided by sneaking past, jumping over, or waiting for it to move on
- Wait command added

### v0.10.0

- poison dart traps now show a more descriptive outcome
- a cat is inserted into the maze at the finish cell on the first turn
- the cat will wander through the maze

### v0.9.11

- engram calculaton is fixed, it is now properly a ratio based on the intensity, distance, and max distance of the sense
- engram senses range from 0-10 for feeling, smell, and taste while hearing is 0.0-1.0
- mazes are deepcloned at the start of a game, at the end of a game the maze is changed to the cached maze
- jumping now uses better outcomes

### v0.9.10

- flamethrower tripwires now trigger if you attempt to jump over them or move forward without sneaking
- non-sight engrams are a number from 1 to 10. 1 is farthest distance to sense, 10 is cell next to the source.
- traps that change the maze are pushed to changedCells when changed

### v0.9.9

- Added RBAC to routes

### v0.9.8

- fixed issue with userAuth - cached credentials are now validated on every request

### v0.9.7

- all engrams and outcomes now use the language file
- fixes for engram sense intensity calculation in feeling

### v0.9.6

- /cache/dump no longer aborts if log level is below debug
- fixed bug in game/get preventing return of game stubs list

### v0.9.5

- Fixed 32 weird conditions that looked like if (someVal === true && !(someValue === false))

### v0.9.4

- Updated shared-library (removeExit bug fix) and updated calls to Maze.removeExit() to use new signature

### v0.9.3

- poison traps are now active
- players have 100 life, poison reduces life at 3 per round.
- various other changes

### v0.9.2

- updated for shared-library 1.12.3's get/remove exit changes and additional command (SNEAK)

### v0.9.1

- fixed the changes to the maze due to traps being persistant between different games
- deadfall trap only no longer traps the player into a single unescapable cell
- docs added to various functions

### v0.9.0

- embedded basic-auth security now working
- createGame and getGame now return actionResults on game start/resume (just like processAction does)
- finalizeAction signature changed to accept a move count (and removal of optional "freeAction" param): finalizeAction(game, actionMoveCount startScore, langCode)
- added framework for trap triggers
- following traps are active: pit, tarpit, teleport, flamethrower, fragile floor, and mousetrap
- fixed descriptions for traps in the language files

### v0.8.2

- players cannot move or jump while stunned
- fixed retrival of trap information from language files

### v0.8.1

- all actions now return gameStub
- create / get game now consistent
- all responses are now consistently returning data to support bot-editor / running games
- updated en.json to camelCase outcome string identifiers
- honey badgers are pretty awesome.

### v0.8.0

- added write and jump commands
- outcomes now utilize the language file system
- various messages in move and look now utilize the language file system

### v0.7.2

- engram senses are all working
- engram.here lists exits, and any messages on the ground

### v0.7.1

- rebuild hearing and smell based on the new engrams
- you only smell the closest scent of a kind
- smelling tells which direction through the maze from the players position the smell is coming from
- hearing tells directly which direction a sound is coming from

### v0.7.0

- engrams, doLook, doLookLocal, doTurn, outcomes... lots and lots of updates!

### v0.6.10

- engrams based on cardinal directions

### v0.6.9

- sight converted to arrays

### v0.6.8

- fixed distance calculation for smells
- looking towards the entrance or exit returns the apporpriate engram instead of outputting as if the direction was open
- fixed distance calculation for hearing

### v0.6.7

- Looking and Smelling now returns a string in a JSON compatible format

### v0.6.6

- Added hearing
- direction, and distance to the target being heard

### v0.6.5

- Changes trophies
- Updated maze libary
- Changes to support shared library 1.9.5

### v0.6.4

- smelling the maze when the player stands or moves

### v0.6.3

- added basis for other engram senses

### v0.6.2

- characters look forward in the direction the are facing, and one cell in their peripheral vision, and darkness behind them

### v0.6.1

- characters vision is limited by darkness sight intensity in engram.json
- characters can see traps from a distance depending on the traps sight intensity

### v0.6.0

- player characters now have a facing direction
- player characters can now see forward indefinately until a wall gets in the way
- player characters can now change the cardinal direction they are facing (no relative turning yet!)

### v0.5.1

- had to replace all reference vars to game.action with game.Actions[game.Actions.length - 1] ... very annoying.
- added async handling to actStand.ts
- funcs.grantTrophy() now pushes an error message to the outcomes array if the trophy was not found
- corrected promise rejection handling in Cache.use().fetchOrGetItem()
- refactored the language support features
  - moved es.ts and en.ts data into /data/es.json and /data/en.json
  - refactored the iLanguage.ts and languageIndex.ts into a GameLang class and moved it to /src
  - language-specific values loaded on GameLang's first .getInstance()
  - Currently, all language files are loaded at once - this should probably be changed to an on-demand system
- moved MoveCount and action.MoveCount remove movePlayer() to finalizeAction()

### v0.5.0

- Implemented the framework for multiple language support

### v0.4.1

- Fixed issue with /game/new where non-forced game IDs were returning undefined. Reported by Derald: https://trello.com/c/TcGnMxNa

### v0.4.0

- added support for COMMANDS.STAND
- refactored some mega-functions
- added scoring and trophy support for basic actions
- players can now walk into walls, attempt to move while sitting, and stand up
- sub-score and trophies now tracked in each action (as well as game.Score total) to allow playback to show visual indicators of score changes and trophy awards

### v0.3.0

- Routes added: /count, /get, /get:gameId, /new/:mazeId/:teamId, /new/:mazeId/:teamId/:botId, /action, /abandon/:gameId
- Starting a new game will fail if the team (multi-player) or bot (single-player) already have an active game in memory
- Added prune function that checks utilization level when a new entry is added. If utilization is > 95% (env.CACHE_PRUNE_TRIGGER_PERCENT), low-value items will be evicted until cache has desired space (env.CACHE_FREE_TARGET_PERCENT)
- Cache.fetchOrGet() function added - first attempts to pull from cache, then then from the service backing the cache. Note: For non-persisted object types (just Game, at the moment) objects, use Cache.fetchItem()

### v0.2.0

- Cache prioritization in place - cache elements are given a value based on hit count and last access time
- Caches sort elements on value when full, evicting least-value element if room is needed

### v0.1.0

- Basic express server shell created
- Simple FIFO caches for Game, Team, Score, Trophy, and Maze data in place
