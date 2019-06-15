"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Ilanguage {
    constructor() {
        this.messages = {
            "language": "",
            "actions": {
                "nullMotions": ["",
                    "",
                    "",
                    "",
                    "You have no idea where you're going and, in your confusion, you trip over your own feet and fall to the ground."],
                "nullJumps": ["",
                    "",
                    "",
                    "",
                    ""],
                "engrams": {
                    "touch": "",
                    "sight": "",
                    "sound": "",
                    "smell": "",
                    "taste": ""
                },
                "engramDescriptions": {
                    "touch": {
                        "local": {
                            "stun": "",
                            "lava": "",
                            "wall": "",
                            "pit": "",
                            "fire": "",
                            "start": "",
                            "end": ""
                        },
                        "ambient": {},
                        "distant": {
                            "end": ""
                        },
                        "none": ""
                    },
                    "sight": {
                        "local": {
                            "exit": "",
                            "entrance": "",
                            "stun": "",
                            "lava": "",
                            "end": "",
                            "wall": "",
                            "look": "",
                            "pit": "",
                            "fire": ""
                        },
                        "ambient": {
                            "wall": "",
                            "start": "",
                            "finish": ""
                        },
                        "distant": {
                            "entrance": "",
                            "end": "",
                            //"pit" : "",
                            "fire": "",
                            "pit": "",
                            "start": ""
                        }
                    },
                    "sound": {
                        "local": {
                            "stun": "",
                            "lava": "",
                            "end": "",
                            "wall": "",
                            "pit": "",
                            "fire": "",
                            "start": ""
                        },
                        "ambient": {
                            "base": "",
                            "start": "",
                            "end": "",
                            "pit": "",
                            "fire": ""
                        },
                        "distant": {
                            "base": "",
                            "start": "",
                            "end": "",
                            "pit": "",
                            "fire": ""
                        },
                        "none": {
                            "standing": "",
                            "sitting": ""
                        }
                    },
                    "smell": {
                        "local": {
                            "stun": "",
                            "lava": "",
                            "end": "",
                            "wall": "",
                            "pit": "",
                            "fire": "",
                            "start": ""
                        },
                        "ambient": {
                            "base": "",
                            "start": "",
                            "end": "",
                            "pit": "",
                            "fire": ""
                        },
                        "distant": {
                            "base": "",
                            "start": "",
                            "end": "",
                            "pit": "",
                            "fire": ""
                        },
                        "none": ""
                    },
                    "taste": {
                        "local": {
                            "stun": "",
                            "lava": "",
                            "end": "",
                            "wall": ""
                        },
                        "ambient": {},
                        "distant": {}
                    }
                },
                "jump": {
                    "start": "",
                    "entrance": "",
                    "pit": "",
                    "fire": "",
                    "land": "",
                    "sight": "",
                    "touch": "",
                    "sound": "",
                    "smell": "",
                    "taste": ""
                },
                "wall": {
                    "signt": ""
                },
                "posture": {
                    "standing": "",
                    "sitting": "",
                    "lying": "",
                    "stunned": ""
                },
                "outcome": {
                    "wall": {
                        "look": "",
                        "collide": ""
                    },
                    "lava": "",
                    "entrance": "",
                    "end": "",
                    "write": "",
                    "writenull": "",
                    "endstun": "",
                    "dead": "",
                    "jump": "",
                    "finish": "",
                    "perfect": "",
                    "pit": "",
                    "fire": "",
                    "stand": {
                        "standing": "",
                        "sitting": "",
                        "lying": ""
                    },
                    "move": {
                        "sitting": "",
                        "stunned": ""
                    }
                }
            },
            "Directions": {
                "North": "",
                "East": "",
                "South": "",
                "West": ""
            },
            "nothing": "",
            "menu": {
                "HomePage": "",
                "TeamsPage": "",
                "MazeList": "",
                "ServiceReference": "",
                "GamePlayer": "",
                "LanguagePage": "",
                "DevelopmentDebugPage": ""
            }
        };
    }
    getInstance() {
        if (this.instance === undefined) {
            this.instance = new Ilanguage();
        }
        return this.instance;
    }
    ;
    ;
}
exports.Ilanguage = Ilanguage;
exports.default = Ilanguage;
//# sourceMappingURL=Ilanguage.js.map