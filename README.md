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
- [ ] Add logic to automatically end games after a certain period of inactivity (set GAMES_STATES.ABANDONED)
- [ ] Action scores / trophies are not returned with the actual action response for some reason... working on it (jd)

## Change Notes

### v0.5.1

- added async handling to actStand.ts
- funcs.grantTrophy() now pushes an error message to the outcomes array if the trophy was not found
- corrected promise rejection handling in Cache.use().fetchOrGetItem()
- refactored the language support features
  - moved es.ts and en.ts data into /data/es.json and /data/en.json
  - refactored the iLanguage.ts and languageIndex.ts into a GameLang class and moved it to /src
  - language-specific values loaded on GameLang's first .getInstance()
  - Currently, all language files are loaded at once - this should probably be changed to an on-demand system

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
