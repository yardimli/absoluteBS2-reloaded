import {currentWorld, game, setCurrentWorld} from "./state.js";
import {buyButton, calculateButtonGain, canBuyButton, claimFreeResource} from "./progression.js";
import {format} from "./format.js";
import {showMessage} from "./ui.js";
import {getModernTheme, themedBackgrounds, themedIcon, themedImage, themedName, themedShortName} from "./themes.js";

const buttonsRoot = () => document.getElementById("buttons");
let renderedWorldId = null;
const MANUAL_WORLD_CHANGE_SLEEP_MS = 10 * 1000;

function setField(root, field, value) {
	root.querySelector(`[data-field="${field}"]`).textContent = value;
}

function setOptionalField(root, field, value) {
	const element = root.querySelector(`[data-field="${field}"]`);
	if (element) element.textContent = value;
}

function setButtonAvailability(element, available) {
	const changed = element.disabled === available;
	element.disabled = !available;
	element.setAttribute("aria-disabled", available ? "false" : "true");
	element.style.filter = available ? "none" : "brightness(70%)";
	return changed;
}

function restAutoClickerAfterManualWorldChange() {
	game.autoClicker.sleepUntil = Math.max(game.autoClicker.sleepUntil || 0, Date.now() + MANUAL_WORLD_CHANGE_SLEEP_MS);
}

function buttonGridCapacity(grid, buttons) {
	if (!buttons.length) return 0;
	const style = window.getComputedStyle(grid);
	const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
	const width = grid.clientWidth || grid.getBoundingClientRect().width;
	const maxButtonWidth = 150;
	if (window.matchMedia("(max-width: 700px)").matches) return Math.min(3, buttons.length);
	return Math.max(1, Math.min(buttons.length, Math.floor((width + gap) / (maxButtonWidth + gap))));
}

function updateButtonGridSize(grid, visibleCount) {
	const style = window.getComputedStyle(grid);
	const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
	const width = grid.clientWidth || grid.getBoundingClientRect().width;
	const targetCount = window.matchMedia("(max-width: 700px)").matches ? Math.max(visibleCount, 3) : visibleCount;
	const calculated = (width - gap * Math.max(targetCount - 1, 0)) / targetCount;
	const size = Math.max(1, Math.min(150, calculated));
	grid.style.setProperty("--button-size", `${size}px`);
}

function visibleButtonsForCapacity(buttons, capacity) {
	if (buttons.length <= capacity) return new Set(buttons);
	const enabled = buttons.filter(button => !button.disabled);
	if (enabled.length >= capacity) return new Set(enabled.slice(-capacity));
	const visible = new Set(enabled);
	for (const button of buttons) {
		if (visible.size >= capacity) break;
		visible.add(button);
	}
	return visible;
}

export function updateButtonGridVisibility() {
	document.querySelectorAll(".buttonGrid").forEach(grid => {
		const buttons = Array.from(grid.querySelectorAll(".button"));
		const capacity = buttonGridCapacity(grid, buttons);
		const visibleButtons = visibleButtonsForCapacity(buttons, capacity);
		const visibleCount = Math.max(visibleButtons.size, 1);
		grid.style.setProperty("--visible-buttons", visibleCount);
		updateButtonGridSize(grid, visibleCount);
		buttons.forEach(button => {
			button.style.display = visibleButtons.has(button) ? "flex" : "none";
		});
	});
}

