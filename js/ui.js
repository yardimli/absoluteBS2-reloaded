import {game, debugMultiplier} from "./state.js";
import {format, formatTime} from "./format.js";
import {levelToColour, levelToXp} from "./progression.js";

let currentPotionTooltip = 0;
let dialogResolver = null;

function dialogElement(id) {
	return document.getElementById(id);
}

function closeDialog(result) {
	dialogElement("messageDialog").style.display = "none";
	const resolver = dialogResolver;
	dialogResolver = null;
	if (resolver) resolver(result);
}

export function showDialog({
	title,
	message,
	image = "",
	imageAlt = "",
	input = false,
	inputValue = "",
	confirmLabel = "OK",
	cancelLabel = ""
}) {
	if (dialogResolver) closeDialog(null);
	dialogElement("messageDialogTitle").textContent = title;
	dialogElement("messageDialogText").textContent = message;
	const artwork = dialogElement("messageDialogImage");
	artwork.src = image;
	artwork.alt = imageAlt;
	artwork.style.display = image ? "block" : "none";
	const field = dialogElement("messageDialogInput");
	field.style.display = input ? "block" : "none";
	field.value = inputValue;
	const confirmButton = dialogElement("messageDialogConfirm");
	confirmButton.textContent = confirmLabel;
	const cancelButton = dialogElement("messageDialogCancel");
	cancelButton.textContent = cancelLabel;
	cancelButton.style.display = cancelLabel ? "inline-block" : "none";
	dialogElement("messageDialog").style.display = "block";
	if (input) field.focus();
	else confirmButton.focus();
	return new Promise(resolve => {
		dialogResolver = resolve;
	});
}

export function showMessage(title, message, image = "", imageAlt = "") {
	return showDialog({title, message, image, imageAlt});
}

export function showConfirmation(title, message, confirmLabel = "Confirm") {
	return showDialog({title, message, confirmLabel, cancelLabel: "Cancel"});
}

export function showTextPrompt(title, message, inputValue = "") {
	return showDialog({
		title,
		message,
		input: true,
		inputValue,
		confirmLabel: "Import",
		cancelLabel: "Cancel"
	});
}

export function initializeDialog() {
	dialogElement("messageDialogConfirm").addEventListener("click", () => {
		const field = dialogElement("messageDialogInput");
		closeDialog(field.style.display === "none" ? true : field.value);
	});
	dialogElement("messageDialogCancel").addEventListener("click", () => closeDialog(null));
	dialogElement("messageDialogClose").addEventListener("click", () => closeDialog(null));
	dialogElement("messageDialogInput").addEventListener("keydown", event => {
		if (event.key === "Enter") {
			event.preventDefault();
			closeDialog(event.currentTarget.value);
		}
	});
}

export function initializeStaticViews(config) {
	const modernHelpTemplate = document.getElementById("modern-help-content-template");
	if (modernHelpTemplate) {
		document.getElementById("helpScreen").replaceChildren(modernHelpTemplate.content.cloneNode(true));
	}
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
		icon.src = document.body.dataset.theme === "modern" && potion.modernImage ? potion.modernImage : potion.image;
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
		if (row) {
			const visibleDisplay = document.body.dataset.theme === "modern" ? "grid" : "inline";
			row.style.display = !resource.unlockWorld || game.worldsUnlocked >= resource.unlockWorld ? visibleDisplay : "none";
		}
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
