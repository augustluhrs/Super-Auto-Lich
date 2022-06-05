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
});

// basic setup on connecting to server
socket.on('initParty', (data, callback) => {
  console.log('init parties');
  party = data.party;
  enemyParty = data.enemyParty;
  showParties();
});

// receive info from battle step
socket.on('battleAftermath', function(data){
  console.log('battle step over');
  party = data.party;
  enemyParty = data.enemyParty;
  showParties();
});

// end battle message
socket.on('battleOver', function(data){
  console.log('battle finished: ' + data.result);
  party = data.party;
  enemyParty = data.enemyParty;
  showParties();
  push();
  textSize(80);
  if (data.result == "win"){
    fill(0, 250, 50);
    text("WIN", width / 2, 3 * height / 6);
  } else if (data.result == "loss"){
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

// player stuff
let party = [{}, {}, {}, {}, {}];
let gold, hp, turn;
let partyName;
let enemyParty = [{}, {}, {}, {}, {}];

// UI
let stepButt, updateButt; //just for slowing down debug, will eventually trigger automatically

// Layout
let slots = []; //party line, translated to center, flipped for enemy
let slotY; //center height of monsters

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
  slotY = 4 * height / 6;
  slots = [-(width / 12), -(2 * width / 12), -(3 * width / 12), -(4 * width / 12), -(5 * width / 12)];

  //make UI
  stepButt = createButton('STEP').position(width/2 - 50, 5 * height / 6).mousePressed(step);

  //monsters after loadImage
  monsterAssets = {
    beholder: beholder,
    bulette: bulette,
    skeleton: skeleton,
  };

  //send server relative data for use in creating monsters
  socket.emit("clientCoords", {slots: slots, slotY: slotY});
} 

// the main battle function -- steps through each stage of the battle
function step(){
  //server applies hits
  socket.emit("battleStep");
}

function showParties(){
  background(82,135,39);

  push();
  translate(width/2, 0);
  for (let i = 0; i < party.length; i++){
    showParty(party[i], true);
  }
  for (let i = 0; i < enemyParty.length; i++){
    showParty(enemyParty[i], false);
  }
  pop();
}

//annoying, idk why this didn't work as a class method...
function showParty(monster, isMyParty){
  push();
  let x = monster.slot.x;
  let y = monster.slot.y;
  let size = monster.assetSize;
  let xOffset = (2 * size / 5);
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
  textSize(5 * statSize / 6);
  //power
  fill(100);
  rect(powerX, statY, statSize); 
  fill(255);
  text(monster.power, powerX, statY);
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.hp, hpX, statY);

  pop();
}