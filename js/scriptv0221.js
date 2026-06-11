window.isDevVersion = false;

//Formatting code taken (and modified) from MrRedShark77
function format(ex, acc = 0, max = 6) {
	function E(x) {
		return new Decimal(x)
	}
	
	ex = E(ex)
	neg = ex.lt(0) ? "-" : ""
	if (ex.mag == Infinity) return neg + 'Infinity'
	if (Number.isNaN(ex.mag)) return neg + 'NaN'
	//The bit I added, this rounds the mag if it's extremely close to an integer due to rounding errors during calculations
	if (ex.layer > 0 && ex.mag % 1 != 0 && (ex.mag % 1) > 0.9999) ex.mag = Math.round(ex.mag)
	if (ex.lt(0)) ex = ex.mul(-1)
	if (ex.eq(0)) return ex.toFixed(acc)
	let e = ex.log10().floor()
	if (ex.log10().lt(Math.min(-acc, 0)) && acc > 1) {
		let e = ex.log10().ceil()
		let m = ex.div(e.eq(-1) ? E(0.1) : E(10).pow(e))
		let be = e.mul(-1).max(1).log10().gte(9)
		return neg + (be ? '' : m.toFixed(2)) + 'e' + format(e, 0, max)
	} else if (e.lt(max)) {
		let a = Math.max(Math.min(acc - e.toNumber(), acc), 0)
		return neg + (a > 0 ? ex.toFixed(a) : ex.toFixed(a).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,'))
	} else {
		if (ex.gte("eeee10")) {
			let slog = ex.slog()
			return (slog.gte(1e9) ? '' : E(10).pow(slog.sub(slog.floor())).toFixed(4)) + "F" + format(slog.floor(), 0)
		}
		let m = ex.div(E(10).pow(e))
		let be = e.log10().gte(4)
		return neg + (be ? '' : m.toFixed(2)) + 'e' + format(e, 0, max)
	}
}

function reset() {
	game = {
		timeOfLastUpdate: Date.now(),
		money: new Decimal(0),
		multi: new Decimal(1),
		prestige: new Decimal(0),
		power: new Decimal(0),
		superPrestige: new Decimal(0),
		ascension: new Decimal(0),
		infernal: new Decimal(0),
		
		miners: new Decimal(0),
		minerCost: new Decimal(1e30),
		miningCooldown: 0,
		miningResources: [new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0)], //Stone, Iron, Gold, Sapphire, Emerald, Ruby, Diamond
		
		XP: new Decimal(0),
		level: new Decimal(0),
		nextCrateLevel: new Decimal(2),
		
		crates: [], //Array is [crate number, amount]
		cratesNotChecked: 0,
		patterns: [[0, 0, 1]], //Array is [pattern number, special effect, amount]
		relics: [], //Array is [relic number, amount]
		relicPotionMultipliers: [new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1)],
		potions: [], //Array is [potion, amount]
		potionCooldowns: [0, 0, 0, 0, 0],
		currentItemScreen: 0,
		currentPattern: [1, 0],
		notifications: [true],
		
		worldsUnlocked: 1,
	}
	
	currentWorld = 1
}

//If the user confirms the hard reset, resets all variables, saves and refreshes the page
function hardReset() {
	if (confirm("Are you sure you want to reset? You will lose everything!")) {
		reset()
		save()
		location.reload()
	}
}

function save() {
	//console.log("saving")
	game.lastSave = Date.now();
	localStorage.setItem("ABS2Save", JSON.stringify(game));
}

if (!window.isDevVersion) setInterval(save, 5000);

//setInterval(save, 5000)

function exportGame() {
	save()
	navigator.clipboard.writeText(btoa(JSON.stringify(game))).then(function () {
		alert("Copied to clipboard!")
	}, function () {
		alert("Error copying to clipboard, try again...")
	});
}

function importGame() {
	loadgame = JSON.parse(atob(prompt("Input your save here:")))
	if (loadgame && loadgame != null && loadgame != "") {
		reset()
		loadGame(loadgame)
		save()
		location.reload()
	} else {
		alert("Invalid input.")
	}
}

function load() {
	reset()
	let loadgame = JSON.parse(localStorage.getItem("ABS2Save"))
	if (loadgame != null) {
		loadGame(loadgame)
	}
	mainLoop = function () {
		updateVisuals();
		requestAnimationFrame(mainLoop);
	};
	requestAnimationFrame(mainLoop)
}

load()

function loadGame(loadgame) {
	//Copying all the elements from the save file (loadgame) to the game object
	let loadKeys = Object.keys(loadgame); // Get the keys from the loadgame object
	for (i = 0; i < loadKeys.length; i++) { // Iterate over each key in the loadgame object
		if (loadgame[loadKeys[i]] !== undefined) { // Only process keys with defined values
			let thisKey = loadKeys[i];
			if (typeof loadgame[thisKey] == "string" && !isNaN(parseFloat(loadgame[thisKey]))) { // If the value is a string that can be parsed as a number, convert it to a Decimal
				game[thisKey] = new Decimal(loadgame[thisKey])
			} else if (Array.isArray(loadgame[thisKey])) { // If the value is an array
				if (!game[loadKeys[i]]) { // If the equivalent key doesn't exist in the game object or isn't an array, initialize it as an array
					game[loadKeys[i]] = [];
				}
				for (j = 0; j < loadgame[thisKey].length; j++) { // Iterate over each element in the array
					if (Array.isArray(loadgame[thisKey][j])) { // If the element itself is an array
						if (!game[loadKeys[i]][j]) { // If the corresponding nested array doesn't exist in the game object, initialize it as an array
							game[loadKeys[i]][j] = [];
						}
						for (k = 0; k < loadgame[thisKey][j].length; k++) { // Iterate over each element in the nested array
							if (typeof loadgame[thisKey][j][k] == "string" && !isNaN(parseFloat(loadgame[thisKey][j][k]))) { // If the sub-element is a string that can be parsed as a number, convert it to a Decimal
								game[loadKeys[i]][j][k] = new Decimal(loadgame[thisKey][j][k])
							} else { // Otherwise, copy the sub-element directly
								game[loadKeys[i]][j][k] = loadgame[thisKey][j][k]
							}
						}
					} else if (typeof loadgame[thisKey][j] == "string" && !isNaN(parseFloat(loadgame[thisKey][j]))) { // If the element is a string that can be parsed as a number, convert it to a Decimal
						game[loadKeys[i]][j] = new Decimal(loadgame[thisKey][j])
					} else { // Otherwise, copy the element directly
						game[loadKeys[i]][j] = loadgame[thisKey][j]
					}
				}
			} else { // If the value is not a string and not an array, copy it directly
				game[loadKeys[i]] = loadgame[loadKeys[i]]
			}
		}
	}
	
	game.currentItemScreen = 0
	currentWorld = 1
	setPattern(game.currentPattern[0], game.currentPattern[1])
	calculateRelicPotionMultipliers()
	
	if (game.worldsUnlocked >= 2) {
		$(".resourceText").eq(4).css("display", "inline-block")
		$(".resourceText").eq(5).css("display", "inline-block")
		$(".topButton2").eq(0).css("display", "inline-block")
	}
	if (game.worldsUnlocked >= 3) {
		$(".resourceText").eq(6).css("display", "inline-block")
	}
}

