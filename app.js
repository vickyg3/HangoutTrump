var mySymbol;
var myIndex;
var n = 2;
var players;

function stringCompare(a,b) {
	return a['id'].toLowerCase().localeCompare(b['id'].toLowerCase());
}

function delta(data) {
	gapi.hangout.data.submitDelta(data);
}

function get(key) {
	return gapi.hangout.data.getValue(key);
}

function populatePlayers() {
	var participants = gapi.hangout.getEnabledParticipants();
	var players = [];
	for(i in participants) {
		players[i] = {'name': participants[i].person.displayName, 'id': participants[i].id};
	}
	players.sort(stringCompare);
	console.log(players);
	for(var i = 0; i < n; i++) {
		if(players[i]['id'] == gapi.hangout.getLocalParticipantId()) {
			myIndex = i;
			break;
		}
	}
	console.log("myindex is: " + myIndex);
	return players;
}

function initPlayers() {
	if(gapi.hangout.getEnabledParticipants().length < n) {
		return;
	}
	players = populatePlayers();
	if(myIndex == 0) {
		initGame();
	}
}

function shuffleAndDeal() {
	var cards = ['2', '3', '9', '10', 'j', 'q', 'k', 'a'];
	var symbols = ['s', 'd', 'c', 'h'];
	var deck = [];
	// initialize the deck
	for(var i = 0; i < cards.length; i++) {
		for(var j = 0; j < symbols.length; j++) {
			deck.push(cards[i] + symbols[j]);
		}
	}
	// shuffle the pack using knuth shuffle
	for(var i = deck.length - 1; i >= 0; i--) {
		var k = Math.floor(Math.random()*i);
		var temp = deck[k];
		deck[k] = deck[i];
		deck[i] = temp;
	}
	// split the array into 4
	var finaldeck = [];
	var k = 0;
	for(var i = 0; i < 4; i++) {
		var tempdeck = [];
		for(var j = 0; j < deck.length / 4; j++) {
			tempdeck.push(deck[k++]);
		}
		finaldeck.push(tempdeck);
	}
	return finaldeck;
}

function initGame() {
	cards = shuffleAndDeal();
	delta({'state': 'bid', 'cards': JSON.stringify(cards), 'stateChanged': 'true', 'currentPlayer': '0'});
}

function stateChange(evt) {
	if(get('state') != "false") {
		if(get('stateChanged') == "true") {
			// going from false to bid
			if(get('state') == "bid") {
				// display the cards
				var cards = JSON.parse(get('cards'));
				for(var i = 0; i < players[myIndex].length; i++) {
			        $('p0c' + i).attr('src', '/images/cards/' + cards[myIndex][i] + '.png');
			        $('p0c' + i).attr('data-card', cards[myIndex][i]);
				}
			}
		}
		
	}
}

function init() {
	// When API is ready
	gapi.hangout.onApiReady.add(
		function(eventObj) {
			if (eventObj.isApiReady) {
				gapi.hangout.onEnabledParticipantsChanged.add(initPlayers);
				gapi.hangout.data.onStateChanged.add(stateChange);
				initPlayers();
			}
		});
}

// Wait for gadget to load
gadgets.util.registerOnLoadHandler(init);