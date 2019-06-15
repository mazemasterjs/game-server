import Ilanguage from "./Ilanguage";

export class es extends Ilanguage{
    /**
   * Instantiate and/or returns class instance
   */
  public myInstance(){
      return es.getInstance();
  }
  public static getInstance(): es {
    if (this.instance === undefined) {
      this.instance = new es();
    }

    return this.instance;
  }

  // singleton instance reference
  private static instance: es;

  public readonly messages = {
    "language" : "en",
    "actions" : {
        "nullMotions" : ["You dance like nobody is watching, but you feel silly anyway.",
            "You wiggle around like a worm on a hook.",
            "You try to moonwalk your way out of the room, but you end up just walking in place... Backwards.",
            "You start to leave the room, but forget which way you were going so you just stand there feeling confused.",
            "You have no idea where you're going and, in your confusion, you trip over your own feet and fall to the ground."],
        "nullJumps" : ["You jump up and down excitedly, but go nowhere.",
            "You do some jumping jacks.  Is this really the best time to work on your cardio?",
            "You try to see if you can jump high enough to touch the ceiling. Nope. Not even close.",
            "You jump around. Jump around. Jump up, jump up, and get down.",
            "You decide to try to do a back flip and fail miserably, landing in a heap on the floor."],
        "engrams" : {
            "touch": "feel",
            "sight" : "see",
            "sound" : "hear",
            "smell" : "smell",
            "taste" : "taste"
        },
        "engramDescriptions" : {
                "touch" :{
                    "local" : { 
                        "stun" : "You feel a numb tingling in your limbs start to fade away as you recover from being stunned.",
                        "lava" : "IT'S LAVA! IT BURNS! THE LAVA IS HOT! OUCH!",
                        "wall" : "You feel the rough stone wall refusing to let you walk through it.",
                        "pit" : "You feel suddenly weightless as you step into the pit.",
                        "fire" : "You feel a blast of incredible heat from below.",
                        "start" : "You feel a dull, threatening warmth coming from the entrance to the north.",
                        "end" : "You feel the cool, clean air of the lab blowing in from the exit to the south."
                    },
                    "ambient" : { 
                    },
                    "distant" : { 
                        "end" : "The cool air of the lab washes over your tired body as you safely exit the maze."
                    },
                    "none" : "You feel nothing but the damp, heavy air around you."
                },
                "sight" :{
                    "local" : { 
                              "exit" : "You see exits to the: ",
                            "entrance" : "You see the entrace to the [%s]. It is slowly filling with lava!",
                            "stun" : "You see the stars in your eyes start to twinkle out as you recover from being stunned.",
                            "lava" : "The last thing you see is the lava.  It's almost pretty up close.",
                            "end" : "The cold, harsh lights of the lab are almost blinding, but you see the shadow of a giant approaching.",
                            "wall" : "You see stars as you crash headlong into the wall to the [%s].",
                            "look" : "You see that you are [%s] in a room with [%s] to the [%s].",
                            "pit" : "There is huge, impossibly deep, impossibly dark pit right under your feet.",
                            "fire" : "Searingly bright yellow-orange gouts of flame shoot up from the floor beneath you."

                        },
                    "ambient" : { 
                        "wall" : "You see a wall to the [%s]",
                        "start" : " A faint, red glow barely illuminates the room.",
                        "finish" : "A faint, cool light barely illuminates the room."

                    },
                    "distant" : {
                        "entrance" : "Further to the north you see the dim, red glow of lava at the maze entrance.",
                        "end" : "Further to the south you see the faint, cool light of the maze exit.",
                        //"pit" : "In the room to the [%s], you see only a dark shadow where the floor should be.",
                        "fire" : "In the room to the [%s], the floor looks slick and wet.",
                        "pit" : "The room has no floor. Literally, there is no floor in there. Just a huge, gaping, pit...",
                        "start" : "The northern part of the room is suffused with a dull, angry-looking red light."


                     }
                },
                "sound" :{
                    "local" : { 
                        "stun" : "You hear the ringing in your ears start to diminish as you recover from being stunned.",
                        "lava" : "The last thing you hear are the echoes of squeaky screams.",
                        "end" : "The cheering and applause of the scientist is so loud that it hurts your ears.",
                        "wall" : "You hear a ringing in your ears after smashing into the wall.",
                        "pit" : "You hear a deep-throated echoing roar of the wind rising from the bottomless pit under your feet.",
                        "fire" : "You hear a click and the sudden whoosh of flames from the floor.",
                        "start" : "You hear the slow cracking and creeping of lava as it fills the entrance to the north."

                    },
                    "ambient" : { 
                        "base" : "You hear [%s] to the [%s]",
                        "start" : "something crackling like fire",
                        "end" : "beeping machines and people talking",
                        "pit" : "a deep, echoing wind",
                        "fire" : "a something quietly, rhythmically clicking and hissing"
                    },
                    "distant" : {
                        "base" : "You hear [%s] in the distance.",
                        "start" : "stony rustling",
                        "end" : "murmuring",
                        "pit" : "an empty-sounding moan",
                        "fire" : "a faint hissing sound"
                     },
                     "none" : {
                         "standing" : "You hear the clicking of your tiny claws on the stone floor.",
                         "sitting" : "You hear nothing but the sound of your own rapid breathing."

                     }
                },
                "smell" :{
                    "local" : { 
                        "stun" : "You smell the dusty air starting to creep back into your battered nose as you recover from being stunned.",
                        "lava" : "The last thing you smell is burning fur.",
                        "end": "Your nose twitches as it's assaulted by the smells of iodine, rubbing alcohol, betadine, and caramel-mocha frappuccino.",
                        "wall" : "You smell blood after smashing your nose against the wall.",
                        "pit" : "You smell deep, cold earth and sharp decay rising from the huge pit you've just fallen into.",
                        "fire" : "You smell the sharp, thick aroma of kerosene rising from a pool of liquid at your feet.",
                        "start" : "You smell the sharp, metallic odor of molten rock coming from door to the [%s]."

                    },
                    "ambient" : { 
                        "base" : "You smell the faint odor of [%]s.",
                        "start" : "something hot, metallic, and burning",
                        "end" : "clean, fresh air",
                        "pit" : "cold earth and decay",
                        "fire" : "kerosene"

                    },
                    "distant" : {
                        "base" : "You smell the barest hint of [%s].",
                        "start" : "something burning",
                        "end" : "slightly less stale air",
                        "pit" : "something dead",
                        "fire" : "some kind of chemical"
                     },
                     "none" : "You smell nothing but the damp stone walls around you."

                },
                "taste" :{
                    "local" : {
                        "stun" : "You taste the bitter regret of having done something foolish as you recover from being stunned.",
                        "lava" : "The last thing you taste is lava. It tastes like chicken.",
                        "end" : "You can already taste the cheese that you know is waiting for you in your cage!",
                        "wall" : "You taste the regret of a wasted turn."

                     },
                    "ambient" : { },
                    "distant" : { }
                }
            },
        "jump" : {
            "start" : "With a running start, you JUMP to the [%s]!  You fly through the next room too quickly to notice anything and prepare to land nimbly in the room beyond.",
            "entrance" : "You turn  [%s] and and take a flying leap back out through maze entrance, apparently forgetting that it's filling with laval. We told you it would be. At least your death is mercifully quick.",
            "pit" : "As you prepare to make a cool, superhero landing, you realize that you're no longer jumping. You're falling. AIEEEEE!!!! Didn't anybody ever tell you to look before you leap?",
            "fire" : "Your beautiful jump should have ended in a beautiful landing, but instead you slipped in a pool of kerosene, landed on the detonator, and blew yourself to smithereens.",
            "land" : "You landed gracefully in the room.",
            "sight" : "You see stars as you leap through the next room and smash into the wall to the [%s].",
            "touch" : "You feel the air rush by as you fly through the room, then pain as you fly into the wall on the other side.",
            "sound" : "You hear the air rushing by as you fly through the room, then only a sharp ringing as you hit the wall.",
            "smell" : "You smell blood after flying through the room and directly into the wall on the other side.  Is your nose broken?",
            "taste" : "You taste blood after biting your tongue when you jumped through the room and into the wall on the other side."
        },
        "wall" :{
            "signt" : ""
        },
        "posture" : {
            "standing" : "standing",
            "sitting" : "sitting",
            "lying" : "lying",
            "stunned" : "stunned"
        },
        "outcome" : {
            "wall" :  {
                "look" : "You state intently at the wall to the [%s] and wonder why you wasted a turn",
                "collide" : "You walked into the wall to the %s. Ouch! The impact knocks you off of your feet."

            },
            "lava" : "You step into the lava and, well... Let's just say: Game over.",
            "entrance" : "You gaze longingly at the entrance to the [%s], wishing you could go out the way you came in from",
            "end" : "The exit! You found it! All you need to do to escape is one more step [%s]...",
            "write" : "You used your tiny claw to scratch '[%s]' onto the floor of the room",
            "writenull" : "You couldn't think of what to write, so you just scratch an 'X' onto the floor",
            "endstun" : "You are sitting on the floor, no longer stunned.",
            "dead" : "YOU HAVE DIED!",
            "jump" : "You JUMPED into the wall to the [%s]. OUCH! The impact rattles your bones and you fall to a heap on the floor, stunned.",
            "finish" : "'You step into the light and find... CHEESE!'",
            "perfect" : "You just had a PERFECT RUN through [%s]! Are your whiskers smoking? Why don't you move on to something harder...",
            "pit" : "As you topple forward into the bottomless pit you just discovered, you realize that you will have a long, long time to regret how little attention you paid to your senses.",
            "fire" : "You walked into a room filled with kerosene and stepped on the igniter. Not the best plan ever, but hey... it probably beats falling for all eternity.",
            "stand" : {
                "standing" : "You are already standing!",
                "sitting" : "You stand up",
                "lying" : "You sit up"
            },
            "move" : {
                "sitting" : "Try standing up before you move.",
                "stunned" : "You can't move, you are stunned!"
            }

        }
        
    },
    "Directions" :{
        "North" : "north",
        "East" : "east",
        "South" : "south",
        "West" : "west"
    },
    "nothing" : "nothing",

    "menu" : {
        "HomePage" : "Home Page",
        "TeamsPage" : "Team Page",
        "MazeList" : "Maze List",
        "ServiceReference" : "Service Reference",
        "GamePlayer" : "Game Player",
        "LanguagePage" : "Language Page",
        "DevelopmentDebugPage" : "Development Debug Page"
    }

}
}

export default es;
