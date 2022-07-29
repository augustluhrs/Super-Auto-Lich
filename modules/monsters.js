function generate_ID() { //grabbed from https://gist.github.com/gordonbrander/2230317 -- thanks!
  return '_' + Math.random().toString(36).substr(2, 9);
}

class Monster {
  constructor(stats){
      this.name = stats.name; //monster name
      this.tier = stats.tier; //tier / challenge rating
      this.level = stats.level || 1; //monster level
      this.nextLevel = stats.nextLevel || 3; //num of upgrades/xp needed to level
      this.xp = stats.xp || 0; //num of upgrades done so far
      this.power = stats.power; //attack power
      this.hp = stats.hp; //hit points
      this.currentPower = stats.currentPower; //adjusted during battle
      this.currentHP = stats.currentHP; //adjusted during battle
      this.item = stats.item || "nothing"; //item it is using
      this.currentItem = stats.currentItem || "nothing"; //item it has in battle
      this.ability = stats.ability; //ability
      this.abilityText = stats.abilityText; //ability text for hover display
      this.timing = stats.timing; //when does ability trigger
      this.index = stats.index; //unchanging index of party
      this.isFrozen = stats.isFrozen || false; //is frozen hire?
      this.isDamaged = stats.isDamaged || false; //for damage animation
      this.isDead = stats.isDead || false; //for death animation
      this.id = stats.id || generate_ID(); //to find specific monsters...
      this.lichID = stats.lichID || null; //stores owner's socket.id in case it gets separated
      this.isNullified = stats.isNullified || false; //for now, tracking if flumph cancels ability TODO, just remove .ability?
      this.isSleeping = stats.isSleeping || false; //for hibernating or any effect that prevents attack?
      this.vulnerability = stats.vulnerability || 0; //some abilities and items can make more vulnerable than others
      this.hasAttacked = stats.hasAttacked || false; //to confirm attacks for abilities triggering off attack
      this.hasKilled = stats.hasKilled || false; //to confirm deaths for abilities triggering off kills
    }
}

class Beholder extends Monster {
  constructor(stats){
    super(stats);
    this.name = "beholder";
    this.tier = 5;
    this.power = 5;
    this.hp = 3;
    this.currentPower = 5;
    this.currentHP = 3;
    this.ability = null;
    this.timing = null;
    this.abilityText = "";
  }
}

class Bulette extends Monster {
  constructor(stats){
    super(stats);
    this.name = "bulette";
    this.tier = 4;
    this.power = 3;
    this.hp = 3;
    this.currentPower = 3;
    this.currentHP = 3;
    this.ability = null;
    this.timing = null;
    this.abilityText = "";
  }
}

class Cavebear extends Monster {
  constructor(stats){
    super(stats);
    this.name = "cavebear";
    this.tier = 1;
    this.power = 1;
    this.hp = 3;
    this.currentPower = 1;
    this.currentHP = 3;
    this.ability = null;
    this.timing = "before start";
    this.abilityText = "Hibernation: At the start of combat, goes to sleep and increases its HP by (50%/100%,150%). Cannot attack while asleep, but wakes up after sleeping through one attack round or taking damage.";
  }
}

class Flumph extends Monster {
  constructor(stats){
    super(stats);
    this.name = "flumph";
    this.tier = 1;
    this.power = 0;
    this.hp = 1;
    this.currentPower = 0;
    this.currentHP = 1;
    this.ability = null;
    this.timing = "after death";
    this.abilityText = "Telepathic Shroud: On death, nullfies the abilites of the next (1/2/3) live monsters in the enemy party.";
  }
}

class Gnoll extends Monster {
  constructor(stats){
    super(stats);
    this.name = "gnoll";
    this.tier = 1;
    this.power = 3;
    this.hp = 1;
    this.currentPower = 3;
    this.currentHP = 1;
    this.ability = null;
    this.timing = "after attack";
    this.abilityText = "Rampage: After attack, if the attacked enemy dies, the gnoll immediately attacks (1/2/3) more times, with each attack targeting the first live enemy monster in line.";
  }
}

class Goblin extends Monster {
  constructor(stats){
    super(stats);
    this.name = "goblin";
    this.tier = 1;
    this.power = 2;
    this.hp = 1;
    this.currentPower = 2;
    this.currentHP = 1;
    this.ability = null;
    this.timing = "before attack";
    this.abilityText = "Nimbleness: Before attack, has a (20%/40%/60%) chance to dodge the enemy's attack and get a free attack.";
  }
}

class Kobold extends Monster {
  constructor(stats){
    super(stats);
    this.name = "kobold";
    this.tier = 1;
    this.power = 1;
    this.hp = 1;
    this.currentPower = 1;
    this.currentHP = 1;
    this.ability = null;
    this.timing = "before start";
    this.abilityText = "Pack Tactics: At the beginning of combat, if you have more than one kobold, each gains (+X/+X*2/+X*3) power and HP, where X is the total number of kobolds in your party.";
  }
}

class Mephit extends Monster {
  constructor(stats){
    super(stats);
    this.name = "mephit";
    this.tier = 1;
    this.power = 2;
    this.hp = 2;
    this.currentPower = 2;
    this.currentHP = 2;
    this.ability = null;
    this.timing = "after death";
    this.abilityText = "Death Burst: On death, deals (2/4/6) damage to the two live monsters to the left and right of it.";
  }
}

class Skeleton extends Monster {
  constructor(stats){
    super(stats);
    this.name = "skeleton";
    this.tier = 1;
    this.power = 1;
    this.hp = 2;
    this.currentPower = 1;
    this.currentHP = 2;
    this.ability = null;
    this.timing = "after death";
    this.spawnChance = 1;
    this.abilityText = "Undead Fortitude: On death, has a chance to come back as a (1/1, 2/2, 3/3). Has a 100% chance the first resurrection, chance decreases by (50%/33%/25%) each successful resurrection.";
  }
}

class Stirge extends Monster {
  constructor(stats){
    super(stats);
    this.name = "stirge";
    this.tier = 1;
    this.power = 1;
    this.hp = 2;
    this.currentPower = 1;
    this.currentHP = 2;
    this.ability = null;
    this.timing = "after attack";
    this.abilityText = "Blood Drain: On attack, if the stirge survives, it heals (1/2/3) points of HP.";
  }
}

class Vegepygmy extends Monster {
  constructor(stats){
    super(stats);
    this.name = "vegepygmy";
    this.tier = 1;
    this.power = 1;
    this.hp = 1;
    this.currentPower = 1;
    this.currentHP = 1;
    this.ability = null;
    this.timing = "after death";
    this.abilityText = "Spores: On death, infects the next live enemy monster with spores that replace the monster's item and make it take more damage from subsequent attacks (+3/+5/+7 damage).";
  }
}

let monsters = [ //arrays of tiers for random selection
  [Cavebear, Flumph, Gnoll, Goblin, Kobold, Mephit, Skeleton, Stirge, Vegepygmy],
  [ ],
  [ ],
  [Bulette, ],
  [Beholder, ],
  [ ],
]

module.exports.monsters = monsters;
module.exports.Monster = Monster;