noOfButtons = [multiPrices.length, prestigePrices.length, powerPrices.length, superPrestigePrices.length, ascensionPrices.length, infernalPrices.length]

function updateVisuals() {
	$("#money").html(format(game.money))
	$("#moneyHeader").html("Money: " + format(game.money))
	$("#multi").html(format(game.multi))
	$("#multiHeader").html("Multi: " + format(game.multi))
	$("#prestige").html(format(game.prestige))
	$("#prestigeHeader").html("Prestige: " + format(game.prestige))
	$("#power").html(format(game.power))
	if (game.worldsUnlocked >= 2) {
		$("#powerHeader").html("Power: " + format(game.power))
		$("#superPrestige").html(format(game.superPrestige))
		$("#superPrestigeHeader").html("Super prestige: " + format(game.superPrestige))
		$("#ascension").html(format(game.ascension))
	}
	if (game.worldsUnlocked >= 3) {
		$("#ascensionHeader").html("Ascension: " + format(game.ascension))
		$("#infernal").html(format(game.infernal))
	}
	
	if (currentWorld == 1) {
		for (i = 0; i < 12; i++) {
			if (game.money.lt(multiPrices[i])) {
				$(".button1").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button1").eq(i).css("filter", "none")
			}
		}
		for (i = 0; i < 10; i++) {
			if (game.multi.lt(prestigePrices[i])) {
				$(".button2").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button2").eq(i).css("filter", "none")
			}
		}
		for (i = 0; i < 6; i++) {
			if (game.prestige.lt(powerPrices[i])) {
				$(".button3").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button3").eq(i).css("filter", "none")
			}
		}
	} else if (currentWorld == 2) {
		for (i = 0; i < 10; i++) {
			if (game.money.lt(multiPrices[i + 12])) {
				$(".button1").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button1").eq(i).css("filter", "none")
			}
		}
		if (game.superPrestige.lt(1) || game.prestige.gte(10)) {
			$(".button2").eq(0).css("filter", "brightness(70%)")
		} else {
			$(".button2").eq(0).css("filter", "none")
		}
		for (i = 0; i < 10; i++) {
			if (game.multi.lt(prestigePrices[i + 10])) {
				$(".button2").eq(i + 1).css("filter", "brightness(70%)")
			} else {
				$(".button2").eq(i + 1).css("filter", "none")
			}
		}
		if (game.ascension.lt(1) || game.power.gte(10)) {
			$(".button3").eq(0).css("filter", "brightness(70%)")
		} else {
			$(".button3").eq(0).css("filter", "none")
		}
		for (i = 0; i < 10; i++) {
			if (game.prestige.lt(powerPrices[i + 6])) {
				$(".button3").eq(i + 1).css("filter", "brightness(70%)")
			} else {
				$(".button3").eq(i + 1).css("filter", "none")
			}
		}
		for (i = 0; i < 10; i++) {
			if (game.power.lt(superPrestigePrices[i])) {
				$(".button4").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button4").eq(i).css("filter", "none")
			}
		}
		for (i = 0; i < 5; i++) {
			if (game.superPrestige.lt(ascensionPrices[i])) {
				$(".button5").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button5").eq(i).css("filter", "none")
			}
		}
	} else if (currentWorld == 3) {
		if (game.infernal.lt(1) || game.multi.gte(1e20)) {
			$(".button1").eq(0).css("filter", "brightness(70%)")
		} else {
			$(".button1").eq(0).css("filter", "none")
		}
		for (i = 0; i < noOfButtons[0] - 22; i++) {
			if (game.money.lt(multiPrices[i + 22])) {
				$(".button1").eq(i + 1).css("filter", "brightness(70%)")
			} else {
				$(".button1").eq(i + 1).css("filter", "none")
			}
		}
		for (i = 0; i < noOfButtons[1] - 20; i++) {
			if (game.multi.lt(prestigePrices[i + 20])) {
				$(".button2").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button2").eq(i).css("filter", "none")
			}
		}
		for (i = 0; i < noOfButtons[2] - 16; i++) {
			if (game.prestige.lt(powerPrices[i + 16])) {
				$(".button3").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button3").eq(i).css("filter", "none")
			}
		}
		if (game.infernal.lt(1) || game.superPrestige.gte(10)) {
			$(".button4").eq(0).css("filter", "brightness(70%)")
		} else {
			$(".button4").eq(0).css("filter", "none")
		}
		for (i = 0; i < noOfButtons[3] - 10; i++) {
			if (game.power.lt(superPrestigePrices[i + 10])) {
				$(".button4").eq(i + 1).css("filter", "brightness(70%)")
			} else {
				$(".button4").eq(i + 1).css("filter", "none")
			}
		}
		for (i = 0; i < noOfButtons[4] - 5; i++) {
			if (game.superPrestige.lt(ascensionPrices[i + 5])) {
				$(".button5").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button5").eq(i).css("filter", "none")
			}
		}
		for (i = 0; i < noOfButtons[5]; i++) {
			if (game.ascension.lt(infernalPrices[i])) {
				$(".button6").eq(i).css("filter", "brightness(70%)")
			} else {
				$(".button6").eq(i).css("filter", "none")
			}
		}
	}
	
	if (game.cratesNotChecked > 0) {
		$('#crateNotification').css("display", "block")
		$('#crateNotification').html("+" + format(game.cratesNotChecked))
	} else {
		$('#crateNotification').css("display", "none")
	}
	
	if ($('#miningScreen').css('display') == 'block') {
		$("#miningCooldown").html(formatTime(game.miningCooldown))
		$("#miningBoost").html(format(game.miningResources[0].pow(0.5).add(1), 2))
		for (i = 0; i < 7; i++) $(".miningResource").eq(i).html(format(game.miningResources[i]))
	}
	
	for (i = 0; i < game.potionCooldowns.length; i++) {
		if (game.potionCooldowns[i] > 0) {
			$(".potionIcon").eq(i).css("display", "block")
		} else {
			$(".potionIcon").eq(i).css("display", "none")
		}
	}
	$("#potionTooltip").html(potionNames[currentPotionTooltip - 1] + ": " + formatTime(game.potionCooldowns[currentPotionTooltip - 1]))
	
	$("#level").html(format(game.level))
	$("#bottomBar").css("background-color", levelToColour(game.level))
	//Sets the "XP to next level" bar
	XPToNextLevel = levelToXP(game.level.add(1)).sub(levelToXP(game.level))
	ProgressToNextLevel = (game.XP.sub(levelToXP(game.level)))
	$("#XPBar").css("width", format(ProgressToNextLevel.div(XPToNextLevel).mul(100)) + "%")
}

