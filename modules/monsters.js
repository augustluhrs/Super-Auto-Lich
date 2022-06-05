class Monster {
  constructor(stats){
      this.asset = stats.asset; //p5 image variable
      this.assetSize = stats.assetSize || 80; //relative size, used for stat positioning
      this.name = stats.name; //monster name
      this.cr = stats.cr; //tier / challenge rating
      this.level = stats.level || 1; //monster level
      this.nextLevel = stats.nextLevel || 2; //num of upgrades needed to level
      this.power = stats.power; //attack power
      this.hp = stats.hp; //hit points
      this.item = stats.item || "nothing"; //item it is using
      this.ability = stats.ability; //ability
      this.timing = stats.timing; //when does ability trigger
      this.index = stats.index; //unchanging index of party
      this.slot = stats.slot; //its place in line (x,y val based on current index)   
  }
}

class Beholder extends Monster {
  constructor(stats){
    super(stats);
    this.name = "beholder";
    this.power = 5;
    this.hp = 3;
  }
}

class Bulette extends Monster {
  constructor(stats){
    super(stats);
    this.name = "bulette";
    this.power = 3;
    this.hp = 3;
  }
}

class Skeleton extends Monster {
  constructor(stats){
    super(stats);
    this.name = "skeleton";
    this.power = 1;
    this.hp = 2;
  }
}

let monsters = [
  Beholder,
  Bulette,
  Skeleton
]

module.exports.monsters = monsters;
module.exports.Monster = Monster;