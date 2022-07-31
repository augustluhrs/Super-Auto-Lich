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
let font;
let forest, cave;
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
  //font
  font = loadFont('assets/fonts/MochiyPopOne-Regular.ttf');
  //backgrounds
  forest = loadImage('assets/backgrounds/forest.png');
  cave = loadImage('assets/backgrounds/cave.png');
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
let playerID;

//listen for the confirmation of connection 
socket.on('connect', () => {
  console.log('now connected to server');
  playerID = socket.id;
});

//wait screen for lobby
socket.on("waitingForLobby", (data) => {
  state = "waiting for lobby";
  lobby = data;
  lobby.playersArray = []; //dumb but w/e
  for (let p of lobby.players){
    lobby.playersArray.push(p);
  }
  while (lobby.playersArray.length < lobby.numPlayers){
    lobby.playersArray.push(null); //hmmmmmmmmmm
  }
});

//lobby connect error
socket.on("lobbyJoinError", (data) => {
  console.log("ERROR JOINING LOBBY:");
  console.log(data.lobbyName);
});

// basic setup on connecting to server or after battle when going back to market
socket.on('goToMarket', (data) => {
  console.log('going to market');
  state = "market";
  isBattleOver = false;
  gold = data.gold;
  hp = data.hp;
  turn = data.turn;
  hires = data.hires;
  party = data.party; //refreshes after battle
  
  if (doneSetup){ //TODO irrelevant now
    slots = [{sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys
    refreshButt.show();
    readyButt.show();
    showEverything();
    backButt.hide();
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

//on first ready, get prompt to set up team name
socket.on("setPartyName", (data) => {
    names.adjectives = data.adjectives;
    names.nouns = data.nouns;
    partyNoun = data.nouns[0];
    partyAdjective = data.adjectives[0];
    state = "party name";
});

//if other player isn't ready for battle, show waiting
socket.on("waitingForBattle", () => {
  waitingForBattle = true;
  showEverything();
});

//start battle
socket.on("startBattle", (data) => {
  state = "battle";
  waitingForBattle = false;
  battleSteps = data.battleSteps;
  console.log("battle start");
  console.log(battleSteps);
  stepThroughBattle(battleSteps);
  numPlayersInLobby = data.numPlayersInLobby;

  // enemyName = data.startPair[1].partyName; //TODO username too?
  if (data.startPair[0].id == playerID){
    enemyName = data.startPair[1].partyName;
  } else {
    enemyName = data.startPair[0].partyName;
  }
  // for (let p of data.startPair){
  //   if (p.id != playerID){
  //     enemyName = p.partyName;
  //   }
  // }

  //remove market stuff
  dragged = {};
  refreshButt.hide();
  readyButt.hide();
  showEverything();
});

//
//  VARIABLES
//

//overall game state
let state = "start";
let hires = [null, null, null]; //available monsters in market
let doneSetup = false;
let lobby;
let userName = "";
let numPlayersInLobby = 0;

// player stuff
let party = [null, null, null, null, null];
let battleParty = []; //going to use this for now to prevent any messes... TODO remove
let gold, hp, turn;
let enemyParty = [];

// party name stuff
let partyName = "";
let names = {adjectives: [], nouns: []};
let partyAdjective = "";
let partyNoun = "";
let enemyName;

// UI + Layout
let stepButt, updateButt; //just for slowing down debug, will eventually trigger automatically
let battleSlots = []; //where party is in battle, translated to center, flipped for enemy
let marketSlots = []; //where party is in market
let hireSlots = []; //where available monsters in market are
let nameSlots = [ ]; //where name options are during party naming
let battleSlotY, marketSlotY, hireSlotY; //center height of monsters
let slots = []; //array for all draggable slots, with appropriate Ys
let freezeSlot; //the slot to drag to freeze
let sellSlot; //the slot to drag to sell
let assetSize; //size to display monster pngs
let r; //radius of image
let slotSize; // asset size + buffer gap
let tierSize; //size of dice assets
let playerStatY; //height of top stats
let refreshButt, readyButt; // market buttons
let waitingForBattle = false; //when ready but opponent isn't
let pickedUpSomething = false; //to trigger between mouseDragged and mouseReleased
let dragged = {}; //image asset to show on mouseDragged + original party and index for return
let hoverTimer = 0; //to tick up to check against checkTime
let hoverCheckTime = 70; //timer before hover triggers
let speedSlots = []; //for speed UI in battle
let speedSlotY; //Y height of speed UI
let isPaused = false;
let stepSpeed = 50; //amount of time each animation step takes
let regularSpeed = 50; //default speed, /2 for fast forward
let stepTimer = 0;
let animationRange; //standard distance to animate
let isBattleOver = false; //just for displaying result text
let battleResult = ""; //text to display at end of battle
let battleResultColors = {}; //colors for battle text display
let shouldShowMonsterInfo = false;
let infoBox = {name: "", abilityText: "", x: 0, y: 0, width: 0, height: 0, textSize: 0};
let nameSlotWidth;
let textSizeUI, textSizeOver, textSizePartyName;
let arenaButt, joinButt, lobbyButt, loginButt, settingsButt;
let startMonsters = [];
let lobbyInput, createButt, numPlayersInput, backButt; //using the same button for both because couldn't decide on variable names

// ITEMS
let randomSpots = [];
let sporeNum = 8;

//
//  MAIN
//

function setup(){
  createCanvas(windowWidth - 5, windowHeight - 5); //TODO better way of ensuring scrollbars don't show up
  // background(82,135,39);
  // image(forest, width/2, height/2, windowWidth, windowHeight);

  //layout
  rectMode(CENTER);
  imageMode(CENTER);
  angleMode(RADIANS);
  textFont(font);
  textAlign(CENTER, CENTER);
  strokeWeight(2);

  battleSlotY = 6 * height / 8; //y position of party in battle
  marketSlotY = 3 * height / 8; //y position of party in market
  hireSlotY = 5 * height / 8; //y position of hires and items
  playerStatY = height / 20; //y position of top stats
  assetSize = width / 11; //size of slots and images
  r = assetSize / 2; //radius of image, for checking interaction range
  tierSize = assetSize/3; //size of dice for hires
  animationRange = assetSize * 0.5; //standard distance to animate

  let slotBuffer = assetSize / 20; //space between slots
  slotSize = assetSize + slotBuffer; //total X size of slot + space
  let spacing = slotSize / 3; // to prevent battle positions from going offscreen
  battleSlots = [-(slotSize - spacing), -(2 * slotSize - spacing), -(3 * slotSize - spacing), -(4 * slotSize - spacing), -(5 * slotSize - spacing)]; // going to be translated to center and flipped
  marketSlots = [6 * slotSize, 5 * slotSize, 4 * slotSize, 3 * slotSize, 2 * slotSize];
  hireSlots = [2 * slotSize, 3 * slotSize, 4 * slotSize, 5 * slotSize, 6 * slotSize, 7 * slotSize + spacing, 8 * slotSize + spacing]; //items have slight gap
  slots = [{sX: marketSlots, sY: marketSlotY, m:party}, {sX: hireSlots, sY: hireSlotY, m: hires}]; //array for all draggable slots, with appropriate Ys
  sellSlot = {x: width/2 + assetSize, y: 7 * height / 8};
  freezeSlot = {x: width/2 - assetSize, y: 7 * height / 8};
  speedSlots = [3 * width / 8, 4 * width / 8, 5 * width / 8];
  speedSlotY = 2 * height / 12;
  nameSlotWidth = width / 28;
  nameSlots = {x: [5 * nameSlotWidth, 14 * nameSlotWidth, 23 * nameSlotWidth], y: [height/3, 2 * height / 3]};
  textSizeUI = width / 20;
  textSizeOver = width / 8;
  textSizePartyName = 4 * nameSlotWidth / 5;

  battleResultColors = {"TIE": color(230), "WIN": color(0, 255, 50), "LOSS": color(200, 0, 0)};

  infoBox.width = width/4;
  infoBox.height = height/3;
  infoBox.textSize = width/40;
  
  //make UI
  refreshButt = createButton('REFRESH HIRES').position(width / 5, 5 * height / 6).mousePressed(()=>{socket.emit("refreshHires", hires)}); //if gold left, replaces hires with random hires
  refreshButt.class("startButts");
  // refreshButt.center("horizontal");
  refreshButt.hide(); //not on start
  readyButt = createButton('READY UP').position(4 * width / 5, 5 * height / 6).mousePressed(()=>{
    if (partyName == "") {
      socket.emit("getPartyNames");
    } else {
      socket.emit("readyUp", {party: party, hires: hires, partyName: partyName}); //sends msg that we're ready to battle
    }
  });
  readyButt.class("startButts");
  // readyButt.center("horizontal");
  readyButt.hide(); //hiding until there's a party to send to battle
  let startButtWidth = width/3 + "px";
  let startButtWidthHalf = width/6 + "px";
  let startButtHeight = height/8 + "px";
  //TODO make functions
  // arenaButt = createButton('Play Arena').position(width / 2, 3 * height / 7).class("startButts").style("width", startButtWidth).style("height", startButtHeight).mousePressed(()=>{});
  joinButt = createButton('Join Lobby').position(width / 2, 4 * height / 7).class("startButts").style("width", startButtWidth).style("height", startButtHeight).mousePressed(()=>{
    lobbyInput.show();
    createButt.show();
    backButt.show();
    // arenaButt.hide();
    joinButt.hide();
    lobbyButt.hide();
    // loginButt.hide();
    // settingsButt.hide();
    createButt.html("Join Lobby");
    state = "join lobby";
  });
  lobbyButt = createButton('Create Lobby').position(width / 2, 5 * height / 7).class("startButts").style("width", startButtWidth).style("height", startButtHeight).mousePressed(()=>{
    numPlayersInput.show();
    lobbyInput.show();
    createButt.show();
    backButt.show();
    // arenaButt.hide();
    joinButt.hide();
    lobbyButt.hide();
    // loginButt.hide();
    // settingsButt.hide();
    createButt.html("Create Lobby");
    state = "create lobby";
  });
  // loginButt = createButton('Log In').position(width / 4, 6 * height / 7).class("startButts").style("width", startButtWidthHalf).style("height", startButtHeight).mousePressed(()=>{});
  // settingsButt = createButton('Settings').position(3 * width / 4, 6 * height / 7).class("startButts").style("width", startButtWidthHalf).style("height", startButtHeight).mousePressed(()=>{});
  // arenaButt.center("horizontal");
  joinButt.center("horizontal");
  lobbyButt.center("horizontal");
  // loginButt.style("margin-left", "-15%");
  // settingsButt.style("margin-right", "-25%");

  numPlayersInput = createInput('Enter Number of Players').position(width / 2, 3 * height / 7).style("width", startButtWidth / 2).style("height", startButtHeight / 2);
  numPlayersInput.class("inputs");
  numPlayersInput.center("horizontal");
  numPlayersInput.hide();
  lobbyInput = createInput('Enter a Lobby ID').position(width / 2, 4 * height / 7).style("width", startButtWidth / 2).style("height", startButtHeight / 2);
  lobbyInput.class("inputs");
  lobbyInput.center("horizontal");
  lobbyInput.hide();
  createButt = createButton('Create Lobby').position(width / 2, 5 * height / 7).class("startButts").style("width", startButtWidth / 2).style("height", startButtHeight).mousePressed(()=>{
    if (state == "create lobby"){
      socket.emit("createLobby", {lobbyName: lobbyInput.value(), numPlayers: numPlayersInput.value(), userName: userName});
    } else if (state == "join lobby"){
      socket.emit("joinLobby", {lobbyName: lobbyInput.value(), userName: userName}); //TODO userName on login
    }
    // background(112,16,15);
    numPlayersInput.hide();
    lobbyInput.hide();
    createButt.hide();
    //backButt.show(); //hmmm TODO -- need to remove from lobby when goes back
  });
  createButt.center("horizontal");
  createButt.hide();
  backButt = createButton('BACK').position(width / 8, 6 * height / 7).class("startButts").style("width", startButtWidthHalf / 2).style("height", startButtHeight / 2).mousePressed(()=>{
    numPlayersInput.hide();
    lobbyInput.hide();
    createButt.hide();
    backButt.hide(); //TODO -- need to remove from lobby when goes back
    state = "start";
    // arenaButt.show();
    joinButt.show();
    lobbyButt.show();
    // loginButt.show();
    // settingsButt.show();
  });
  backButt.hide();

  //assets after loadImage
  loadMonsterAssets();
  diceAssets = [null, dice1, dice2, dice3, dice4, dice5, dice6];

  //for start screen animation
  startMonsters = [
    {isFlipped: false, asset: gnoll},
    {isFlipped: false, asset: stirge},
    {isFlipped: false, asset: kobold},
    {isFlipped: false, asset: vegepygmy},
    {isFlipped: false, asset: skeleton},
    {isFlipped: false, asset: beholder},
    {isFlipped: false, asset: bulette},
    {isFlipped: false, asset: goblin},
    {isFlipped: false, asset: flumph},
    {isFlipped: false, asset: mephit},
    {isFlipped: false, asset: cavebear}
  ];
  for (let m of startMonsters){
    if (random() < 0.3){
      m.isFlipped = true;
    }
  }

  //Items
  for (let i = 0; i < sporeNum; i++){
    let rX = random(-assetSize / 2, assetSize / 2);
    let rY = random(-assetSize / 2, assetSize / 2);
    randomSpots.push({rX: rX, rY: rY});
  }

  //display
  doneSetup = true;
  showEverything();

  //placeholder TODO login
  userName = "Player " + floor(random(100));
} 

//
//  FUNCTIONS
//

function draw(){
  //had to move drag hover functions here or else would only trigger on move, makes hover wonky
  if (state == "start" || state == "create lobby" || state == "join lobby") {
    //title
    push();
    background(112,16,15);
    textSize(width/10);
    stroke(255);
    strokeWeight(8);
    fill(0);
    text("Super Auto Lich", width/2, height/7);
    //monsters
    for (let [i, m] of startMonsters.entries()){
      push();
      translate(i * width / 18 + 4 * width / 18, 2 * height / 7);
      if(random() < 0.01){
        m.isFlipped = !m.isFlipped;
      }
      if(m.isFlipped){
        scale(-1,1);
      }
      image(m.asset, 0, 0, assetSize / 2, assetSize / 2);
      pop();
    }
    pop();
  } else if (state == "waiting for lobby"){
    push();
    background(112,16,15);
    textSize(width/20);
    text(lobby.lobbyName, width / 2, height / 8);
    text("Num Players To Start: " + lobby.numPlayers, width/2, 2 * height / 8);
    text("PLAYERS: ", width/2, 4 * height / 8);
    textSize(width/25);
    for (let i = 0; i < lobby.numPlayers; i++){
      if (lobby.playersArray[i] != null){
        text(lobby.playersArray[i].userName, width / 2, map(i, 0, lobby.numPlayers, 5 * height / 8, 8 * height / 8));  //shh
      }
    }
    pop();
  } else if (state == "market"){
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
    } else{
      showEverything();
      //check for hovering over monsters/items for info
      let isHovering = false;
      for (let s of slots){
        for (let [i, slotX] of s.sX.entries()){
          if (s.m[i] != null && mouseX > slotX - r && mouseX < slotX + r && mouseY > s.sY - r && mouseY < s.sY + r) {
            isHovering = true;
            hoverTimer++;
            if (hoverTimer > hoverCheckTime - 20){
              infoBox.x = mouseX;
              infoBox.y = mouseY;
              infoBox.name = s.m[i].name;
              infoBox.abilityText = s.m[i].abilityText;
              //show infoBox
              showInfoBox();

            }
          }
        }
      }
      //reset timer if not hovering
      if (!isHovering){
        hoverTimer = 0;
        infoBox.name = "";
        infoBox.ability = "";
      }
    }
  } else if (state == "party name") {
    partyName = "The " + partyAdjective + " " + partyNoun;
    showPartyNameOptions();
  }else if (state == "gameOver") {
    background(20);
    textSize(textSizeOver);
    if (battleResult == "YOU WON" ) {
      fill(0, 250, 80);
    } else if (battleResult == "YOU LOST") {
      fill(200, 0, 0);
    }
    text(battleResult, width / 2, 3 * height / 6);
  } else if (state == "battle"){
    //speedUI
    showEverything();
    showSpeedUI();
    //check animation timing
    if (!isPaused){
      if (stepTimer >= stepSpeed){
        console.log("newStep");
        stepTimer = 0;
        stepThroughBattle(battleSteps);
      } else {
        stepTimer++;
        // if (stepTimer%50 == 0) {console.log(stepTimer)};
        updateAnimations();
      }
      if (isBattleOver) { //text not showing b/c getting overwritten
        push();
        textSize(textSizeOver);
        showEverything();
        fill(battleResultColors[battleResult]);
        stroke(255);
        text(battleResult, width / 2, 3 * height / 6);
        pop();
      }
    }
  }
}

//
//  MOUSE FUNCTIONS
//

// for clicking speed UI
function mouseClicked(){
  if (state == "battle"){
    if (mouseX > speedSlots[0] - r && mouseX < speedSlots[0] + r && mouseY > speedSlotY - r && mouseY < speedSlotY + r){
      //pause button
      isPaused = !isPaused;
    } else if (mouseX > speedSlots[1] - r && mouseX < speedSlots[1] + r && mouseY > speedSlotY - r && mouseY < speedSlotY + r){
      //play button
      isPaused = false;
      stepSpeed = regularSpeed;
    } else if (mouseX > speedSlots[2] - r && mouseX < speedSlots[2] + r && mouseY > speedSlotY - r && mouseY < speedSlotY + r){
      //fast forward button
      isPaused = false;
      stepSpeed = regularSpeed / 2;
    }
  } else if (state == "party name"){
    for (let i = 0; i < 3; i++){
      //top name buttons
      if (mouseX > nameSlots.x[i] - 4 * nameSlotWidth && mouseX < nameSlots.x[i] + 4 * nameSlotWidth && mouseY > nameSlots.y[0] - 2 * nameSlotWidth && mouseY < nameSlots.y[0] + 2 * nameSlotWidth){
        partyAdjective = names.adjectives[i];
      }
      //bottom name buttons
      if (mouseX > nameSlots.x[i] - 4 * nameSlotWidth && mouseX < nameSlots.x[i] + 4 * nameSlotWidth && mouseY > nameSlots.y[1] - 2 * nameSlotWidth && mouseY < nameSlots.y[1] + 2 * nameSlotWidth){
        partyNoun = names.nouns[i];
      }
    }
    
  }
}

function mouseDragged(){ //just for pickup now
  //only pick up in market before readying
  if (state == "market" && !waitingForBattle && !pickedUpSomething) {
    for (let s of slots){
      for (let [i, slotX] of s.sX.entries()){
        if (s.m[i] !== null && s.m[i] !== undefined && mouseX > slotX - r && mouseX < slotX + r && mouseY > s.sY - r && mouseY < s.sY + r) {
          console.log(i);
          console.log(s.m[i]);
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
        socket.emit("sellMonster", {party: party, level: dragged.monster.level});
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
  push();
  if (state == "market") {
    image(forest, width/2, height/2, windowWidth, windowHeight);
    showUI();
    showSlots();
    for (let i = 0; i < party.length; i++){
      if (party[i] !== null){
        showParty(party[i], true);
      }
    }
    //show party name
    push();
    textAlign(LEFT, CENTER);
    textSize(textSizePartyName);
    stroke(255);
    text(partyName, width / 8, height/8);
    pop();
  } else if (state == "battle") {
    image(cave, width/2, height/2, windowWidth, windowHeight);
    showUI();
    showSlots();
    translate(width/2, 0); //only translating in battle to make flip easier
    for (let i = 0; i < battleParty.length; i++){
      showMonster(battleParty[i]);
    }
    for (let i = 0; i < enemyParty.length; i++){
      showMonster(enemyParty[i]);
    }
    //show party names -- translated
    push();
    stroke(255);
    textAlign(LEFT, CENTER);
    textSize(textSizePartyName);
    text(partyName, - 3 * width / 7, 4 * height/12);
    textAlign(CENTER, CENTER);
    text("vs", 0, 5 *  height/12);
    textAlign(RIGHT, CENTER);
    text(enemyName, 3 * width / 7, 6 * height/12);
    pop();
  }
  pop();
}

//shows party whether in market or battle -- TODO cleanup, now just market
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
  // let upgradeX = x;
  let upgradeX = lvlX + xOffset/2;
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
  text(monster.currentPower, powerX, statY - (statText / 6)); //weirdly not in center??
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.currentHP, hpX, statY - (statText / 6));
  //level
  fill(230,206,38);
  textAlign(RIGHT, BOTTOM);
  textSize(statText/2);
  text("lvl.", lvlX, lvlY);
  textSize(statText);
  text(monster.level, lvlX + statText, lvlY + statText/4);
  //upgrades
  if (monster.level < 3){ //don't show xp if at max level
    for (let i = 0; i < monster.nextLevel; i++){
      if (monster.xp > i) {
        fill(230,206,38);
      } else {
        fill(50);
      }
      rect(upgradeX + (upgradeSize * i), lvlY + statText/2, upgradeSize);
    }
  }
  pop();
}

function showUI(){
  push();
  //upper left stats
  stroke(255);
  textSize(textSizeUI);
  let statX = width / 7;
  let emojiGap = statX / 4;

  textFont("arial");
  text("💰", statX - emojiGap, playerStatY);
  textFont(font);
  fill(249,224,50);
  text(gold, statX + emojiGap, playerStatY);

  textFont("arial");
  text("❤️", 2 * statX - emojiGap, playerStatY);
  textFont(font);
  fill(217,65,60);
  text(hp, 2 * statX + emojiGap, playerStatY);

  textFont("arial");
  text("⏲️", 3 * statX - emojiGap, playerStatY);
  textFont(font);
  fill(30,161,202);
  text(turn, 3 * statX + emojiGap, playerStatY);

  //show current state in top right corner
  fill(0);
  textAlign(RIGHT, CENTER);
  text(state, width - (width / 10), playerStatY);

  //if waiting, show under button
  if (waitingForBattle){
    textSize(width/40);
    text("Waiting For Opponent", 3 * width / 4, (5 * height / 6) + 50, width / 4);
  }
  pop();
}

function showSpeedUI(){
  push();
  
  //pause button
  if(isPaused){
    fill(204,166,230)
    stroke(255);
  } else {
    fill(50);
    stroke(0);
  }
  rect(speedSlots[0] - assetSize / 6, speedSlotY, assetSize / 4, assetSize / 2);
  rect(speedSlots[0] + assetSize / 6, speedSlotY, assetSize / 4, assetSize / 2);

  //play button
  if(stepSpeed == regularSpeed && !isPaused){
    fill(150, 255, 0);
    stroke(255);
  } else {
    fill(50);
    stroke(0);
  }
  triangle(speedSlots[1] - assetSize / 3, speedSlotY + assetSize / 3, speedSlots[1] + assetSize / 3, speedSlotY, speedSlots[1] - assetSize / 3, speedSlotY - assetSize / 3);

  //fast forward button
  if(stepSpeed == regularSpeed/2 && !isPaused){
    fill(0, 150, 255);
    stroke(255);
  } else {
    fill(50);
    stroke(0);
  }
  let offset = assetSize / 3;
  triangle(speedSlots[2] - assetSize / 3 - offset, speedSlotY + assetSize / 3, speedSlots[2] + assetSize / 3 - offset, speedSlotY, speedSlots[2] - assetSize / 3 - offset, speedSlotY - assetSize / 3);
  triangle(speedSlots[2] - assetSize / 3 + offset, speedSlotY + assetSize / 3 , speedSlots[2] + assetSize / 3 + offset, speedSlotY, speedSlots[2] - assetSize / 3 + offset, speedSlotY - assetSize / 3);
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
    textSize(assetSize/6);
    fill(0);
    text("FREEZE", freezeSlot.x, freezeSlot.y);

    //sell slot
    fill(230, 150);
    stroke(249,224,50);
    rect(sellSlot.x, sellSlot.y, assetSize);
    textSize(assetSize/6);
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

//new battle show to allow for animations
function showMonster(monster){
  push();
  let x = monster.x;
  let y = monster.y;
  let size = assetSize;
  let xOffset = (1 * size / 5);
  let yOffset = (3 * size / 4);
  let statSize = size / 3;

  //effects -- tint was causing performance issues
  // if (monster.isSleeping){
  //   // tint(0, 153, 204);
  // }
  // if (monster.isNullified){
  //   // tint(204, 0, 153);
  // }

  push();
  //annoying, need more elegant solution to flipping images and text
  if (!monster.isMyParty) {
    translate(-x, y);
    push();
    rotate(-monster.rotation);
    scale(-1, 1);
    image(monsterAssets[monster.name], 0, 0, size, size);
    pop();
    x = -x; //so text flips
  } else {
    translate(x, y);
    push();
    rotate(monster.rotation);
    image(monsterAssets[monster.name], 0, 0, size, size);
    pop();
  }
  showMonsterItems(monster, 0, 0);
  noStroke();
  if (monster.isSleeping){
    fill(0, 153, 204, 100);
    rect(0, 0, assetSize);
  }
  if (monster.isNullified){
    fill(204, 0, 153, 100);
    rect(0, 0, assetSize);
  }
  pop();


  let powerX = x - xOffset;
  let hpX = x + xOffset;
  let statY = y + yOffset;
  let lvlX = x - xOffset;
  let upgradeX = lvlX + xOffset/2;
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
  text(monster.currentPower, powerX, statY - (statText / 6)); //weirdly not in center??
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.currentHP, hpX, statY - (statText / 6));
  //level
  fill(230,206,38);
  textAlign(RIGHT, BOTTOM);
  textSize(statText/2);
  text("lvl.", lvlX, lvlY);
  textSize(statText);
  text(monster.level, lvlX + statText, lvlY + statText/4);
  //upgrades
  if (monster.level < 3){ //don't show xp if at max level
    for (let i = 0; i < monster.nextLevel; i++){
      if (monster.xp > i) {
        fill(230,206,38);
      } else {
        fill(50);
      }
      rect(upgradeX + (upgradeSize * i), lvlY + statText/2, upgradeSize);
    }
  }
  pop();
}

//show items on the monster (only battle TODO)
function showMonsterItems(monster, x, y){ //x,y because of flip that happens in battle
  let item = monster.currentItem;
  if (item != "nothing"){
    if (item == "spores"){
      push();
      fill(112,133,56);
      noStroke();
      for (let i = 0; i < sporeNum; i++){
        ellipse(x + randomSpots[i].rX, y + randomSpots[i].rY, random(4, 12));
        // console.log(x, y);
      }
      pop();
    }
  }
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
  text(monster.currentPower, powerX, statY - (statText / 6)); //weirdly not in center??
  //hp
  fill(200, 0, 0);
  rect(hpX, statY, statSize);
  fill(255);
  text(monster.currentHP, hpX, statY - (statText / 6));
  //tier
  image(diceAssets[monster.tier], tierX, tierY, tierSize, tierSize);
  pop();
}

//show info box
function showInfoBox(){
  push();
  rectMode(CENTER);
  textAlign(CENTER, TOP);
  textSize(infoBox.textSize);
  stroke(0);
  strokeWeight(4);
  fill(124,203,198);
  rect(infoBox.x, infoBox.y - infoBox.height / 2, infoBox.width, infoBox.height);
  fill(0);
  noStroke();
  text(infoBox.name, infoBox.x, infoBox.y - infoBox.height / 1.1);
  textSize(infoBox.textSize / 1.95);
  text(infoBox.abilityText, infoBox.x, infoBox.y - infoBox.height / 1.6, infoBox.width - 5); //adding max width now for wrap
  pop();
}

//show party name options when picking names
function showPartyNameOptions(){
  push();
  // background(82,135,39);
  image(forest, width/2, height/2, windowWidth, windowHeight);

  stroke(255);
  textSize(textSizePartyName);
  textAlign(LEFT, CENTER);
  text("The " + partyAdjective + " " + partyNoun, width / 8, height / 10);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < 3; i++){
    if (partyAdjective == names.adjectives[i]){
      fill(241,203,60);
    } else {
      fill(124,203,198);
    }
    rect(nameSlots.x[i], nameSlots.y[0], 8 * nameSlotWidth, 5 * nameSlotWidth);
    fill(0);
    text(names.adjectives[i], nameSlots.x[i], nameSlots.y[0], 8 * nameSlotWidth);

    if (partyNoun == names.nouns[i]){
      fill(241,203,60);
    } else {
      fill(124,203,198);
    }
    rect(nameSlots.x[i], nameSlots.y[1], 8 * nameSlotWidth, 5 * nameSlotWidth);
    fill(0);
    text(names.nouns[i], nameSlots.x[i], nameSlots.y[1], 8 * nameSlotWidth);
  }
  //if waiting, show under button
  if (waitingForBattle){
    //TODO text align matching
    stroke(255);
    textSize(width/40);
    text("Waiting For Opponent", 3 * width / 4, (5 * height / 6) + 50, width / 4);
  }
  pop();
}

//
//  MISC FUNCTIONS
//

//goes through each battle step and animates, draw handles timing
function stepThroughBattle(battleSteps){
  if (battleSteps.length > 0){ //preventing from trying to do this while waiting for market at the end
    let step = battleSteps[0];
    console.log(step.action);
    //reset and update stepSpeed if changed
    // for (let client of step.parties){
    //   if (client.id == playerID){
    //     battleParty = client.party;
    //   } else {
    //     enemyParty = client.party;
    //   }
    // }
    // battleParty = step.pair[0].battleParty;
    // enemyParty = step.pair[1].battleParty;
    if (step.pair[0].id == playerID){
      battleParty = step.pair[0].battleParty;
      enemyParty = step.pair[1].battleParty;
    } else {
      battleParty = step.pair[1].battleParty;
      enemyParty = step.pair[0].battleParty;
    }

    //seems redundant but TODO refactor
    for (let i = 0; i < enemyParty.length; i++){
      enemyParty[i].x = battleSlots[i];
      enemyParty[i].y = battleSlotY;
      enemyParty[i].rotation = 0;
      enemyParty[i].s = 0;
      enemyParty[i].stepSpeed = stepSpeed;
      enemyParty[i].isMyParty = false;
      enemyParty[i].animate = () => {};
    }
    for (let i = 0; i < battleParty.length; i++){
      battleParty[i].x = battleSlots[i];
      battleParty[i].y = battleSlotY;
      battleParty[i].rotation = 0;
      battleParty[i].s = 0;
      battleParty[i].stepSpeed = stepSpeed;
      battleParty[i].isMyParty = true;
      battleParty[i].animate = () => {};
    }

    //now check for animations
    if (step.action == "start") {
      for (let i = 0; i < enemyParty.length; i++){
        enemyParty[i].x -= slotSize;
        enemyParty[i].animate = moveUp.bind(enemyParty[i]);
      }
      for (let i = 0; i < battleParty.length; i++){
        battleParty[i].x -= slotSize;
        battleParty[i].animate = moveUp.bind(battleParty[i]);
      }
    } else if (step.action == "attack"){
      if (!battleParty[0].isSleeping){
        battleParty[0].animate = animateAttack.bind(battleParty[0]);
      }
      if (!enemyParty[0].isSleeping){
        enemyParty[0].animate = animateAttack.bind(enemyParty[0]);
      }
    } else if (step.action == "ability") {
      //only step with a monster target... getting sloppy
      for (let i = 0; i < enemyParty.length; i++){
        if (enemyParty[i].id == step.monster.id){
          enemyParty[i].animate = useAbility.bind(enemyParty[i]);
        }
      }
      for (let i = 0; i < battleParty.length; i++){
        if (battleParty[i].id == step.monster.id){
          battleParty[i].animate = useAbility.bind(battleParty[i]);
        }
      }
    } else if (step.action == "damage") {
      for (let i = 0; i < enemyParty.length; i++){
        if (enemyParty[i].isDamaged){
          enemyParty[i].animate = takeDamage.bind(enemyParty[i]);
        } else if (enemyParty[i].isDead){
          enemyParty[i].animate = fallDead.bind(enemyParty[i]);
        }
      }
      for (let i = 0; i < battleParty.length; i++){
        if (battleParty[i].isDamaged){
          battleParty[i].animate = takeDamage.bind(battleParty[i]);
        } else if (battleParty[i].isDead){
          battleParty[i].animate = fallDead.bind(battleParty[i]);
        }
      }
    } else if (step.action == "move"){ //move up on death
      //TODO account for multiple deaths and death in middle
      if (enemyParty[0] != null && enemyParty[0].isDead){
        enemyParty[0].x = 10000; //hacky TODO actually hide
        for (let i = 1; i < enemyParty.length; i++){
          // enemyParty[i].x -= slotSize;
          enemyParty[i].animate = moveUp.bind(enemyParty[i]);
        }
      }
      if (battleParty[0] != null && battleParty[0].isDead){
        battleParty[0].x = 10000;
        for (let i = 1; i < battleParty.length; i++){
          // battleParty[i].x -= slotSize;
          battleParty[i].animate = moveUp.bind(battleParty[i]);
        }
      }
    } else if (step.action == "tie"){
      battleResult = "TIE";
      isBattleOver = true;
      //set timer for going back to market
      setTimeout(() => {
        socket.emit("goToMarket")
      }, 3000);
    } else if (step.action == "gameOver"){
      if (step.winner != playerID){
        state = "gameOver";
        battleResult = "YOU LOST";
      } else if (numPlayersInLobby == 1){
        state = "gameOver";
        battleResult = "YOU WON";
      } else {
        battleResult = "WIN";
        isBattleOver = true;
        //set timer for going back to market
        setTimeout(() => {
          socket.emit("goToMarket")
        }, 3000);
      }
    } else if (step.action == "battleOver"){ //TODO match gameOver on server, instead of checking here, now that each client is getting own
      if (battleParty.length == 0){
        // hp -= ; //TODO hp loss animation
        battleResult = "LOSS";
        isBattleOver = true;
      } else {
        battleResult = "WIN";
        isBattleOver = true;
      }

      //set timer for going back to market
      setTimeout(() => {
        socket.emit("goToMarket")
      }, 3000);
    }

    //get rid of the step
    battleSteps.splice(0,1);
  }
}

//upgrades monster after dropping to combine, TODO: should be on server
function upgradeMonster(index, draggedUpgrades){
  let m = party[index];
  //need to address if combining two monsters with existing upgrades
  m.xp += draggedUpgrades + 1;
  if (m.xp < m.nextLevel || m.level == 3){ //prevent from going up level, but still get bonus
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

///
/// ANIMATIONS
///

//updates position/rotation based on animations assigned in stepThroughBattle()
function updateAnimations(){
  for (let i = 0; i < enemyParty.length; i++){
    enemyParty[i].s++;
    enemyParty[i].animate();
  }
  for (let i = 0; i < battleParty.length; i++){
    battleParty[i].s++;
    battleParty[i].animate();
  }
}

//thanks to https://www.javascripttutorial.net/javascript-bind/ for solving my "this" issue
//basic attack
function animateAttack(){
  let stepSize = animationRange / (2 * this.stepSpeed / 5); //how can I not do this every frame? TODO
  if (this.s < this.stepSpeed / 5){ //move forward
    this.x += stepSize * 2;
  } else if (this.s < 4 * this.stepSpeed / 5) { //then move back
    this.x -= stepSize * .6; //idk if this is exact, TODO check
  } //buffer at end with no movement
}

//basic ability
function useAbility(){
  let stepSize = animationRange / (2 * this.stepSpeed / 5);
  if (this.s < this.stepSpeed / 5){ //move up
    this.y -= stepSize * 2;
  } else if (this.s < 4 * this.stepSpeed / 5) { //then move back
    this.y += stepSize * .6; //idk if this is exact, TODO check
  } //buffer at end with no movement
}

//basic move up
function moveUp(){
  if (this.s < 4 * this.stepSpeed / 5) {
    let stepSize = slotSize / (4 * this.stepSpeed / 5);
    this.x += stepSize;
    let sinY = map(this.s, 0, 2 * this.stepSpeed / 5, PI, TWO_PI);
    this.y += sin(sinY) * slotSize / (2 * this.stepSpeed / 5);
  }
}

//basic damage
function takeDamage(){
  let stepSize = (PI / 8) / (this.stepSpeed / 5);
  if (this.s < this.stepSpeed / 5) {
    this.rotation -= stepSize;
  } else if (this.s < 2 * this.stepSpeed / 5) { 
    this.rotation += stepSize;
  } else if (this.s < 3 * this.stepSpeed / 5) { 
    this.rotation -= stepSize;
  } else if (this.s < 4 * this.stepSpeed / 5) { 
    this.rotation += stepSize;
  }
}

//basic death
function fallDead(){
  let stepSize = (PI / 4) / (this.stepSpeed / 5); //45
  if (this.s < 2 * this.stepSpeed / 5) { 
    this.rotation -= stepSize;
  } else if (this.s < 3 * this.stepSpeed / 5) { 
    this.rotation += stepSize;
  } else if (this.s < 4 * this.stepSpeed / 5) { 
    this.rotation -= stepSize;
  }
}