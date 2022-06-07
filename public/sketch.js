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

// basic setup on connecting to server
socket.on('setup', (data) => {
  console.log('setting up');
  gold = data.gold;
  hp = data.hp;
  turn = data.turn;
  hires = data.hires;
  // showEverything();
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
  gold = data.gold;
  showEverything();
});

// receive info from battle step
socket.on('battleAftermath', (data) => {
  console.log('battle step over');
  party = data.party;
  enemyParty = data.enemyParty;
  showEverything();
});

// end battle message
socket.on('battleOver', (data) => {
  console.log('battle finished: ' + data.result);
  party = data.party;
  enemyParty = data.enemyParty;
  showParties();
  push();
  textSize(80);
  if (data.result == "win") {
    fill(0, 250, 50);
    text("WIN", width / 2, 3 * height / 6);
  } else if (data.result == "loss") {
    hp = data.hp;
    fill(200, 0, 0);
    text("LOSS", width / 2, 3 * height / 6);
  } else {
    fill(230);
    text("TIE", width / 2, 3 * height / 6);
  }
  pop();
});

//
//  VARIABLES
//

//overall game state
let state = "market";
let availableHireNum = 3;
let hires = []; //available monsters in market

// player stuff
let party = [];
let gold, hp, turn;
let partyName;
let enemyParty = [];

// UI + Layout
let stepButt, updateButt; //just for slowing down debug, will eventually trigger automatically
let battleSlots = []; //where party is in battle, translated to center, flipped for enemy
let marketSlots = []; //where party is in market
let hireSlots = []; //where available monsters in market are
let battleSlotY, marketSlotY, hireSlotY; //center height of monsters
let assetSize; //size to display monster pngs
let playerStatY; //height of top stats
let refreshButt, readyButt; // market buttons

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
  playerStatY = height / 20;
  //make UI
  stepButt = createButton('STEP').position(width/2 - 50, 5 * height / 6).mousePressed(step);
  refreshButt = createButton('REFRESH HIRES').position(width / 4, 5 * height / 6).mousePressed(()=>{socket.emit("refreshHires", {availableHireNum: availableHireNum})}); //if gold left, replaces hires with random hires
  readyButt = createButton('READY UP').position(3 * width / 4, 5 * height / 6).mousePressed(()=>{socket.emit("readyUp")}); //sends msg that we're ready to battle

  //monsters after loadImage
  monsterAssets = {
    beholder: beholder,
    bulette: bulette,
    skeleton: skeleton,
  };

  //display
  showEverything();
} 

// the main battle function -- steps through each stage of the battle
function step(){
  //server applies hits
  socket.emit("battleStep");
}

function showEverything(){
  background(82,135,39);
  showUI();
  showSlots();

  push();
  if (state == "market") {
    for (let i = 0; i < party.length; i++){
      showParty(party[i], true);
    }
  } else if (state == "battle") {
    translate(width/2, 0); //only translating in battle to make flip easier
    for (let i = 0; i < party.length; i++){
      showParty(party[i], true);
    }
    for (let i = 0; i < enemyParty.length; i++){
      showParty(enemyParty[i], false);
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
      image(monsterAssets[hires[i].name], hireSlots[i], hireSlotY, assetSize, assetSize);
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