function updateVariables() {
	timeDivider = Math.max(1000 / (Date.now() - game.timeOfLastUpdate), 0)
	
	game.money = game.money.add(game.multi.mul(game.relicPotionMultipliers[0]).mul(game.miningResources[0].pow(0.5).add(1)).div(timeDivider))
	
	potionLastCooldowns = []
	for (i = 0; i < game.potionCooldowns.length; i++) potionLastCooldowns[i] = game.potionCooldowns[i]
	for (i = 0; i < game.potionCooldowns.length; i++) {
		if (game.potionCooldowns[i] > 0) {
			game.potionCooldowns[i] -= (1 / timeDivider)
		}
		if (game.potionCooldowns[i] < 0) game.potionCooldowns[i] = 0
		
		if (game.potionCooldowns[i] == 0 && potionLastCooldowns[i] > 0) {
			potionLastCooldowns[i] = 0;
			calculateRelicPotionMultipliers()
		}
	}
	
	if (game.miners.gte(1)) {
		game.miningCooldown -= (1 / timeDivider)
		if (game.miningCooldown <= 0) {
			gainRandomMiningResource()
			game.miningCooldown = 60 / Decimal.min(game.miners, 120).toNumber()
		}
	}
	
	game.level = XPToLevel(game.XP)
	
	game.timeOfLastUpdate = Date.now()
}

setInterval(updateVariables, 16)

function formatTime(x) {
	timeFloor = Math.floor(x)
	timeMinutes = Math.floor(timeFloor / 60)
	timeSeconds = timeFloor % 60
	timeString = ((timeMinutes < 10 ? '0' : '') + timeMinutes + ":" + (timeSeconds < 10 ? '0' : '') + timeSeconds + "." + (Math.floor((x % 1) * 100) < 10 ? '0' : '') + Math.floor((x % 1) * 100))
	return timeString
}

currentPotionTooltip = 1

function setPotionTooltip(x) {
	if (x == 0) {
		$("#potionTooltip").css("opacity", "0")
	} else {
		currentPotionTooltip = x
		$("#potionTooltip").css("top", (54 * x + 40) + "px")
		$("#potionTooltip").css("opacity", "1")
	}
}

