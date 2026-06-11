import {currentWorld, game, setCurrentWorld} from "./state.js";
import {calculateButtonGain, canBuyButton, claimFreeResource} from "./progression.js";
import {format} from "./format.js";

const buttonsRoot = () => document.getElementById("buttons");

function setField(root, field, value) {
	root.querySelector(`[data-field="${field}"]`).textContent = value;
}

function resourceLabel(config, resourceId) {
	const resource = config.resourceById[resourceId];
	return resource.shortName || resource.name;
}

function buildPurchaseButton(config, tier, section, button, buttonIndex) {
	const fragment = document.getElementById("game-button-template").content.cloneNode(true);
	const element = fragment.querySelector(".button");
	element.classList.add(tier.className);
	element.style.backgroundImage = `url("${section.image}")`;
	element.dataset.tier = tier.id;
	element.dataset.buttonIndex = buttonIndex;
	setField(fragment, "gain-name", resourceLabel(config, tier.gainResource));
	setField(fragment, "gain-value", format(calculateButtonGain(config, tier, button)));
	setField(fragment, "cost-name", resourceLabel(config, tier.costResource));
	setField(fragment, "cost-value", `${tier.costResource === "money" ? "$" : ""}${format(button.cost)}`);
	return fragment;
}

function buildFreeButton(config, tier, section, freeButton) {
	const fragment = document.getElementById("free-button-template").content.cloneNode(true);
	const element = fragment.querySelector(".button");
	element.classList.add(tier.className);
	element.style.backgroundImage = `url("${section.image}")`;
	element.dataset.tier = tier.id;
	element.dataset.targetResource = freeButton.targetResource;
	setField(fragment, "free-amount", format(freeButton.amount));
	setField(fragment, "free-resource", resourceLabel(config, freeButton.targetResource));
	setField(fragment, "required-amount", format(freeButton.requiredAmount));
	setField(fragment, "required-resource", resourceLabel(config, freeButton.requiredResource));
	return fragment;
}

export function renderWorld(config) {
	const world = config.worldById[currentWorld];
	document.body.style.backgroundColor = world.background;
	document.getElementById("topBarWorldNumber").textContent = `World ${world.id}`;
	document.getElementById("topBarWorldName").textContent = world.name;
	buttonsRoot().replaceChildren();
	for (const section of world.sections) {
		const tier = config.tierById[section.tier];
		const fragment = document.getElementById("world-section-template").content.cloneNode(true);
		const sectionElement = fragment.querySelector(".worldSection");
		const nameElement = fragment.querySelector('[data-field="section-name"]');
		nameElement.textContent = resourceLabel(config, tier.gainResource);
		nameElement.style.color = config.resourceById[tier.gainResource].color;
		const resourceElement = fragment.querySelector('[data-field="section-resource"]');
		resourceElement.dataset.resourceHeader = tier.costResource;
		resourceElement.style.color = config.resourceById[tier.costResource].color;
		const list = fragment.querySelector('[data-field="section-buttons"]');
		if (section.freeButton) list.append(buildFreeButton(config, tier, section, section.freeButton));
		section.buttons.forEach((button, index) => list.append(buildPurchaseButton(config, tier, section, button, index)));
		sectionElement.dataset.tier = tier.id;
		buttonsRoot().append(fragment);
	}
	document.getElementById("previousWorldButton").style.display = currentWorld === 1 ? "none" : "inline-block";
}

export function updateWorldButtons(config) {
	document.querySelectorAll("[data-resource-header]").forEach(element => {
		const resourceId = element.dataset.resourceHeader;
		element.textContent = `${resourceLabel(config, resourceId)}: ${format(game[resourceId])}`;
	});
	document.querySelectorAll('[data-action="buy-button"]').forEach(element => {
		const world = config.worldById[currentWorld];
		const section = world.sections.find(item => item.tier === element.dataset.tier);
		const tier = config.tierById[element.dataset.tier];
		const button = section.buttons[Number(element.dataset.buttonIndex)];
		element.style.filter = canBuyButton(tier, button) ? "none" : "brightness(70%)";
		setField(element, "gain-value", format(calculateButtonGain(config, tier, button)));
	});
	document.querySelectorAll('[data-action="free-resource"]').forEach(element => {
		const section = config.worldById[currentWorld].sections.find(item => item.tier === element.dataset.tier);
		const free = section.freeButton;
		const available = game[free.requiredResource].gte(free.requiredAmount) && game[free.targetResource].lt(free.amount);
		element.style.filter = available ? "none" : "brightness(70%)";
	});
}

export function findWorldButton(config, tierId, buttonIndex) {
	const section = config.worldById[currentWorld].sections.find(item => item.tier === tierId);
	return section?.buttons[buttonIndex];
}

export function claimWorldFreeButton(config, tierId) {
	const section = config.worldById[currentWorld].sections.find(item => item.tier === tierId);
	return section?.freeButton ? claimFreeResource(section.freeButton) : false;
}

export function nextWorld(config) {
	if (currentWorld < game.worldsUnlocked) {
		setCurrentWorld(currentWorld + 1);
		renderWorld(config);
		return;
	}
	showWorldPurchase(config, currentWorld + 1);
}

export function previousWorld(config) {
	if (currentWorld <= 1) return;
	setCurrentWorld(currentWorld - 1);
	document.getElementById("worldPurchaseScreen").style.display = "none";
	renderWorld(config);
}

export function showWorldPurchase(config, worldId) {
	const world = config.worldById[worldId];
	if (!world) return;
	document.getElementById("worldPurchaseText").textContent = `Unlock world ${worldId}`;
	document.getElementById("worldPurchaseButtonLabel").textContent = `Purchase world ${worldId}`;
	document.getElementById("worldPurchaseButtonCost").textContent = `Costs $${format(world.unlockCost)}`;
	document.getElementById("worldPurchaseScreen").style.display = "block";
}

export function purchaseWorld(config, addItem) {
	const nextId = game.worldsUnlocked + 1;
	const world = config.worldById[nextId];
	if (!world || game.money.lt(world.unlockCost)) return false;
	game.money = game.money.sub(world.unlockCost);
	game.worldsUnlocked = nextId;
	document.getElementById("worldPurchaseScreen").style.display = "none";
	if (world.rewardCrate) {
		addItem("crate", config.crateByKey[world.rewardCrate].id);
		game.cratesNotChecked++;
		alert(`Got an advanced crate for unlocking world ${nextId}!`);
	}
	setCurrentWorld(nextId);
	renderWorld(config);
	return true;
}
