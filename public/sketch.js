/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/

//
//  MONSTER ASSET LOAD
//

let monsterAssets = {};
let beholder, bulette, skeleton;

function preload() {
  beholder = loadImage('assets/beholder.png');
  bulette = loadImage('assets/bulette.png');
  skeleton = loadImage('assets/skeleton.png');
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
  // party = data.battle;
  // enemyParty = data.enemyParty;
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
  // party = data.party;
  // enemyParty = data.enemyParty;
  showEverything();
  // showParties();
  push();
  textSize(80);
  if (data.result == "win") {
    fill(0, 250, 50);
    text("WIN", width / 2, 3 * height / 6);
  } else if (data.result == "loss") {
    hp = data.hp;
    showUI();
    fill(200, 0, 0);
    text("LOSS", width / 2, 3 * height / 6);
  } else {
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
  // for (let client of data.battle){
  //   if (client.id == socket.id){
  //     party = client.party;
  //   } else {
  //     enemyParty = client.party;
  //   }
  // }
  // showEverything();
  // showParties();
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
let availableHireNum = 3;
let hires = [null, null, null, null, null]; //available monsters in market
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
let assetSize; //size to display monster pngs
let r; //radius of image
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
  createCanvas(windowWidth, windowHeight);
  // createCanvas(1920, 1080);
  background(82,135,39);

  //layout
  rectMode(CENTER);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  battleSlotY = 6 * height / 8;
  marketSlotY = 3 * height / 8;
  hireSlotY = 5 * height / 8;
  battleSlots = [-(width / 12), -(2 * width / 12), -(3 * width / 12), -(4 * width / 12), -(5 * width / 12)];
  marketSlots = [8 * width / 13, 7 * width / 13, 6 * width / 13, 5 * width / 13, 4 * width / 13];
  hireSlots = [4 * width / 13, 5 * width / 13, 6 * width / 13, 7 * width / 13, 8 * width / 13, 9 * width / 13, 10 * width / 13];
  assetSize = width/14;
  r = assetSize / 2; //radius of image
  playerStatY = height / 20;
  slots = [{sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys
  // slots = [{sX: battleSlots, sY: battleSlotY, m: party}, {sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys

  //make UI
  //stepButt = createButton('STEP').position(width/2 - 50, 5 * height / 6).mousePressed(step);
  refreshButt = createButton('REFRESH HIRES').position(width / 4, 5 * height / 6).mousePressed(()=>{socket.emit("refreshHires", {availableHireNum: availableHireNum})}); //if gold left, replaces hires with random hires
  readyButt = createButton('READY UP').position(3 * width / 4, 5 * height / 6).mousePressed(()=>{socket.emit("readyUp", {party: party})}); //sends msg that we're ready to battle

  //monsters after loadImage
  monsterAssets = {
    beholder: beholder,
    bulette: bulette, 
    skeleton: skeleton,
  };

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
        // console.log("hovering");
        isHovering = true;
        hoverTimer++;
        //if over slot and timesUp and underlying exists then move underlying
        if (hoverTimer > hoverCheckTime){
          // console.log("trying to push");
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
    for (let [i, slotX] of marketSlots.entries()){
      if (party[i] == null && mouseX > slotX - r && mouseX < slotX + r && mouseY > marketSlotY - r && mouseY < marketSlotY + r) {
        //in bounds and empty slot, drop in
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
    }
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
        p[j] = p[j-1]; //TODO check... is this going to just be a reference...?
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

// the main battle function -- steps through each stage of the battle
function step(){
  //server applies hits
  socket.emit("battleStep");
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
      // image(monster.asset, x, y, size, size);
      image(monsterAssets[monster.name], x, y, size, size);
      pop();
      x = -x; //so text flips
  } else {
      image(monsterAssets[monster.name], x, y, size, size);
  }

  let powerX = x - xOffset;
  let hpX = x + xOffset;
  let statY = y + yOffset;

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
    for (let i = 0; i < availableHireNum; i++){ //hires, variable based on tier reached
      rect(hireSlots[i], hireSlotY, assetSize);
      if (hires[i] !== null){
        image(monsterAssets[hires[i].name], hireSlots[i], hireSlotY, assetSize, assetSize);
      }
    }
    for (let i = 1; i < 3; i++){ //items, same array as hires -- don't like it, but that's how SAP looks
      rect(hireSlots[hireSlots.length - i], hireSlotY, assetSize);
    }
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