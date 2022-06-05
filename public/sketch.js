/*
    ~ * ~ * ~ * 
    CLIENT
    ~ * ~ * ~ * 
*/

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

//
//  MAIN
//

function setup(){
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  background(82,135,39);

  //make UI
  stepButt = createButton('STEP').mousePressed(step);

  //test
  for (let i = 0; i < 5; i++){
    party.push(new Monster());
    enemyParty.push(new Monster());
  }
} 

// function draw(){

// }

// the main battle function -- steps through each stage of the battle
function step(){
  let y = 4 * height / 6;
  let x = (width / 2) - (width / 12);
  let enemyX = (width / 2) + (width / 12);

  // for (let monster of party){
  //   monster.show(x, y);
  //   x -= width / 12;
  // }
  for (let i = 0; i < 5; i++){
    party[i].show(x, y);
    enemyParty[i].show(enemyX, y);
    x -= width / 12;
    enemyX += width / 12;
  }
}