import {game} from "./state.js";
import {format} from "./format.js";

const ITEM_TITLES = {
	crates: "Crates",
	patterns: "Patterns",
	relics: "Relics",
	potions: "Potions"
};

function weightedChoice(entries) {
	let remaining = entries.reduce((total, entry) => total + entry.weight, 0);
	for (const entry of entries) {
		if (Math.random() * remaining < entry.weight) return entry.id;
		remaining -= entry.weight;
	}
	return entries[entries.length - 1].id;
}

function themedImage(item) {
	return document.body.dataset.theme === "modern" && item.modernImage ? item.modernImage : item.image;
}

function weightedCategory(weights) {
	return weightedChoice(Object.entries(weights).map(([id, weight]) => ({id, weight})));
}

function findStack(collection, id, specialType) {
	return collection.find(entry => entry[0] === id && (specialType === undefined || entry[1] === specialType));
}

function removeStack(collection, id, specialType) {
	const index = collection.findIndex(entry => entry[0] === id && (specialType === undefined || entry[1] === specialType));
	if (index < 0) return false;
	const amountIndex = specialType === undefined ? 1 : 2;
	if (collection[index][amountIndex] <= 1) collection.splice(index, 1);
	else collection[index][amountIndex]--;
	return true;
}

export function addItem(config, type, id, specialType = 0) {
	if (type === "crate") {
		const existing = findStack(game.crates, id);
		if (existing) existing[1]++;
		else game.crates.push([id, 1]);
		return;
	}
	if (type === "pattern") {
		const existing = findStack(game.patterns, id, specialType);
		if (existing) existing[2]++;
		else game.patterns.push([id, specialType, 1]);
		const special = config.patternSpecialById[specialType];
		alert(`Got a ${special.namePrefix}${config.patternById[id].name} pattern!`);
		return;
	}
	if (type === "relic") {
		const existing = findStack(game.relics, id);
		if (existing) existing[1]++;
		else game.relics.push([id, 1]);
		calculateItemMultipliers(config);
		alert(`Got a ${config.relicById[id].name} relic!`);
		return;
	}
	const existing = findStack(game.potions, id);
	if (existing) existing[1]++;
	else game.potions.push([id, 1]);
	alert(`Got a ${config.potionById[id].name}!`);
}

function rollPatternSpecial(config) {
	for (const roll of config.patterns.specialRolls) {
		if (Math.random() < roll.chance) return roll.id;
	}
	return 0;
}

export function openCrate(config, crateId) {
	const crate = config.crateById[crateId];
	if (!crate || !removeStack(game.crates, crateId)) return;
	const category = weightedCategory(config.crates.categoryWeights);
	const itemId = weightedChoice(crate.contents[category]);
	addItem(config, category, itemId, category === "pattern" ? rollPatternSpecial(config) : 0);
	renderItems(config, "crates");
}

function patternPresentation(config, patternId, specialId) {
	const pattern = config.patternById[patternId];
	const special = config.patternSpecialById[specialId];
	return {
		image: document.body.dataset.theme === "modern"
			? pattern.modernImage
			: (special.imageSuffix ? pattern.colorImage : pattern.image),
		filter: document.body.dataset.theme === "modern" && specialId
			? `hue-rotate(${specialId === 1 ? 300 : 170}deg)`
			: special.filter,
		name: `${special.namePrefix}${pattern.name}`,
		rarity: pattern.id + 1 + special.rarityBonus
	};
}

export function setPattern(config, patternNumber, specialId) {
	const patternId = patternNumber - 1;
	const presentation = patternPresentation(config, patternId, specialId);
	game.currentPattern = [patternNumber, specialId];
	const background = document.getElementById("backgroundPattern");
	background.style.backgroundImage = `url("${presentation.image}")`;
	background.style.filter = presentation.filter;
}

function itemCard(config, type, entry, index) {
	const fragment = document.getElementById("item-card-template").content.cloneNode(true);
	const card = fragment.querySelector(".itemBox");
	const image = fragment.querySelector(".item");
	const amount = fragment.querySelector(".itemText");
	card.dataset.itemType = type;
	card.dataset.itemIndex = index;
	if (type === "crates") {
		const item = config.crateById[entry[0]];
		image.src = themedImage(item);
		image.alt = item.name;
		amount.textContent = entry[1];
		card.dataset.itemId = entry[0];
	} else if (type === "patterns") {
		const item = patternPresentation(config, entry[0], entry[1]);
		image.src = themedImage(item);
		image.alt = item.name;
		image.style.filter = item.filter;
		amount.textContent = entry[2];
		card.dataset.itemId = entry[0];
		card.dataset.specialId = entry[1];
	} else if (type === "relics") {
		const item = config.relicById[entry[0]];
		image.src = themedImage(item);
		image.alt = item.name;
		amount.textContent = entry[1];
	} else {
		const item = config.potionById[entry[0]];
		image.src = themedImage(item);
		image.alt = item.name;
		amount.textContent = entry[1];
		card.dataset.itemId = entry[0];
	}
	return fragment;
}

