/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/
//
//  MONSTERS AND ASSET LOAD
//
let monsters = [];
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

// receive info from battle step
socket.on('battleStep', function(data){
  console.log('battling');
  party = data.party;
  enemyParty = data.enemyParty;
});

//
//  VARIABLES
//

// player stuff
let party = [];
let gold, hp, turn;
let partyName;
let enemyParty = [];

// UI
let stepButt; //just for slowing down debug, will eventually trigger automatically

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
  stepButt = createButton('STEP').position(width/2, 5 * height / 6).mousePressed(step);

  //monsters after loadImage
  monsters = [
    {
      name: "Beholder",
      asset: beholder,
      power: 5,
      hp: 3
    },
    {
      name: "Bulette",
      asset: bulette,
      power: 3,
      hp: 3
    },
    {
      name: "Skeleton",
      asset: skeleton,
      power: 1,
      hp: 2
    },
  ]

  //test
  for (let i = 0; i < 5; i++){
    let m = random(monsters);
    party.push(new Monster({asset: m.asset, power: m.power, hp: m.hp, index: i, slot: {x: slots[i], y: slotY}}));
    let e = random(monsters);
    enemyParty.push(new Monster({asset: e.asset, power: e.power, hp: e.hp, index: i, slot: {x: slots[i], y: slotY}}));
  }
  //show parties
  push();
  translate(width/2, 0);
  for (let i = 0; i < 5; i++){
    party[i].show(true);
    enemyParty[i].show(false);
  }
  pop();

  //update server with parties
  //socket.emit("partyUpdate", {party1: party, party2: enemyParty});
} 

// function draw(){

// }

// the main battle function -- steps through each stage of the battle
function step(){
  //show parties
  push();
  translate(width/2, 0);
  for (let i = 0; i < 5; i++){
    party[i].show(true);
    enemyParty[i].show(false);
  }
  pop();

  //server applies hits
  //manual and one-sided for now
  socket.emit("battleStep");
}