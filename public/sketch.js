/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/

//
//  ASSET LOAD
//

let monsterAssets = {};
let dice1, dice2, dice3, dice4, dice5, dice6;
let diceAssets = [];
let cavebear, flumph, gnoll, goblin, kobold, mephit, skeleton, stirge, vegepygmy;
let bulette;
let beholder;

function preload() {
  dice1 = loadImage('assets/dice1.png');
  dice2 = loadImage('assets/dice2.png');
  dice3 = loadImage('assets/dice3.png');
  dice4 = loadImage('assets/dice4.png');
  dice5 = loadImage('assets/dice5.png');
  dice6 = loadImage('assets/dice6.png');
  //tier1
  cavebear = loadImage('assets/cavebear.png');
  flumph = loadImage('assets/flumph.png');
  gnoll = loadImage('assets/gnoll.png');
  goblin = loadImage('assets/goblin.png');
  kobold = loadImage('assets/kobold.png');
  mephit = loadImage('assets/mephit.png');
  skeleton = loadImage('assets/skeleton.png');
  stirge = loadImage('assets/stirge.png');
  vegepygmy = loadImage('assets/vegepygmy.png');
  //tier2
  //tier3
  //tier4
  bulette = loadImage('assets/bulette.png');
  //tier5
  beholder = loadImage('assets/beholder.png');
  //tier6
}

//
//  SOCKET SERVER STUFF
//

//open and connect the input socket
let socket = io('/');

//listen for the confirmation of connection 
socket.on('connect', () => {
  console.log('now connected to server');
});

