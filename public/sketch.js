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
socket.on('connect', function(){
  console.log('now connected to server');
});

// basic setup on connecting to server
socket.on('setup', function(data){
  console.log('setting up');
  gold = data.gold;
  hp = data.hp;
  turn = data.turn;
  // showEverything();
});

// receive parties once both have sent to server
socket.on('initParty', (data, callback) => {
  console.log('init parties');
  party = data.party;
  enemyParty = data.enemyParty;
  showEverything();
});

// receive info from battle step
socket.on('battleAftermath', function(data){
  console.log('battle step over');
  party = data.party;
  enemyParty = data.enemyParty;
  showEverything();
});

// end battle message
socket.on('battleOver', function(data){
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
let assetSize;
let playerStatY; //height of top stats

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
  hireSlots = [4 * width / 13, 5 * width / 13, 6 * width / 13, 7 * width / 13, 8 * width / 13];
  assetSize = width/14;
  playerStatY = height / 20;
  //make UI
  stepButt = createButton('STEP').position(width/2 - 50, 5 * height / 6).mousePressed(step);

  //monsters after loadImage
  monsterAssets = {
    beholder: beholder,
    bulette: bulette,
    skeleton: skeleton,
  };

  //send server relative data for use in creating monsters
  // socket.emit("clientCoords", {}); //no longer needed

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