function loadWorld(x) {
	$("body").css("background-color", worldBackgrounds[currentWorld - 1])
	$("#topBarWorld").html("World " + currentWorld + "<br>" + worldNames[currentWorld - 1])
	let button = document.createElement("div")
	buttons = document.getElementsByClassName("button");
	$("#buttons").html("<h1><span style='color: #b00'>Multi</span> buttons (<span id='moneyHeader' style='color: #070'>Money: 0</span>)</h1>")
	if (x == 1) {
		for (i = 0; i < 12; i++) {
			button.className = "button button1"
			button.innerHTML = "<p class='buttonText'>Multi:<br>+" + format(new Decimal(multiBoosts[i]).mul(game.prestige.add(1)).mul(game.relicPotionMultipliers[1])) + "<br>Cost:<br>$" + format(multiPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button1")[i].addEventListener('click', function () {
				buyButton(1, parseInt(this.id))
			})
			document.getElementsByClassName("button1")[i].addEventListener('mouseover', function () {
				checkButtonHold(1, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #60b'>Prestige</span> buttons (<span id='multiHeader' style='color: #b00'>Multi: 0</span>)</h1>")
		for (i = 0; i < 10; i++) {
			button.className = "button button2"
			button.innerHTML = "<p class='buttonText'>Prestige:<br>+" + format(new Decimal(prestigeBoosts[i]).mul(game.power.add(1)).mul(game.relicPotionMultipliers[2])) + "<br>Multi cost:<br>" + format(prestigePrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button2")[i].addEventListener('click', function () {
				buyButton(2, parseInt(this.id))
			})
			document.getElementsByClassName("button2")[i].addEventListener('mouseover', function () {
				checkButtonHold(2, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #dd0'>Power</span> buttons (<span id='prestigeHeader' style='color: #60b'>Prestige: 0</span>)</h1>")
		for (i = 0; i < 6; i++) {
			button.className = "button button3"
			button.innerHTML = "<p class='buttonText'>Power:<br>+" + format(new Decimal(powerBoosts[i]).mul(game.superPrestige.add(1)).mul(game.relicPotionMultipliers[3])) + "<br>Prestige cost:<br>" + format(powerPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button3")[i].addEventListener('click', function () {
				buyButton(3, parseInt(this.id))
			})
			document.getElementsByClassName("button3")[i].addEventListener('mouseover', function () {
				checkButtonHold(3, parseInt(this.id))
			})
		}
	} else if (x == 2) {
		for (i = 12; i < 22; i++) {
			button.className = "button button1"
			button.innerHTML = "<p class='buttonText'>Multi:<br>+" + format(new Decimal(multiBoosts[i]).mul(game.prestige.add(1)).mul(game.relicPotionMultipliers[1])) + "<br>Cost:<br>$" + format(multiPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button1")[i - 12].addEventListener('click', function () {
				buyButton(1, parseInt(this.id))
			})
			document.getElementsByClassName("button1")[i - 12].addEventListener('mouseover', function () {
				checkButtonHold(1, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #60b'>Prestige</span> buttons (<span id='multiHeader' style='color: #b00'>Multi: 0</span>)</h1>")
		$("#buttons").append("<div class='button button2' onclick='getFreeStuff(1)'><p class='buttonText'>Get 10 prestige<br>Requires 1 S-prestige</p></div>")
		for (i = 10; i < 20; i++) {
			button.className = "button button2"
			button.innerHTML = "<p class='buttonText'>Prestige:<br>+" + format(new Decimal(prestigeBoosts[i]).mul(game.power.add(1)).mul(game.relicPotionMultipliers[2])) + "<br>Multi cost:<br>" + format(prestigePrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button2")[i - 9].addEventListener('click', function () {
				buyButton(2, parseInt(this.id))
			})
			document.getElementsByClassName("button2")[i - 9].addEventListener('mouseover', function () {
				checkButtonHold(2, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #dd0'>Power</span> buttons (<span id='prestigeHeader' style='color: #60b'>Prestige: 0</span>)</h1>")
		$("#buttons").append("<div class='button button3' onclick='getFreeStuff(2)'><p class='buttonText'>Get 10<br>power<br>Requires 1 ascension</p></div>")
		for (i = 6; i < 16; i++) {
			button.className = "button button3"
			button.innerHTML = "<p class='buttonText'>Power:<br>+" + format(new Decimal(powerBoosts[i]).mul(game.superPrestige.add(1)).mul(game.relicPotionMultipliers[3])) + "<br>Prestige cost:<br>" + format(powerPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button3")[i - 5].addEventListener('click', function () {
				buyButton(3, parseInt(this.id))
			})
			document.getElementsByClassName("button3")[i - 5].addEventListener('mouseover', function () {
				checkButtonHold(3, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #0bf'>Super prestige</span> buttons (<span id='powerHeader' style='color: #dd0'>Power: 0</span>)</h1>")
		for (i = 0; i < 10; i++) {
			button.className = "button button4"
			button.innerHTML = "<p class='buttonText'>S-prestige:<br>+" + format(new Decimal(superPrestigeBoosts[i]).mul(game.ascension.add(1)).mul(game.relicPotionMultipliers[4])) + "<br>Power cost:<br>" + format(superPrestigePrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button4")[i].addEventListener('click', function () {
				buyButton(4, parseInt(this.id))
			})
			document.getElementsByClassName("button4")[i].addEventListener('mouseover', function () {
				checkButtonHold(4, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: white'>Ascension</span> buttons (<span id='superPrestigeHeader' style='color: #0bf'>Super prestige: 0</span>)</h1>")
		for (i = 0; i < 5; i++) {
			button.className = "button button5"
			button.innerHTML = "<p class='buttonText'>Ascension:<br>+" + format(new Decimal(ascensionBoosts[i]).mul(game.infernal.add(1)).mul(game.relicPotionMultipliers[5])) + "<br><span style='font-size: 18px'>S-prestige cost:</span><br>" + format(ascensionPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button5")[i].addEventListener('click', function () {
				buyButton(5, parseInt(this.id))
			})
			document.getElementsByClassName("button5")[i].addEventListener('mouseover', function () {
				checkButtonHold(5, parseInt(this.id))
			})
		}
	} else if (x == 3) {
		$("#buttons").append("<div class='button button1' onclick='getFreeStuff(4)'><p class='buttonText'>Get 1.00e20<br>multi<br>Requires 1 infernal</p></div>")
		for (i = 22; i < noOfButtons[0]; i++) {
			button.className = "button button1"
			button.innerHTML = "<p class='buttonText'>Multi:<br>+" + format(new Decimal(multiBoosts[i]).mul(game.prestige.add(1)).mul(game.relicPotionMultipliers[1])) + "<br>Cost:<br>$" + format(multiPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button1")[i - 21].addEventListener('click', function () {
				buyButton(1, parseInt(this.id))
			})
			document.getElementsByClassName("button1")[i - 21].addEventListener('mouseover', function () {
				checkButtonHold(1, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #60b'>Prestige</span> buttons (<span id='multiHeader' style='color: #b00'>Multi: 0</span>)</h1>")
		for (i = 20; i < noOfButtons[1]; i++) {
			button.className = "button button2"
			button.innerHTML = "<p class='buttonText'>Prestige:<br>+" + format(new Decimal(prestigeBoosts[i]).mul(game.power.add(1)).mul(game.relicPotionMultipliers[2])) + "<br>Multi cost:<br>" + format(prestigePrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button2")[i - 20].addEventListener('click', function () {
				buyButton(2, parseInt(this.id))
			})
			document.getElementsByClassName("button2")[i - 20].addEventListener('mouseover', function () {
				checkButtonHold(2, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #dd0'>Power</span> buttons (<span id='prestigeHeader' style='color: #60b'>Prestige: 0</span>)</h1>")
		for (i = 16; i < noOfButtons[2]; i++) {
			button.className = "button button3"
			button.innerHTML = "<p class='buttonText'>Power:<br>+" + format(new Decimal(powerBoosts[i]).mul(game.superPrestige.add(1)).mul(game.relicPotionMultipliers[3])) + "<br>Prestige cost:<br>" + format(powerPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button3")[i - 16].addEventListener('click', function () {
				buyButton(3, parseInt(this.id))
			})
			document.getElementsByClassName("button3")[i - 16].addEventListener('mouseover', function () {
				checkButtonHold(3, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #0bf'>Super prestige</span> buttons (<span id='powerHeader' style='color: #dd0'>Power: 0</span>)</h1>")
		$("#buttons").append("<div class='button button4' onclick='getFreeStuff(3)'><p class='buttonText'>Get 10<br>S-prestige<br>Requires 1 infernal</p></div>")
		for (i = 10; i < noOfButtons[3]; i++) {
			button.className = "button button4"
			button.innerHTML = "<p class='buttonText'>S-prestige:<br>+" + format(new Decimal(superPrestigeBoosts[i]).mul(game.ascension.add(1)).mul(game.relicPotionMultipliers[4])) + "<br>Power cost:<br>" + format(superPrestigePrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button4")[i - 9].addEventListener('click', function () {
				buyButton(4, parseInt(this.id))
			})
			document.getElementsByClassName("button4")[i - 9].addEventListener('mouseover', function () {
				checkButtonHold(4, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: white'>Ascension</span> buttons (<span id='superPrestigeHeader' style='color: #0bf'>Super prestige: 0</span>)</h1>")
		for (i = 5; i < noOfButtons[4]; i++) {
			button.className = "button button5"
			button.innerHTML = "<p class='buttonText'>Ascension:<br>+" + format(new Decimal(ascensionBoosts[i]).mul(game.infernal.add(1)).mul(game.relicPotionMultipliers[5])) + "<br><span style='font-size: 18px'>S-prestige cost:</span><br>" + format(ascensionPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button5")[i - 5].addEventListener('click', function () {
				buyButton(5, parseInt(this.id))
			})
			document.getElementsByClassName("button5")[i - 5].addEventListener('mouseover', function () {
				checkButtonHold(5, parseInt(this.id))
			})
		}
		$("#buttons").append("<br><br><br><h1><span style='color: #f50'>Infernal</span> buttons (<span id='ascensionHeader' style='color: white'>Ascension: 0</span>)</h1>")
		for (i = 0; i < noOfButtons[5]; i++) {
			button.className = "button button6"
			button.innerHTML = "<p class='buttonText'>Infernal:<br>+" + format(new Decimal(infernalBoosts[i]).mul(game.relicPotionMultipliers[5])) + "<br><span style='font-size: 18px'>Ascension cost:</span><br>" + format(infernalPrices[i]) + "</p>"
			button.setAttribute("id", i)
			document.getElementById("buttons").appendChild(button.cloneNode(true))
			document.getElementsByClassName("button6")[i].addEventListener('click', function () {
				buyButton(6, parseInt(this.id))
			})
			document.getElementsByClassName("button6")[i].addEventListener('mouseover', function () {
				checkButtonHold(6, parseInt(this.id))
			})
		}
	}
}

loadWorld(1)

//Button purchasing (could be simplified)
function buyButton(x, y) {
	if (x == 1) {
		if (game.money.gte(multiPrices[y])) {
			game.money = game.money.sub(multiPrices[y])
			game.multi = game.multi.add(new Decimal(multiBoosts[y]).mul(game.prestige.add(1)).mul(game.relicPotionMultipliers[1]))
		}
	} else if (x == 2) {
		if (game.multi.gte(prestigePrices[y])) {
			game.money = new Decimal(0)
			game.multi = new Decimal(1)
			game.prestige = game.prestige.add(new Decimal(prestigeBoosts[y]).mul(game.power.add(1)).mul(game.relicPotionMultipliers[2]))
			game.XP = game.XP.add(1)
			checkNextCrateLevel()
			loadWorld(currentWorld)
		}
	} else if (x == 3) {
		if (game.prestige.gte(powerPrices[y])) {
			game.money = new Decimal(0)
			game.multi = new Decimal(1)
			game.prestige = new Decimal(0)
			game.power = game.power.add(new Decimal(powerBoosts[y]).mul(game.superPrestige.add(1)).mul(game.relicPotionMultipliers[3]))
			game.XP = game.XP.add(4)
			checkNextCrateLevel()
			loadWorld(currentWorld)
		}
	} else if (x == 4) {
		if (game.power.gte(superPrestigePrices[y])) {
			game.money = new Decimal(0)
			game.multi = new Decimal(1)
			game.prestige = new Decimal(0)
			game.power = new Decimal(0)
			game.superPrestige = game.superPrestige.add(new Decimal(superPrestigeBoosts[y]).mul(game.ascension.add(1)).mul(game.relicPotionMultipliers[4]))
			game.XP = game.XP.add(16)
			checkNextCrateLevel()
			loadWorld(currentWorld)
		}
	} else if (x == 5) {
		if (game.superPrestige.gte(ascensionPrices[y])) {
			game.money = new Decimal(0)
			game.multi = new Decimal(1)
			game.prestige = new Decimal(0)
			game.power = new Decimal(0)
			game.superPrestige = new Decimal(0)
			game.ascension = game.ascension.add(new Decimal(ascensionBoosts[y]).mul(game.infernal.add(1)).mul(game.relicPotionMultipliers[5]))
			game.XP = game.XP.add(64)
			checkNextCrateLevel()
			loadWorld(currentWorld)
		}
	} else if (x == 6) {
		if (game.ascension.gte(infernalPrices[y])) {
			game.money = new Decimal(0)
			game.multi = new Decimal(1)
			game.prestige = new Decimal(0)
			game.power = new Decimal(0)
			game.superPrestige = new Decimal(0)
			game.ascension = new Decimal(0)
			game.infernal = game.infernal.add(new Decimal(infernalBoosts[y]).mul(game.relicPotionMultipliers[6]))
			game.XP = game.XP.add(256)
			checkNextCrateLevel()
			loadWorld(currentWorld)
		}
	}
}


var mouseDown = 0;
document.body.onmousedown = function () {
	mouseDown = 1;
}
document.body.onmouseup = function () {
	mouseDown = 0;
}

function checkButtonHold(x, y) {
	if (mouseDown) buyButton(x, y)
}

function getFreeStuff(x) {
	if (x == 1 && game.superPrestige.gte(1) && game.prestige.lt(10)) {
		game.prestige = new Decimal(10)
		loadWorld(currentWorld)
	} else if (x == 2 && game.ascension.gte(1) && game.power.lt(10)) {
		game.power = new Decimal(10)
		loadWorld(currentWorld)
	} else if (x == 3 && game.infernal.gte(1) && game.superPrestige.lt(10)) {
		game.superPrestige = new Decimal(10)
		loadWorld(currentWorld)
	} else if (x == 4 && game.infernal.gte(1) && game.multi.lt(1e20)) {
		game.multi = new Decimal(1e20)
		loadWorld(currentWorld)
	}
}

function unboxItem(x) {
	totalWeight = 0
	itemType = 0
	itemChosen = 0
	specialType = 0
	if (x == 1) {
		//Determines the type of item to roll for (1 = pattern, 2 = relic, 3 = potion)
		for (i = 0; i < basicCrateRarities[0].length; i++) totalWeight += basicCrateRarities[0][i]
		for (i = 0; i < basicCrateRarities[0].length; i++) {
			if (Math.random() * totalWeight < basicCrateRarities[0][i]) {
				itemType = i + 1
				i = basicCrateRarities[0].length
			} else {
				totalWeight -= basicCrateRarities[0][i]
			}
		}
		totalWeight = 0
		for (i = 0; i < basicCrateRarities[itemType].length; i++) totalWeight += basicCrateRarities[itemType][i][1]
		for (i = 0; i < basicCrateRarities[itemType].length; i++) {
			if (Math.random() * totalWeight < basicCrateRarities[itemType][i][1]) {
				itemChosen = basicCrateRarities[itemType][i][0]
				i = basicCrateRarities[itemType].length
			} else {
				totalWeight -= basicCrateRarities[itemType][i][1]
			}
		}
		if (itemType == 1) {
			if (Math.random() * 10 < 1) specialType = 2
			else if (Math.random() * 10 < 1) specialType = 1
		}
		subtractItem(0, 0)
	} else if (x == 2) {
		//Determines the type of item to roll for (1 = pattern, 2 = relic, 3 = potion)
		for (i = 0; i < advancedCrateRarities[0].length; i++) totalWeight += advancedCrateRarities[0][i]
		for (i = 0; i < advancedCrateRarities[0].length; i++) {
			if (Math.random() * totalWeight < advancedCrateRarities[0][i]) {
				itemType = i + 1
				i = advancedCrateRarities[0].length
			} else {
				totalWeight -= advancedCrateRarities[0][i]
			}
		}
		totalWeight = 0
		for (i = 0; i < advancedCrateRarities[itemType].length; i++) totalWeight += advancedCrateRarities[itemType][i][1]
		for (i = 0; i < advancedCrateRarities[itemType].length; i++) {
			if (Math.random() * totalWeight < advancedCrateRarities[itemType][i][1]) {
				itemChosen = advancedCrateRarities[itemType][i][0]
				i = advancedCrateRarities[itemType].length
			} else {
				totalWeight -= advancedCrateRarities[itemType][i][1]
			}
		}
		if (itemType == 1) {
			if (Math.random() * 10 < 1) specialType = 2
			else if (Math.random() * 10 < 1) specialType = 1
		}
		subtractItem(0, 1)
	}
	addItem(itemType, itemChosen, specialType)
}

//Item type, item chosen, special type
function addItem(x, y, z = 0) {
	if (x == 0) {
		listItemPoint = -1
		for (i = 0; i < game.crates.length; i++) {
			if (y == game.crates[i][0]) listItemPoint = i
		}
		if (listItemPoint == -1) {
			game.crates.push([y, 1])
		} else {
			game.crates[listItemPoint][1]++
		}
	} else if (x == 1) {
		listItemPoint = -1
		for (i = 0; i < game.patterns.length; i++) {
			if (y == game.patterns[i][0] && z == game.patterns[i][1]) listItemPoint = i
		}
		if (listItemPoint == -1) {
			game.patterns.push([y, z, 1])
		} else {
			game.patterns[listItemPoint][2]++
		}
		alert("Got a " + patternSpecialTypes[z] + patternNames[y] + " pattern!")
	} else if (x == 2) {
		listItemPoint = -1
		for (i = 0; i < game.relics.length; i++) {
			if (y == game.relics[i][0]) listItemPoint = i
		}
		if (listItemPoint == -1) {
			game.relics.push([y, 1])
		} else {
			game.relics[listItemPoint][1]++
		}
		calculateRelicPotionMultipliers()
		alert("Got a " + relicNames[y] + " relic!")
	} else if (x == 3) {
		listItemPoint = -1
		for (i = 0; i < game.potions.length; i++) {
			if (y == game.potions[i][0]) listItemPoint = i
		}
		if (listItemPoint == -1) {
			game.potions.push([y, 1])
		} else {
			game.potions[listItemPoint][1]++
		}
		alert("Got a " + potionNames[y] + "!")
	}
	displayItems(game.currentItemScreen)
}

function subtractItem(x, y, z = 0) {
	if (x == 0) {
		listItemPoint = -1
		for (i = 0; i < game.crates.length; i++) {
			if (y == game.crates[i][0]) listItemPoint = i
		}
		if (listItemPoint != -1) {
			if (game.crates[listItemPoint][1] == 1) {
				listTemp = game.crates.slice(listItemPoint + 1)
				game.crates = game.crates.slice(0, listItemPoint).concat(listTemp)
			} else {
				game.crates[listItemPoint][1]--
			}
		}
		displayItems(1)
	} else if (x == 1) {
		listItemPoint = -1
		for (i = 0; i < game.patterns.length; i++) {
			if (y == game.patterns[i][0] && z == game.patterns[i][1]) listItemPoint = i
		}
		if (listItemPoint != -1) {
			if (game.patterns[listItemPoint][2] == 1) {
				listTemp = game.patterns.slice(listItemPoint + 1)
				game.patterns = game.patterns.slice(0, listItemPoint).concat(listTemp)
			} else {
				game.patterns[listItemPoint][2]--
			}
		}
		displayItems(2)
	} else if (x == 2) {
		listItemPoint = -1
		for (i = 0; i < game.relics.length; i++) {
			if (y == game.relics[i][0]) listItemPoint = i
		}
		if (listItemPoint != -1) {
			if (game.relics[listItemPoint][1] == 1) {
				listTemp = game.relics.slice(listItemPoint + 1)
				game.relics = game.relics.slice(0, listItemPoint).concat(listTemp)
			} else {
				game.relics[listItemPoint][1]--
			}
		}
		displayItems(3)
	} else if (x == 3) {
		listItemPoint = -1
		for (i = 0; i < game.potions.length; i++) {
			if (y == game.potions[i][0]) listItemPoint = i
		}
		if (listItemPoint != -1) {
			if (game.potions[listItemPoint][1] == 1) {
				listTemp = game.potions.slice(listItemPoint + 1)
				game.potions = game.potions.slice(0, listItemPoint).concat(listTemp)
			} else {
				game.potions[listItemPoint][1]--
			}
		}
		displayItems(4)
	}
}

function showItems(x) {
	if (x != 0 && game.currentItemScreen != x) {
		game.currentItemScreen = x
		$('#miningScreen').css('display', 'none')
		$("#itemScreen").css("display", "block")
		if (x == 1) {
			$("#itemScreenTitle").html("Crates")
		} else if (x == 2) {
			$("#itemScreenTitle").html("Patterns")
		} else if (x == 3) {
			$("#itemScreenTitle").html("Relics")
		} else if (x == 4) {
			$("#itemScreenTitle").html("Potions")
		}
		displayItems(x)
	} else {
		$("#itemScreen").css("display", "none")
		game.currentItemScreen = 0
	}
}

//Displays all items in the item screen
function displayItems(x) {
	hideItemInfo()
	let itemBox = document.createElement("div")
	itemBox.style.display = "inline-block"
	itemBox.style.position = "relative"
	itemBox.style.width = "128px"
	itemBox.style.height = "160px"
	itemBox.style.margin = "6px 0 0 8px"
	itemBox.style.border = "6px solid #222"
	itemBox.style.cursor = "pointer"
	itemBox.style.backgroundColor = "#888"
	itemBox.style.backgroundImage = "url('images/halftoneDots.png')"
	itemBox.className += "itemBox"
	if (x == 1) {
		game.cratesNotChecked = 0
		$("#itemScreenInner").html("")
		for (i = 0; i < game.crates.length; i++) {
			itemBox.innerHTML = "<img class='item' src='images/crate" + (game.crates[i][0] + 1) + ".png'><br><p class='itemText'>" + (game.crates[i][1]) + "</p>"
			itemBox.setAttribute("data-itemnumber", i)
			itemBox.setAttribute("data-itemtype", game.crates[i][0])
			$("#itemScreenInner").append(itemBox.cloneNode(true))
			document.getElementsByClassName("itemBox")[i].addEventListener('click', function () {
				unboxItem(parseInt(this.dataset.itemtype) + 1)
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseover', function () {
				showItemInfo(1, parseInt(this.dataset.itemnumber))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseout', hideItemInfo)
		}
	} else if (x == 2) {
		$("#itemScreenInner").html("")
		for (i = 0; i < game.patterns.length; i++) {
			if (game.patterns[i][1] == 2) {
				itemBox.innerHTML = "<img class='item' style='filter: hue-rotate(240deg)' src='images/pattern" + (game.patterns[i][0] + 1) + "_color.png'><br><p class='itemText'>" + (game.patterns[i][2]) + "</p>"
			} //blue
			else if (game.patterns[i][1] == 1) {
				itemBox.innerHTML = "<img class='item' src='images/pattern" + (game.patterns[i][0] + 1) + "_color.png'><br><p class='itemText'>" + (game.patterns[i][2]) + "</p>"
			} //red
			else {
				itemBox.innerHTML = "<img class='item' src='images/pattern" + (game.patterns[i][0] + 1) + ".png'><br><p class='itemText'>" + (game.patterns[i][2]) + "</p>"
			} //black
			itemBox.setAttribute("data-itemnumber", i)
			itemBox.setAttribute("data-itemtype", game.patterns[i][0])
			itemBox.setAttribute("data-specialtype", game.patterns[i][1])
			$("#itemScreenInner").append(itemBox.cloneNode(true))
			document.getElementsByClassName("itemBox")[i].addEventListener('click', function () {
				setPattern(parseInt(this.dataset.itemtype) + 1, parseInt(this.dataset.specialtype))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseover', function () {
				showItemInfo(2, parseInt(this.dataset.itemnumber))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseout', hideItemInfo)
		}
	} else if (x == 3) {
		$("#itemScreenInner").html("")
		for (i = 0; i < game.relics.length; i++) {
			itemBox.innerHTML = "<img class='item' src='images/relic" + (game.relics[i][0] + 1) + ".png'><br><p class='itemText'>" + (game.relics[i][1]) + "</p>"
			itemBox.setAttribute("data-itemnumber", i)
			$("#itemScreenInner").append(itemBox.cloneNode(true))
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseover', function () {
				showItemInfo(3, parseInt(this.dataset.itemnumber))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseout', hideItemInfo)
		}
	} else if (x == 4) {
		$("#itemScreenInner").html("")
		for (i = 0; i < game.potions.length; i++) {
			itemBox.innerHTML = "<img class='item' src='images/potion" + (game.potions[i][0] + 1) + ".png'><br><p class='itemText'>" + (game.potions[i][1]) + "</p>"
			itemBox.setAttribute("data-itemnumber", i)
			itemBox.setAttribute("data-itemtype", game.potions[i][0])
			$("#itemScreenInner").append(itemBox.cloneNode(true))
			document.getElementsByClassName("itemBox")[i].addEventListener('click', function () {
				activatePotion(parseInt(this.dataset.itemtype))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseover', function () {
				showItemInfo(4, parseInt(this.dataset.itemnumber))
			})
			document.getElementsByClassName("itemBox")[i].addEventListener('mouseout', hideItemInfo)
		}
	}
}

function showItemInfo(x, y) {
	$("#itemScreenIcon").css("display", "block")
	$("#itemScreenIcon").css("filter", "none")
	if (x == 1) {
		$("#itemScreenIcon").css("background-image", "url('images/crate" + (game.crates[y][0] + 1) + ".png')")
		$("#itemScreenName").html(crateNames[game.crates[y][0]])
		$("#itemScreenInfoText").html("May contain a pattern, relic or potion.")
	} else if (x == 2) {
		if (game.patterns[y][1] == 2) {
			$("#itemScreenIcon").css("background-image", "url('images/pattern" + (game.patterns[y][0] + 1) + "_color.png')")
			$("#itemScreenIcon").css("filter", "hue-rotate(240deg)")
			$("#itemScreenName").html(patternSpecialTypes[game.patterns[y][1]] + patternNames[game.patterns[y][0]] + "<br>Pattern rarity: " + (game.patterns[y][0] + 4))
		} else if (game.patterns[y][1] == 1) {
			$("#itemScreenIcon").css("background-image", "url('images/pattern" + (game.patterns[y][0] + 1) + "_color.png')")
			$("#itemScreenIcon").css("filter", "none")
			$("#itemScreenName").html(patternSpecialTypes[game.patterns[y][1]] + patternNames[game.patterns[y][0]] + "<br>Pattern rarity: " + (game.patterns[y][0] + 4))
		} else {
			$("#itemScreenIcon").css("background-image", "url('images/pattern" + (game.patterns[y][0] + 1) + ".png')")
			$("#itemScreenIcon").css("filter", "none")
			$("#itemScreenName").html(patternSpecialTypes[game.patterns[y][1]] + patternNames[game.patterns[y][0]] + "<br>Pattern rarity: " + (game.patterns[y][0] + 1))
		}
	} else if (x == 3) {
		$("#itemScreenIcon").css("background-image", "url('images/relic" + (game.relics[y][0] + 1) + ".png')")
		$("#itemScreenName").html(relicNames[game.relics[y][0]])
		$("#itemScreenInfoText").html("+" + (relicEffects[game.relics[y][0]][1] * 100) + "% " + resetTiers[relicEffects[game.relics[y][0]][0]] + " gain (total: " + (relicEffects[game.relics[y][0]][1] * 100 * game.relics[y][1]) + "%)")
	} else if (x == 4) {
		$("#itemScreenIcon").css("background-image", "url('images/potion" + (game.potions[y][0] + 1) + ".png')")
		$("#itemScreenName").html(potionNames[game.potions[y][0]])
		$("#itemScreenInfoText").html("Multiplies " + resetTiers[game.potions[y][0]] + " gain by 2 for 5 minutes.")
	}
}

function hideItemInfo() {
	$("#itemScreenIcon").css("display", "none")
	$("#itemScreenName").html("")
	$("#itemScreenInfoText").html("")
}

function checkNextCrateLevel() {
	game.level = XPToLevel(game.XP)
	if (game.level.gte(game.nextCrateLevel) && game.level.lt(100)) {
		// equivalent to addItem(0,0) but for multiple crates
		listItemPoint = -1
		for (i = 0; i < game.crates.length; i++) {
			if (0 == game.crates[i][0]) listItemPoint = i
		}
		if (listItemPoint == -1) {
			game.crates.push([0, 1]);
			game.crates[0][1] += Decimal.min(game.level.sub(game.nextCrateLevel), 10).toNumber()
		} else {
			game.crates[listItemPoint][1] += Decimal.min(game.level.sub(game.nextCrateLevel), 10).add(1).toNumber()
		}
		game.cratesNotChecked += Decimal.min(game.level.sub(game.nextCrateLevel), 10).add(1).toNumber()
		game.nextCrateLevel = game.level.add(1)
	}
}

function setPattern(x, y) {
	game.currentPattern = [x, y]
	if (y == 2) {
		$("#backgroundPattern").css("background-image", "url('images/pattern" + x + "_color.png')")
		$("#backgroundPattern").css("filter", "hue-rotate(240deg)")
	} else if (y == 1) {
		$("#backgroundPattern").css("background-image", "url('images/pattern" + x + "_color.png')")
		$("#backgroundPattern").css("filter", "none")
	} else {
		$("#backgroundPattern").css("background-image", "url('images/pattern" + x + ".png')")
		$("#backgroundPattern").css("filter", "none")
	}
}

function activatePotion(x) {
	if (game.potionCooldowns[x] == 0 || confirm("This potion is already active! Are you sure you want to use another potion? It will set the timer back to 5 minutes.")) {
		game.potionCooldowns[x] = 300
		subtractItem(3, x)
		calculateRelicPotionMultipliers()
	}
}

function calculateRelicPotionMultipliers() {
	game.relicPotionMultipliers = [new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1), new Decimal(1)]
	for (i = 0; i < game.relics.length; i++) {
		game.relicPotionMultipliers[relicEffects[game.relics[i][0]][0]] = game.relicPotionMultipliers[relicEffects[game.relics[i][0]][0]].mul(relicEffects[game.relics[i][0]][1] * game.relics[i][1] + 1) //Black magic shit
	}
	for (i = 0; i < game.potionCooldowns.length; i++) {
		if (game.potionCooldowns[i] > 0) game.relicPotionMultipliers[i] = game.relicPotionMultipliers[i].mul(2)
	}
	loadWorld(currentWorld) //Reload buttons to display current multipliers
}

//function XPToLevel(x) {return Math.floor((x / 5) ** 0.6) + 1}
//function levelToXP(x) {return Math.ceil((x-1) ** (1/0.6) * 5)}
function XPToLevel(x) {
	return x.div(5).pow(0.6).floor().add(1)
}

function levelToXP(x) {
	return x.sub(1).pow(1 / 0.6).mul(5).ceil()
}

function levelToColour(x) {
	colour = Math.floor(((x - 1) ** 0.5) * 50) % 960
	stage = Math.ceil((colour + 1) / 160)
	if (stage == 1) {
		return "#c0" + (32 + colour).toString(16) + "20"
	} //Red to yellow
	else if (stage == 2) {
		return "#" + (192 - (colour - 160)).toString(16) + "c020"
	} //Yellow to green
	else if (stage == 3) {
		return "#20c0" + (32 + (colour - 320)).toString(16)
	} //Green to light blue
	else if (stage == 4) {
		return "#20" + (192 - (colour - 480)).toString(16) + "c0"
	} //Light blue to dark blue
	else if (stage == 5) {
		return "#" + (32 + (colour - 640)).toString(16) + "20c0"
	} //Dark blue to pink
	else if (stage == 6) {
		return "#c020" + (192 - (colour - 800)).toString(16)
	} //Pink to red
}

function nextWorld() {
	if (currentWorld < game.worldsUnlocked) {
		currentWorld++
		loadWorld(currentWorld)
		if (currentWorld == 1) {
			$(".topBarArrow").eq(0).css("display", "none")
		} else {
			$(".topBarArrow").eq(0).css("display", "inline-block")
		}
	} else {
		displayWorldPurchaseScreen(currentWorld + 1)
	}
}

function previousWorld() {
	if (currentWorld > 1) {
		currentWorld--
		loadWorld(currentWorld)
		if (currentWorld == 1) {
			$(".topBarArrow").eq(0).css("display", "none")
		} else {
			$(".topBarArrow").eq(0).css("display", "inline-block")
		}
		$('#worldPurchaseScreen').css('display', 'none')
	}
}

Mousetrap.bind('right', nextWorld);
Mousetrap.bind('left', previousWorld);
Mousetrap.bind('d', nextWorld);
Mousetrap.bind('a', previousWorld);

function displayWorldPurchaseScreen(x) {
	$("#worldPurchaseScreen").css("display", "block")
	$("#worldPurchaseText").html("Unlock world " + x)
	$("#worldPurchaseButton").html("Purchase world " + x + "<br>Costs $" + format(worldCosts[x - 2]))
}

function purchaseWorld() {
	if (game.money.gte(worldCosts[game.worldsUnlocked - 1]) && game.worldsUnlocked < 3) {
		game.money = game.money.sub(worldCosts[game.worldsUnlocked - 1])
		game.worldsUnlocked++
		$("#worldPurchaseScreen").css("display", "none")
		if (game.worldsUnlocked == 2) {
			$(".resourceText").eq(4).css("display", "inline-block")
			$(".resourceText").eq(5).css("display", "inline-block")
			$(".topButton2").eq(0).css("display", "inline-block")
		} else if (game.worldsUnlocked == 3) {
			$(".resourceText").eq(6).css("display", "inline-block")
		}
		addItem(0, 1)
		game.cratesNotChecked++
		alert("Got an advanced crate for unlocking world " + game.worldsUnlocked + "!")
		nextWorld()
	}
}

function displayMiningScreen() {
	$('#miningScreen').css('display', 'block')
	$("#minerPurchaseButton").html("Buy a miner<br>Costs $" + format(game.minerCost))
	$("#miners").html(format(game.miners))
	showItems(0)
}

function purchaseMiner() {
	if (game.money.gte(game.minerCost)) {
		game.money = game.money.sub(game.minerCost)
		game.miners = game.miners.add(1)
		game.minerCost = new Decimal(1e5).pow(game.miners).mul(1e30)
		$("#minerPurchaseButton").html("Buy a miner<br>Costs $" + format(game.minerCost))
		$("#miners").html(format(game.miners))
	}
}

function gainRandomMiningResource() {
	//This is probably a bad way of doing this
	if (Math.random() > 0.5) {
		game.miningResources[0] = game.miningResources[0].add(game.miningResources[1].add(1))
	} else if (Math.random() > 0.5) {
		game.miningResources[1] = game.miningResources[1].add(game.miningResources[2].add(1))
	} else if (Math.random() > 0.5) {
		game.miningResources[2] = game.miningResources[2].add(game.miningResources[3].add(1))
	} else if (Math.random() > 0.5) {
		game.miningResources[3] = game.miningResources[3].add(game.miningResources[4].add(1))
	} else if (Math.random() > 0.5) {
		game.miningResources[4] = game.miningResources[4].add(game.miningResources[5].add(1))
	} else if (Math.random() > 0.5) {
		game.miningResources[5] = game.miningResources[5].add(game.miningResources[6].add(1))
	} else {
		game.miningResources[6] = game.miningResources[6].add(1)
	}
}