// basic setup on connecting to server or after battle when going back to market
socket.on('goToMarket', (data) => {
  console.log('going to market');
  state = "market";
  gold = data.gold;
  hp = data.hp;
  turn = data.turn;
  hires = data.hires;
  party = data.party; //refreshes after battle
  
  if (doneSetup){
    slots = [{sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys
    refreshButt.show();
    readyButt.show();
    showEverything();
  }
});

// receive parties once both have sent to server
socket.on('initParty', (data, callback) => {
  console.log('init parties');
  party = data.party;
  enemyParty = data.enemyParty;
  showEverything();
});

//get refreshed hires during market
socket.on('newHires', (data) => {
  hires = data.hires;
  slots[1].m = hires;
  gold = data.gold;
  showEverything();
});

//get updated gold after hiring
socket.on('updateGold', (data) => {
  gold = data.gold;
  showEverything();
  //showing ready button here because it's after first hire
  readyButt.show();
});

//if other player isn't ready for battle, show waiting
socket.on("waitingForBattle", () => {
  waitingForBattle = true;
  showEverything();
});

//start battle
socket.on("startBattle", (data) => {
  for (let client of data){
    if (client.id != socket.id){
      enemyParty = client.party;
      console.log("enemyParty");
      console.log(enemyParty);
    } else {
      party = client.party;
      console.log("party");
      console.log(party);
    }
  }
  state = "battle";
  waitingForBattle = false;
  refreshButt.hide();
  readyButt.hide();
  showEverything();
});

// receive info from battle step
socket.on('battleAftermath', (data) => {
  console.log('battle step over');
  for (let client of data){ //just sending battle array
    if (client.id == socket.id){
      party = client.party;
    } else {
      enemyParty = client.party;
    }
  }
  showEverything();
});

// end battle message
socket.on('battleOver', (data) => {
  console.log('battle finished: ' + data.result);
  for (let client of data.battle){
    if (client.id == socket.id){
      party = client.party;
    } else {
      enemyParty = client.party;
    }
  }
  // showEverything();
  push();
  textSize(80);
  if (data.result == "win") {
    showEverything();
    fill(0, 250, 50);
    text("WIN", width / 2, 3 * height / 6);
  } else if (data.result == "loss") {
    hp = data.hp;
    // showUI();
    showEverything();
    fill(200, 0, 0);
    text("LOSS", width / 2, 3 * height / 6);
  } else {
    showEverything();
    fill(230);
    text("TIE", width / 2, 3 * height / 6);
  }
  pop();

  //set timer for going back to market
  setTimeout(() => {
    socket.emit("goToMarket")
  }, 3000);
});

// game end message
socket.on('gameOver', (data) => {
  console.log('gameOver: ' + data.result);
  push();
  textSize(80);
  background(20);
  if (data.result == "win") {
    fill(0, 250, 50);
    text("YOU WIN", width / 2, 3 * height / 6);
  } else if (data.result == "loss") {
    // hp = data.hp;
    // showUI();
    fill(200, 0, 0);
    text("YOU LOST", width / 2, 3 * height / 6);
  }
  pop();
});

//
//  VARIABLES
//

//overall game state
let state = "market";
// let availableHireNum = 3; //now just using hires
let hires = [null, null, null]; //available monsters in market
let doneSetup = false;

// player stuff
let party = [null, null, null, null, null];
let gold, hp, turn;
let partyName;
let enemyParty = [];

// UI + Layout
let stepButt, updateButt; //just for slowing down debug, will eventually trigger automatically
let battleSlots = []; //where party is in battle, translated to center, flipped for enemy
let marketSlots = []; //where party is in market
let hireSlots = []; //where available monsters in market are
let battleSlotY, marketSlotY, hireSlotY; //center height of monsters
let slots = []; //array for all draggable slots, with appropriate Ys
let freezeSlot; //the slot to drag to freeze
let sellSlot; //the slot to drag to sell
let assetSize; //size to display monster pngs
let r; //radius of image
let tierSize; //size of dice assets
// let slotBuffer; //spacing between slots
// let slotSize; //total X size of slot + space
let playerStatY; //height of top stats
let refreshButt, readyButt; // market buttons
let waitingForBattle = false; //when ready but opponent isn't
let pickedUpSomething = false; //to trigger between mouseDragged and mouseReleased
let dragged = {}; //image asset to show on mouseDragged + original party and index for return
let hoverCheckTime = 70; //timer before hover triggers

//
//  MAIN
//

function setup(){
  createCanvas(windowWidth - 5, windowHeight - 5); //TODO better way of ensuring scrollbars don't show up
  // createCanvas(1920, 1080);
  background(82,135,39);

  //layout
  rectMode(CENTER);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  battleSlotY = 6 * height / 8; //y position of party in battle
  marketSlotY = 3 * height / 8; //y position of party in market
  hireSlotY = 5 * height / 8; //y position of hires and items
  playerStatY = height / 20; //y position of top stats
  assetSize = width / 11; //size of slots and images
  r = assetSize / 2; //radius of image, for checking interaction range
  tierSize = assetSize/3; //size of dice for hires
  let slotBuffer = assetSize / 20; //space between slots
  let slotSize = assetSize + slotBuffer; //total X size of slot + space
  let spacing = slotSize / 3; // to prevent battle positions from going offscreen
  battleSlots = [-(slotSize - spacing), -(2 * slotSize - spacing), -(3 * slotSize - spacing), -(4 * slotSize - spacing), -(5 * slotSize - spacing)]; // going to be translated to center and flipped
  marketSlots = [6 * slotSize, 5 * slotSize, 4 * slotSize, 3 * slotSize, 2 * slotSize];
  hireSlots = [2 * slotSize, 3 * slotSize, 4 * slotSize, 5 * slotSize, 6 * slotSize, 7 * slotSize + spacing, 8 * slotSize + spacing]; //items have slight gap
  slots = [{sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys
  sellSlot = {x: width/2 + assetSize, y: 7 * height / 8};
  freezeSlot = {x: width/2 - assetSize, y: 7 * height / 8};

  //make UI
  refreshButt = createButton('REFRESH HIRES').position(width / 5, 5 * height / 6).mousePressed(()=>{socket.emit("refreshHires", hires)}); //if gold left, replaces hires with random hires
  readyButt = createButton('READY UP').position(4 * width / 5, 5 * height / 6).mousePressed(()=>{socket.emit("readyUp", {party: party, hires: hires})}); //sends msg that we're ready to battle
  readyButt.hide(); //hiding until there's a party to send to battle

  //assets after loadImage
  loadMonsterAssets();
  diceAssets = [null, dice1, dice2, dice3, dice4, dice5, dice6];

  //display
  doneSetup = true;
  showEverything();
} 

//
//  FUNCTIONS
//

function draw(){
  //had to move drag hover functions here or else would only trigger on move, makes hover wonky
  if (pickedUpSomething) {
    //show dragged image
    showEverything();
    image(dragged.image, mouseX, mouseY, assetSize, assetSize);
    //check for hover over party slot, reset timer if not, check timer if so
    let s = slots[0];
    let isHovering = false;
    for (let [i, slotX] of s.sX.entries()){
      if (mouseX > slotX - r && mouseX < slotX + r && mouseY > s.sY - r && mouseY < s.sY + r) {
        isHovering = true;
        hoverTimer++;
        //if over slot and timesUp and underlying exists then move underlying
        if (hoverTimer > hoverCheckTime){
          //if spot isn't empty, try to move left, if can't, move right
          if(s.m[i] !== null){
            console.log("trying to push");
            pushParty(s.m, i);
          }
        }
      }
    }
    //reset timer if not hovering
    if (!isHovering){
      hoverTimer = 0;
    }
  }
}

//drag functions
function mouseDragged(){ //just for pickup now
  //only pick up in market before readying
  if (state == "market" && !waitingForBattle && !pickedUpSomething) {
    for (let s of slots){
      for (let [i, slotX] of s.sX.entries()){
        if (s.m[i] !== null && mouseX > slotX - r && mouseX < slotX + r && mouseY > s.sY - r && mouseY < s.sY + r) {
          //in bounds, grab image and remove from original spot
          pickedUpSomething = true;
          dragged = {
            image: monsterAssets[s.m[i].name],
            party: s.m,
            index: i,
            monster: s.m[i]
          }
          //empty origin slot
          s.m[i] = null;
        }
      }
    }
  }
}

function mouseReleased() {
  //only if we're dragging something
  if (pickedUpSomething) {
    //on release, check for slot, gold, monster, etc. -- can only release into party, else it just snaps back
    let needsToReturn = true;
    for (let [i, slotX] of marketSlots.entries()){ //TODO lots of redundant code here
      //in bounds and empty slot, drop in
      if (party[i] == null && mouseX > slotX - r && mouseX < slotX + r && mouseY > marketSlotY - r && mouseY < marketSlotY + r) {
        if (dragged.party == hires && gold >= 3){ //check if buying or just rearranging
          party[i] = dragged.monster;
          party[i].index = i;
          needsToReturn = false;
          //update server with party and get gold back -- TODO, should be other way around, incase not enough gold on server
          socket.emit("hireMonster", {party: party});
        } else if (dragged.party !== hires) {
          party[i] = dragged.monster;
          party[i].index = i;
          needsToReturn = false;
        }
      } 
      //if same monster, upgrade and combine when drop
      else if (party[i] !== null && party[i].name == dragged.monster.name && mouseX > slotX - r && mouseX < slotX + r && mouseY > marketSlotY - r && mouseY < marketSlotY + r) {
        if (dragged.party == hires && gold >= 3){
          upgradeMonster(i, dragged.monster.xp); //TODO should do on server side...
          needsToReturn = false;
          socket.emit("hireMonster", {party: party});
        } else if (dragged.party !== hires) {
          upgradeMonster(i, dragged.monster.xp); //TODO should do on server side...
          needsToReturn = false;
        }
      }
    }
    //check for freeze slot drop
    if (dragged.party == hires && mouseX > freezeSlot.x - r && mouseX < freezeSlot.x + r && mouseY > freezeSlot.y - r && mouseY < freezeSlot.y + r) {
      // hires[dragged.i].isFrozen = !hires[dragged.i].isFrozen; //toggle frozen or not
      dragged.monster.isFrozen = !dragged.monster.isFrozen; //toggle frozen or not
    }
    //check for sell slot drop
    if (dragged.party == party && mouseX > sellSlot.x - r && mouseX < sellSlot.x + r && mouseY > sellSlot.y - r && mouseY < sellSlot.y + r) {
      let notLast = false; // prevents from selling last party member
      for (let i = 0; i < party.length; i++){
        if (party[i] !== null){
          notLast = true;
        }
      }
      if (notLast) {
        socket.emit("sellMonster", {party: party, level: dragged.monster.level}); //TODO sell amount equal to level?
        needsToReturn = false;
      }
    }

    //send back to slot if dropped over nothing
    if (needsToReturn) {
      dragged.party[dragged.index] = dragged.monster;
    }
    pickedUpSomething = false;
    showEverything();
  }
}

//if hovering over full slot, try to shift party to make room
function pushParty(p, i){ //party, index
  //if not on edge, try to push left (backwards because show party in reverse array)
  if (i < p.length - 1) {
    let dir = 1;
    let [canPushLeft, numToPushLeft] = checkPush(p, i, 1, dir);
    if (canPushLeft) {
      for (let j = i + numToPushLeft; j > i; j--){ //could simplify this with dir, but overoptimization
        p[j] = p[j-1];
        p[j].index = j;
      }
      p[i] = null;
      return;
    } 
  }
  if (i > 0) { //if not on edge, try to push right
    dir = -1;
    let [canPushRight, numToPushRight] = checkPush(p, i, 1, dir);
    if (canPushRight) {
      for (let j = i - numToPushRight; j < i; j++){ //could simplify this with dir, but overoptimization
        p[j] = p[j+1];
        p[j].index = j;
      }
      p[i] = null;
    }
  }
}

//recursive function that checks right or left for shifting slots
function checkPush(p, i, num, dir) {
  let indexToCheck = i + (num * dir);
  console.log("index: " + indexToCheck);
  if(p[indexToCheck] == null) { //found empty spot, return it
    return [true, num]; //don't need dir since not using in push loop
  } else if ((indexToCheck < p.length - 1 && indexToCheck > 0)) { //if still room, keep checking down line
    console.log("inside: " + indexToCheck, num, dir);
    num ++;
    return checkPush(p, i, num, dir);
  } else { //shifting not possible
    console.log("not possible");
    return [false, 0];
  }
}

//
//  SHOW FUNCTIONS
//

function showEverything(){
  background(82,135,39);
  showUI();
  showSlots();

  push();
  if (state == "market") {
    for (let i = 0; i < party.length; i++){
      if (party[i] !== null){
        showParty(party[i], true);
      }
    }
  } else if (state == "battle") {
    translate(width/2, 0); //only translating in battle to make flip easier
    for (let i = 0; i < party.length; i++){
      if (party[i] !== null){
        showParty(party[i], true);
      }
    }
    for (let i = 0; i < enemyParty.length; i++){
      if (party[i] !== null){
        showParty(enemyParty[i], false);
      }
    }
  }
  pop();
}

//shows party whether in market or battle
function showParty(monster, isMyParty){
  push();
  let x, y;
  if (state == "market"){
    x = marketSlots[monster.index];
    y = marketSlotY;
  } else if (state == "battle") {
    x = battleSlots[monster.index];
    y = battleSlotY;
  }
  let size = assetSize;
  let xOffset = (1 * size / 5);
  let yOffset = (3 * size / 4);
  let statSize = size / 3;

  //annoying, need more elegant solution to flipping images and text
  if (!isMyParty) {
      //x = -x;
      push();
      scale(-1, 1);
      image(monsterAssets[monster.name], x, y, size, size);
      pop();
      x = -x; //so text flips
  } else {
      image(monsterAssets[monster.name], x, y, size, size);
  }

  let powerX = x - xOffset;
  let hpX = x + xOffset;
  let statY = y + yOffset;
  let lvlX = x - xOffset;
  let upgradeX = x;
  let lvlY = y - yOffset;
  let upgradeSize = xOffset/2;
  //asset
  strokeWeight(2);
  stroke(0);
  let statText = 5 * statSize / 6;
  textSize(statText);
  //power
  fill(100);
  rect(powerX, statY, statSize); 
  fill(255);
  text(monster.currentPower, powerX, statY + (statText / 12)); //weirdly not in center??
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.currentHP, hpX, statY + (statText / 12));
  //level
  fill(230,206,38);
  textAlign(RIGHT, BOTTOM);
  textSize(statText/2);
  text("lvl.", lvlX, lvlY);
  textSize(statText);
  text(monster.level, lvlX + statText/2, lvlY + statText/4);
  //upgrades
  for (let i = 0; i < monster.nextLevel; i++){
    if (monster.xp > i){
      fill(230,206,38);
    } else {
      fill(50);
    }
    rect(upgradeX + (upgradeSize * i), lvlY + statText/2, upgradeSize);
  }
  pop();
}

function showUI(){
  push();

  //upper left stats
  textSize(40);
  fill(249,224,50);
  text(gold, width / 10, playerStatY);
  fill(217,65,60);
  text(hp, 2 * width / 10, playerStatY);
  fill(30,161,202);
  text(turn, 3 * width / 10, playerStatY);

  //show current state in top right corner
  textSize(50);
  fill(0);
  text(state, width - (width / 10), playerStatY);

  //if waiting, show under button
  if (waitingForBattle){
    textSize(25);
    text("Waiting For Opponent", 3 * width / 4, (5 * height / 6) + 50);
  }
  
  pop();
}

//shows the party slots, market slots, and hires, regardless of if they're filled or not
function showSlots(){
  push();
  noStroke();
  fill(230, 150);

  if (state == "market") {
    for (let i = 0; i < 5; i++){//party in market
      rect(marketSlots[i], marketSlotY, assetSize);
    }
    for (let i = 0; i < hires.length; i++) { //hires, variable based on tier reached
      rect(hireSlots[i], hireSlotY, assetSize);
      if (hires[i] !== null) {
        showHire(hires[i]);
        if (hires[i].isFrozen){
          push();
          fill(100, 100, 255, 150); //transparent blue overlay
          rect(hireSlots[i], hireSlotY, assetSize);
          pop();
        }
      }
    }
    for (let i = 1; i < 3; i++){ //items, same array as hires -- don't like it, but that's how SAP looks
      rect(hireSlots[hireSlots.length - i], hireSlotY, assetSize);
    }

    //freeze slot
    stroke(0, 0, 200);
    rect(freezeSlot.x, freezeSlot.y, assetSize);
    textSize(assetSize/5);
    fill(0);
    text("FREEZE", freezeSlot.x, freezeSlot.y);

    //sell slot
    fill(230, 150);
    stroke(249,224,50);
    rect(sellSlot.x, sellSlot.y, assetSize);
    textSize(assetSize/5);
    fill(0);
    text("SELL", sellSlot.x, sellSlot.y);

  } else if (state == "battle") {
    translate(width/2, 0); //only translating in battle to make flip easier
    for (let i = 0; i < 5; i++){
      rect(battleSlots[i], battleSlotY, assetSize);
    }
    for (let i = 0; i < 5; i++){
      rect(-battleSlots[i], battleSlotY, assetSize);
    }
  }

  pop();
}

//shows hires and stats
function showHire(monster){
  push();
  let x = hireSlots[monster.index];
  let y = hireSlotY;
  let size = assetSize;
  let xOffset = (1 * size / 5);
  let yOffset = (3 * size / 4);
  let statSize = size / 3;

  image(monsterAssets[monster.name], x, y, size, size);

  let powerX = x - xOffset;
  let hpX = x + xOffset;
  let statY = y + yOffset;
  let tierX = x - xOffset;
  let tierY = y - yOffset;

  //asset
  strokeWeight(2);
  stroke(0);
  let statText = 5 * statSize / 6;
  textSize(statText);
  //power
  fill(100);
  rect(powerX, statY, statSize); 
  fill(255);
  text(monster.currentPower, powerX, statY + (statText / 12)); //weirdly not in center??
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.currentHP, hpX, statY + (statText / 12));
  //tier
  image(diceAssets[monster.tier], tierX, tierY, tierSize, tierSize);
  pop();
}

//upgrades monster after dropping to combine, TODO: should be on server
function upgradeMonster(index, draggedUpgrades){
  let m = party[index];
  // m.xp++;
  //need to address if combining two monsters with existing upgrades
  m.xp += draggedUpgrades + 1;
  if (m.xp < m.nextLevel){
    //increase power and hp, TODO: is this always +1?
    m.hp += draggedUpgrades + 1;
    m.power += draggedUpgrades + 1;
  } else {
    //on level up, increase stats by 2
    m.level++;
    m.xp -= m.nextLevel; //not resetting to 0 incase combining two who upgrades
    m.hp += draggedUpgrades + 2;
    m.power += draggedUpgrades + 2;
  }
  m.currentHP = m.hp;
  m.currentPower = m.power;
}

function loadMonsterAssets(){
  monsterAssets = {
    //tier1
  cavebear: cavebear,
  flumph: flumph,
  gnoll: gnoll,
  goblin: goblin,
  kobold: kobold,
  mephit: mephit,
  skeleton: skeleton,
  stirge: stirge,
  vegepygmy: vegepygmy,
  //tier2
  //tier3
  //tier4
  bulette: bulette,
  //tier5
  beholder: beholder,
  //tier6
  };
}