export function showItems(config, type) {
	document.getElementById("miningScreen").style.display = "none";
	if (game.currentItemScreen === type) {
		closeItems();
		return;
	}
	game.currentItemScreen = type;
	document.getElementById("itemScreenTitle").textContent = ITEM_TITLES[type];
	document.getElementById("itemScreen").style.display = "block";
	renderItems(config, type);
}

export function closeItems() {
	document.getElementById("itemScreen").style.display = "none";
	game.currentItemScreen = "";
	hideItemInfo();
}

export function renderItems(config, type = game.currentItemScreen) {
	if (!type) return;
	hideItemInfo();
	const collection = game[type];
	if (type === "crates") game.cratesNotChecked = 0;
	const root = document.getElementById("itemScreenInner");
	root.replaceChildren();
	collection.forEach((entry, index) => root.append(itemCard(config, type, entry, index)));
}

export function activateItem(config, card) {
	const type = card.dataset.itemType;
	const id = Number(card.dataset.itemId);
	if (type === "crates") openCrate(config, id);
	else if (type === "patterns") setPattern(config, id + 1, Number(card.dataset.specialId));
	else if (type === "potions") activatePotion(config, id);
}

export function showItemInfo(config, card) {
	const type = card.dataset.itemType;
	const entry = game[type][Number(card.dataset.itemIndex)];
	if (!entry) return;
	const icon = document.getElementById("itemScreenIcon");
	const name = document.getElementById("itemScreenName");
	const info = document.getElementById("itemScreenInfoText");
	icon.style.display = "block";
	icon.style.filter = "none";
	if (type === "crates") {
		const item = config.crateById[entry[0]];
		icon.style.backgroundImage = `url("${themedImage(item)}")`;
		name.textContent = item.name;
		info.textContent = "May contain a pattern, relic or potion.";
	} else if (type === "patterns") {
		const item = patternPresentation(config, entry[0], entry[1]);
		icon.style.backgroundImage = `url("${themedImage(item)}")`;
		icon.style.filter = item.filter;
		name.textContent = `${item.name}\nPattern rarity: ${item.rarity}`;
		info.textContent = "";
	} else if (type === "relics") {
		const item = config.relicById[entry[0]];
		icon.style.backgroundImage = `url("${themedImage(item)}")`;
		name.textContent = item.name;
		info.textContent = `+${item.bonus * 100}% ${item.resource} gain (total: ${item.bonus * 100 * entry[1]}%)`;
	} else {
		const item = config.potionById[entry[0]];
		icon.style.backgroundImage = `url("${themedImage(item)}")`;
		name.textContent = item.name;
		info.textContent = `Multiplies ${item.resource} gain by ${config.potions.multiplier} for ${config.potions.durationSeconds / 60} minutes.`;
	}
}

export function hideItemInfo() {
	document.getElementById("itemScreenIcon").style.display = "none";
	document.getElementById("itemScreenName").textContent = "";
	document.getElementById("itemScreenInfoText").textContent = "";
}

export function activatePotion(config, potionId) {
	if (game.potionCooldowns[potionId] > 0 && !confirm("This potion is already active. Use another and reset its timer?")) return;
	if (!removeStack(game.potions, potionId)) return;
	game.potionCooldowns[potionId] = config.potions.durationSeconds;
	calculateItemMultipliers(config);
	renderItems(config, "potions");
}

export function calculateItemMultipliers(config) {
	game.relicPotionMultipliers = config.progression.resources.map(() => new Decimal(1));
	for (const [relicId, amount] of game.relics) {
		const relic = config.relicById[relicId];
		const resourceIndex = config.progression.resources.findIndex(resource => resource.id === relic.resource);
		game.relicPotionMultipliers[resourceIndex] = game.relicPotionMultipliers[resourceIndex].mul(relic.bonus * amount + 1);
	}
	config.potions.items.forEach(potion => {
		if (game.potionCooldowns[potion.id] <= 0) return;
		const resourceIndex = config.progression.resources.findIndex(resource => resource.id === potion.resource);
		game.relicPotionMultipliers[resourceIndex] = game.relicPotionMultipliers[resourceIndex].mul(config.potions.multiplier);
	});
}
