class Monster {
  constructor(stats){
    // if (stats instanceof Monster){
    //   this = s
    // } else {
      //this.asset = stats.asset; //p5 image variable
      // this.assetSize = stats.assetSize || 80; //relative size, used for stat positioning
      this.name = stats.name; //monster name
      this.tier = stats.tier; //tier / challenge rating
      this.level = stats.level || 1; //monster level
      this.nextLevel = stats.nextLevel || 3; //num of upgrades/xp needed to level
      this.xp = stats.xp || 0; //num of upgrades done so far
      this.power = stats.power; //attack power
      this.hp = stats.hp; //hit points
      this.currentPower = stats.power; //adjusted during battle
      this.currentHP = stats.hp; //adjusted during battle
      this.item = stats.item || "nothing"; //item it is using
      this.ability = stats.ability; //ability
      this.timing = stats.timing; //when does ability trigger
      this.index = stats.index; //unchanging index of party
      this.isFrozen = stats.isFrozen || false; //is frozen hire?
      //this.slot = stats.slot; //its place in line (x,y val based on current index)   
    // }
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