function resourceLabel(config, resourceId) {
	const resource = config.resourceById[resourceId];
	return themedShortName(resource);
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
	const image = document.body.dataset.theme === "modern" ? themedImage(section) : section.image;
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
	const image = document.body.dataset.theme === "modern" ? themedImage(section) : section.image;
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
	const renderKey = modern ? `${getModernTheme()}:${world.id}` : String(world.id);
	document.body.style.backgroundColor = modern ? "transparent" : world.background;
	document.body.dataset.world = world.id;
	if (modern && renderedWorldId !== renderKey) {
		const backgrounds = themedBackgrounds(world);
		const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
		if (background) setModernBackground(background);
	}
	renderedWorldId = renderKey;
	document.getElementById("topBarWorldNumber").textContent = `World ${world.id}`;
	document.getElementById("topBarWorldName").textContent = themedName(world);
	buttonsRoot().replaceChildren();
	for (const section of world.sections) {
		const tier = config.tierById[section.tier];
		const fragment = document.getElementById("world-section-template").content.cloneNode(true);
		const sectionElement = fragment.querySelector(".worldSection");
		const titleElement = fragment.querySelector(".sectionTitle");
		const nameElement = fragment.querySelector('[data-field="section-name"]');
		const iconElement = fragment.querySelector('[data-field="section-icon"]');
		const sectionIcon = themedIcon(config.resourceById[tier.gainResource]);
		if (titleElement) titleElement.dataset.resourceId = tier.gainResource;
		if (iconElement && sectionIcon) {
			iconElement.src = sectionIcon;
			iconElement.alt = themedName(config.resourceById[tier.gainResource]);
			iconElement.style.display = "block";
		}
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
	const previousButton = document.getElementById("previousWorldButton");
	previousButton.style.display = "inline-block";
	previousButton.disabled = currentWorld === 1;
	previousButton.setAttribute("aria-disabled", currentWorld === 1 ? "true" : "false");
	updateWorldButtons(config);
	updateButtonGridVisibility();
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
	updateButtonGridVisibility();
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
	updateButtonGridVisibility();
}

export function updatePassiveIncomeButtons(config) {
	let visibilityChanged = false;
	document.querySelectorAll('[data-resource-header="money"]').forEach(element => {
		element.textContent = `${resourceLabel(config, "money")}: ${format(game.money)}`;
	});
	document.querySelectorAll('[data-action="buy-button"]').forEach(element => {
		const world = config.worldById[currentWorld];
		const tier = config.tierById[element.dataset.tier];
		if (tier.costResource !== "money") return;
		const tierSection = world.sections.find(item => item.tier === element.dataset.tier);
		if (!tierSection) return;
		const button = tierSection.buttons[Number(element.dataset.buttonIndex)];
		const changed = setButtonAvailability(element, canBuyButton(tier, button));
		visibilityChanged = visibilityChanged || changed;
		setField(element, "gain-value", format(calculateButtonGain(config, tier, button)));
	});
	document.querySelectorAll('[data-action="free-resource"]').forEach(element => {
		const section = config.worldById[currentWorld].sections.find(item => item.tier === element.dataset.tier);
		const free = section?.freeButton;
		if (!free || free.requiredResource !== "money") return;
		const available = game[free.requiredResource].gte(free.requiredAmount) && game[free.targetResource].lt(free.amount);
		const changed = setButtonAvailability(element, available);
		visibilityChanged = visibilityChanged || changed;
	});
	if (visibilityChanged) updateButtonGridVisibility();
}

export function findWorldButton(config, tierId, buttonIndex) {
	const section = config.worldById[currentWorld].sections.find(item => item.tier === tierId);
	return section?.buttons[buttonIndex];
}

export function claimWorldFreeButton(config, tierId) {
	const section = config.worldById[currentWorld].sections.find(item => item.tier === tierId);
	return section?.freeButton ? claimFreeResource(section.freeButton) : false;
}

function playButtonClickEffect(element) {
	element.classList.remove("clicked");
	void element.offsetWidth;
	element.classList.add("clicked");
}

export function activateWorldButton(config, element) {
	if (!element) return false;
	if (element.dataset.action === "buy-button") {
		const button = findWorldButton(config, element.dataset.tier, Number(element.dataset.buttonIndex));
		if (!button || !buyButton(config, element.dataset.tier, button)) return false;
		const tier = config.tierById[element.dataset.tier];
		if (tier?.resets?.length) game.autoClicker.manualWorldId = 0;
		playButtonClickEffect(element);
		updateAffectedButtons(config, element.dataset.tier);
		return true;
	}
	if (element.dataset.action === "free-resource") {
		if (!claimWorldFreeButton(config, element.dataset.tier)) return false;
		playButtonClickEffect(element);
		updateAffectedButtons(config, element.dataset.tier);
		return true;
	}
	return false;
}

export function nextWorld(config, options = {}) {
	if (currentWorld < game.worldsUnlocked) {
		setCurrentWorld(currentWorld + 1);
		if (options.manual) {
			game.autoClicker.manualWorldId = currentWorld;
			restAutoClickerAfterManualWorldChange();
		}
		renderWorld(config);
		return;
	}
	showWorldPurchase(config, currentWorld + 1);
}

export function previousWorld(config, options = {}) {
	if (currentWorld <= 1) return;
	setCurrentWorld(currentWorld - 1);
	if (options.manual) {
		game.autoClicker.manualWorldId = currentWorld;
		restAutoClickerAfterManualWorldChange();
	}
	document.getElementById("worldPurchaseScreen").style.display = "none";
	renderWorld(config);
}

export function showWorldPurchase(config, worldId) {
	const world = config.worldById[worldId];
	if (!world) return;
	const panel = document.querySelector("#worldPurchaseScreen .worldPurchaseModal");
	if (panel) {
		const backgrounds = themedBackgrounds(world);
		const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
		if (background) panel.style.setProperty("--world-purchase-background", `url("../${background}")`);
		else panel.style.removeProperty("--world-purchase-background");
	}
	const worldName = themedName(world);
	document.getElementById("worldPurchaseText").textContent = `Unlock ${worldName}`;
	document.getElementById("worldPurchaseButtonLabel").textContent = `Purchase ${worldName}`;
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
			`World ${nextId} is now available.\nYou also received one ${themedName(crate)}.`,
			document.body.dataset.theme === "modern" ? themedImage(crate) : crate.image,
			themedName(crate)
		);
	}
	setCurrentWorld(nextId);
	game.autoClicker.manualWorldId = nextId;
	restAutoClickerAfterManualWorldChange();
	renderWorld(config);
	return true;
}
