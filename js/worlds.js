import {currentWorld, game, setCurrentWorld} from "./state.js";
import {calculateButtonGain, canBuyButton, claimFreeResource} from "./progression.js";
import {format} from "./format.js";
import {showMessage} from "./ui.js";

const buttonsRoot = () => document.getElementById("buttons");
let renderedWorldId = null;

function setField(root, field, value) {
	root.querySelector(`[data-field="${field}"]`).textContent = value;
}

function setOptionalField(root, field, value) {
	const element = root.querySelector(`[data-field="${field}"]`);
	if (element) element.textContent = value;
}

function setButtonAvailability(element, available) {
	element.disabled = !available;
	element.setAttribute("aria-disabled", available ? "false" : "true");
	element.style.filter = available ? "none" : "brightness(70%)";
}

function resourceLabel(config, resourceId) {
	const resource = config.resourceById[resourceId];
	return resource.shortName || resource.name;
}

function stylesheetUrl(image) {
	if (/^(?:[a-z]+:|\/)/i.test(image)) return image;
	return image.startsWith("../") ? image : `../${image}`;
}

function setModernBackground(image) {
	document.body.style.setProperty("--world-background", `url("${stylesheetUrl(image)}")`);
	const background = document.getElementById("worldBackground");
	if (background) background.style.backgroundImage = `linear-gradient(180deg, rgba(4, 12, 25, 0.02), rgba(4, 12, 25, 0.18)), url("${image}")`;
}

function buildPurchaseButton(config, tier, section, button, buttonIndex) {
	const fragment = document.getElementById("game-button-template").content.cloneNode(true);
	const element = fragment.querySelector(".button");
	element.classList.add(tier.className);
	const image = document.body.dataset.theme === "modern" ? section.modernImage : section.image;
	element.style.backgroundImage = `url("${image}")`;
	element.dataset.tier = tier.id;
	element.dataset.buttonIndex = buttonIndex;
	setOptionalField(fragment, "gain-name", resourceLabel(config, tier.gainResource));
	setField(fragment, "gain-value", format(calculateButtonGain(config, tier, button)));
	const costName = document.body.dataset.theme === "modern" && tier.costResource === "money"
		? "Cost"
		: resourceLabel(config, tier.costResource);
	setField(fragment, "cost-name", costName);
	setField(fragment, "cost-value", `${tier.costResource === "money" ? "$" : ""}${format(button.cost)}`);
	return fragment;
}

function buildFreeButton(config, tier, section, freeButton) {
	const fragment = document.getElementById("free-button-template").content.cloneNode(true);
	const element = fragment.querySelector(".button");
	element.classList.add(tier.className);
	const image = document.body.dataset.theme === "modern" ? section.modernImage : section.image;
	element.style.backgroundImage = `url("${image}")`;
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
	const modern = document.body.dataset.theme === "modern";
	document.body.style.backgroundColor = modern ? "transparent" : world.background;
	document.body.dataset.world = world.id;
	if (modern && renderedWorldId !== world.id) {
		const backgrounds = world.modernBackgrounds || [];
		const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
		if (background) setModernBackground(background);
	}
	renderedWorldId = world.id;
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
	updateWorldButtons(config);
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
		setButtonAvailability(element, canBuyButton(tier, button));
		setField(element, "gain-value", format(calculateButtonGain(config, tier, button)));
	});
	document.querySelectorAll('[data-action="free-resource"]').forEach(element => {
		const section = config.worldById[currentWorld].sections.find(item => item.tier === element.dataset.tier);
		const free = section.freeButton;
		const available = game[free.requiredResource].gte(free.requiredAmount) && game[free.targetResource].lt(free.amount);
		setButtonAvailability(element, available);
	});
}

function affectedTiers(config, purchasedTier) {
	const affected = new Set([purchasedTier.id]);
	for (const tier of config.progression.tiers) {
		if (tier.parentResource === purchasedTier.gainResource) affected.add(tier.id);
		if (tier.costResource === purchasedTier.costResource) affected.add(tier.id);
		if (tier.costResource === purchasedTier.gainResource) affected.add(tier.id);
		if (purchasedTier.resets.includes(tier.costResource)) affected.add(tier.id);
	}
	return affected;
}

export function updateAffectedButtons(config, purchasedTierId) {
	const purchasedTier = config.tierById[purchasedTierId];
	if (!purchasedTier) {
		updateWorldButtons(config);
		return;
	}
	const affected = affectedTiers(config, purchasedTier);
	document.querySelectorAll("[data-resource-header]").forEach(element => {
		const resourceId = element.dataset.resourceHeader;
		if (
			resourceId === purchasedTier.costResource ||
			resourceId === purchasedTier.gainResource ||
			purchasedTier.resets.includes(resourceId)
		) {
			element.textContent = `${resourceLabel(config, resourceId)}: ${format(game[resourceId])}`;
		}
	});
	document.querySelectorAll('[data-action="buy-button"]').forEach(element => {
		if (!affected.has(element.dataset.tier)) return;
		const world = config.worldById[currentWorld];
		const section = world.sections.find(item => item.tier === element.dataset.tier);
		const tier = config.tierById[element.dataset.tier];
		const button = section.buttons[Number(element.dataset.buttonIndex)];
		setButtonAvailability(element, canBuyButton(tier, button));
		setField(element, "gain-value", format(calculateButtonGain(config, tier, button)));
	});
	document.querySelectorAll('[data-action="free-resource"]').forEach(element => {
		if (!affected.has(element.dataset.tier)) return;
		const section = config.worldById[currentWorld].sections.find(item => item.tier === element.dataset.tier);
		const free = section?.freeButton;
		if (!free) return;
		const available = game[free.requiredResource].gte(free.requiredAmount) && game[free.targetResource].lt(free.amount);
		setButtonAvailability(element, available);
	});
}

export function updatePassiveIncomeButtons(config) {
	document.querySelectorAll('[data-resource-header="money"]').forEach(element => {
		element.textContent = `${resourceLabel(config, "money")}: ${format(game.money)}`;
	});
	document.querySelectorAll('[data-action="buy-button"][data-tier="multi"]').forEach(element => {
		const world = config.worldById[currentWorld];
		const section = world.sections.find(item => item.tier === "multi");
		const tier = config.tierById.multi;
		const button = section.buttons[Number(element.dataset.buttonIndex)];
		setButtonAvailability(element, canBuyButton(tier, button));
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
		const crate = config.crateByKey[world.rewardCrate];
		showMessage(
			"World unlocked",
			`World ${nextId} is now available.\nYou also received one ${crate.name}.`,
			document.body.dataset.theme === "modern" ? crate.modernImage : crate.image,
			crate.name
		);
	}
	setCurrentWorld(nextId);
	renderWorld(config);
	return true;
}
