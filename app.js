var mySymbol;
var myIndex;
var n = 1;
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
	var cards = shuffleAndDeal();
	var bids = [0, 0, 0, 0];
	delta({
			'state': 'bid', 
			'cards': JSON.stringify(cards), 
			'bids': JSON.stringify(bids),
			'stateChanged': 'true', 
			'currentPlayer': '0'
			});
}

function submitBid(button) {
	button.disabled = true;
	$('#bidValue').prop('disabled', true);
	bids = JSON.parse(get('bids'));
	bids[myIndex] = parseInt($('#bidValue').val());
	var pid = '' + ((myIndex + 1) % n);
	delta({'statusChanged': 'false', 'currentPlayer': pid, 'bids': JSON.stringify(bids)});
	$('#bidValue').removeAttr('id');
}

function stateChange(evt) {
	if(get('state') != "false") {
		if(get('state') == "bid") {
			if(get('stateChanged') == "true") {
				// display the cards
				var cards = JSON.parse(get('cards'));
				for(var i = 0; i < cards[myIndex].length; i++) {
			        $('#p0c' + i).attr('src', '//raw.github.com/vickyg3/HangoutTrump/master/images/cards/' + cards[myIndex][i] + '.png');
			        $('#p0c' + i).attr('data-card', cards[myIndex][i]);
				}
			}
			// display the current bids
			bids = JSON.parse(get('bids'));
			console.log(bids);
			for(var i = 0; i < n; i++) {
		        $('#playername' + i).html(players[i]['name'] + ' Bid: ' + bids[i]);
			}
			// take action based on whose turn
			pid = parseInt(get('currentPlayer'));
			if(pid == myIndex) {
				var wstr = '<li> It is your turn to bid. Enter your bid: ';
				wstr += '<input type=\"text\" id=\"bidValue\" style=\"width: 40px;\" />';
				wstr += '<button onclick=\"submitBid(this);\">Done!</button>';
				wstr += '</li>';
				$('#status').append(wstr);
			} else {
				$('#status').append('<li>Waiting for ' + players[pid]['name'] + ' to bid..</li>');
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