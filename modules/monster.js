// class Monster {
//     constructor(stats){
//         this.asset = stats.asset; //p5 image variable
//         this.assetSize = stats.assetSize || 80; //relative size, used for stat positioning
//         this.name = stats.name; //monster name
//         this.cr = stats.cr; //tier / challenge rating
//         this.level = stats.level || 1; //monster level
//         this.nextLevel = stats.nextLevel || 2; //num of upgrades needed to level
//         this.power = stats.power; //attack power
//         this.hp = stats.hp; //hit points
//         this.item = stats.item || "nothing"; //item it is using
//         this.ability = stats.ability; //ability
//         this.timing = stats.timing; //when does ability trigger
//         this.index = stats.index; //unchanging index of party
//         this.slot = stats.slot; //its place in line (x,y val based on current index)   
//     }

//     show(isMyParty){
//         push();
//         let x = this.slot.x;
//         let y = this.slot.y;
//         let size = this.assetSize;
//         let xOffset = (2 * size / 5);
//         let yOffset = (3 * size / 4);
//         let statSize = size / 3;

//         //annoying, need more elegant solution to flipping images and text
//         if (!isMyParty) {
//             //x = -x;
//             push();
//             scale(-1, 1);
//             image(this.asset, x, y, size, size);
//             pop();
//             x = -x;
//         } else {
//             image(this.asset, x, y, size, size);
//         }

//         let powerX = x - xOffset;
//         let hpX = x + xOffset;
//         let statY = y + yOffset;

//         //asset
//         strokeWeight(2);
//         stroke(0);
//         textSize(5 * statSize / 6);
//         //power
//         fill(100);
//         rect(powerX, statY, statSize); 
//         fill(255);
//         text(this.power, powerX, statY);
//         //hp
//         fill(200, 0, 0);
//         rect(hpX, statY, statSize);
//         fill(255);
//         text(this.hp, hpX, statY);

//         pop();
//     }
// }

// module.exports = Monster;