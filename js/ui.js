import {game, debugMultiplier} from "./state.js";
import {format, formatTime} from "./format.js";
import {levelToColour, levelToXp} from "./progression.js";

let currentPotionTooltip = 0;

export function initializeStaticViews(config) {
	const resourceList = document.getElementById("resourceList");
	resourceList.replaceChildren();
	for (const resource of config.progression.resources) {
		const fragment = document.getElementById("resource-row-template").content.cloneNode(true);
		const row = fragment.querySelector(".resourceText");
		row.style.color = resource.color;
		row.dataset.resourceId = resource.id;
		fragment.querySelector('[data-field="resource-name"]').textContent = resource.name;
		fragment.querySelector('[data-field="resource-value"]').id = resource.id;
		resourceList.append(fragment);
	}
	const icons = document.getElementById("activePotionIcons");
	icons.replaceChildren();
	for (const potion of config.potions.items) {
		const fragment = document.getElementById("potion-icon-template").content.cloneNode(true);
		const icon = fragment.querySelector(".potionIcon");
		icon.src = potion.image;
		icon.alt = potion.name;
		icon.dataset.potionId = potion.id;
		icon.style.top = `${86 + potion.id * 54}px`;
		icons.append(fragment);
	}
}

export function updateVisuals(config) {
	for (const resource of config.progression.resources) {
		const value = document.getElementById(resource.id);
		if (value) value.textContent = format(game[resource.id]);
		const row = document.querySelector(`[data-resource-id="${resource.id}"]`);
		if (row) row.style.display = !resource.unlockWorld || game.worldsUnlocked >= resource.unlockWorld ? "inline" : "none";
	}
	document.getElementById("miningNavButton").style.display =
		game.worldsUnlocked >= config.mining.unlockWorld ? "inline-block" : "none";
	const notification = document.getElementById("crateNotification");
	notification.style.display = game.cratesNotChecked > 0 ? "block" : "none";
	notification.textContent = `+${format(game.cratesNotChecked)}`;
	config.potions.items.forEach(potion => {
		const icon = document.querySelector(`[data-potion-id="${potion.id}"]`);
		icon.style.display = game.potionCooldowns[potion.id] > 0 ? "block" : "none";
	});
	if (currentPotionTooltip) {
		const potion = config.potionById[currentPotionTooltip - 1];
		document.getElementById("potionTooltip").textContent =
			`${potion.name}: ${formatTime(game.potionCooldowns[potion.id])}`;
	}
	document.getElementById("level").textContent = format(game.level);
	document.getElementById("bottomBar").style.backgroundColor = levelToColour(game.level.toNumber());
	const xpForLevel = levelToXp(config, game.level);
	const xpForNext = levelToXp(config, game.level.add(1));
	const progress = game.XP.sub(xpForLevel).div(xpForNext.sub(xpForLevel)).mul(100);
	document.getElementById("XPBar").style.width = `${format(progress)}%`;
	document.querySelectorAll('[data-action="debug-multiplier"]').forEach(button => {
		button.style.fontWeight = Number(button.dataset.value) === debugMultiplier ? "bold" : "normal";
	});
}

export function showPotionTooltip(potionId) {
	currentPotionTooltip = potionId + 1;
	const tooltip = document.getElementById("potionTooltip");
	tooltip.style.top = `${54 * (potionId + 1) + 40}px`;
	tooltip.style.opacity = "1";
}

export function hidePotionTooltip() {
	document.getElementById("potionTooltip").style.opacity = "0";
}

export function showHelp() {
	document.getElementById("helpScreenOverlay").style.display = "block";
	document.getElementById("helpScreen").style.display = "block";
}

export function hideHelp() {
	document.getElementById("helpScreenOverlay").style.display = "none";
	document.getElementById("helpScreen").style.display = "none";
}

export function closeWorldPurchase() {
	document.getElementById("worldPurchaseScreen").style.display = "none";
}
