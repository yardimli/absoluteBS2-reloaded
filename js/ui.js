import {game, debugMultiplier} from "./state.js";
import {format, formatTime} from "./format.js";
import {levelToColour, levelToXp, passiveLevelMultiplier, passiveResourceIncome} from "./progression.js";
import {getModernTheme, themedImage, themedName} from "./themes.js";

let currentPotionTooltip = 0;
let dialogResolver = null;
let lastCrateTotal = null;

function dialogElement(id) {
	return document.getElementById(id);
}

function closeDialog(result) {
	dialogElement("messageDialog").style.display = "none";
	const resolver = dialogResolver;
	dialogResolver = null;
	if (resolver) resolver(result);
}

function totalUnopenedCrates() {
	return game.crates.reduce((total, crate) => total + crate[1], 0);
}

function resourceLabel(config, resourceId) {
	const resource = config.resourceById[resourceId];
	return themedName(resource) || resourceId;
}

function relicRows(config, resourceId) {
	return game.relics
		.map(([id, amount]) => ({relic: config.relicById[id], amount}))
		.filter(({relic}) => relic?.resource === resourceId)
		.map(({relic, amount}) => {
			const total = relic.bonus * amount;
			return `<tr><td>${themedName(relic)} x${amount}</td><td>+${format(new Decimal(total * 100), 2)}%</td><td>${format(new Decimal(1 + total), 2)}x</td></tr>`;
		});
}

function potionRow(config, resourceId) {
	const potion = config.potions.items.find(item => item.resource === resourceId);
	if (!potion) return "";
	const active = game.potionCooldowns[potion.id] > 0;
	return `<tr><td>${themedName(potion)}</td><td>${active ? "Active" : "Inactive"}</td><td>${active ? `${config.potions.multiplier}x for ${formatTime(game.potionCooldowns[potion.id])}` : "No current bonus"}</td></tr>`;
}

function buttonTierRows(config, resourceId) {
	return config.progression.tiers
		.filter(tier => tier.gainResource === resourceId || tier.costResource === resourceId || tier.parentResource === resourceId)
		.map(tier => {
			const effects = [];
			if (tier.gainResource === resourceId) effects.push(`Gained from ${resourceLabel(config, tier.costResource)} buttons`);
			if (tier.costResource === resourceId) effects.push(`Spent to buy ${resourceLabel(config, tier.gainResource)} buttons`);
			if (tier.parentResource === resourceId) effects.push(`Multiplies ${resourceLabel(config, tier.gainResource)} button gains by ${format(game[resourceId].add(1))}x`);
			return `<tr><td>${resourceLabel(config, tier.gainResource)}</td><td>${effects.join("<br>")}</td></tr>`;
		});
}

function passiveGenerationRows(config, resourceId) {
	return (config.progression.passiveGenerators || [])
		.filter(generator => generator.targetResource === resourceId || generator.sourceResource === resourceId)
		.map(generator => {
			const rate = passiveResourceIncome(generator);
			if (generator.targetResource === resourceId) {
				return `<tr><td>${resourceLabel(config, generator.sourceResource)} passive generation</td><td>+${format(rate, 2)}/s, or +${format(rate.mul(generator.intervalSeconds), 2)}/min</td></tr>`;
			}
			return `<tr><td>Produces ${resourceLabel(config, generator.targetResource)}</td><td>+${format(rate, 2)}/s, or +${format(rate.mul(generator.intervalSeconds), 2)}/min</td></tr>`;
		});
}

function resourceBreakdownHtml(config, resourceId) {
	const resource = config.resourceById[resourceId];
	const resourceIndex = config.progression.resources.findIndex(item => item.id === resourceId);
	const tier = config.progression.tiers.find(item => item.gainResource === resourceId);
	const parent = tier?.parentResource;
	const parentMultiplier = parent ? game[parent].add(1) : new Decimal(1);
	const relicPotionMultiplier = game.relicPotionMultipliers[resourceIndex] || new Decimal(1);
	const miningMultiplier = resourceId === "money"
		? game.miningResources[config.oreIndexById[config.mining.moneyBoostOre]].pow(config.mining.moneyBoostExponent).add(1)
		: new Decimal(1);
	const moneyPerSecond = game.multi.mul(game.relicPotionMultipliers[0]).mul(
		game.miningResources[config.oreIndexById[config.mining.moneyBoostOre]].pow(config.mining.moneyBoostExponent).add(1)
	);
	const rows = [
		`<tr><td>Current ${themedName(resource)}</td><td>${format(game[resourceId])}</td></tr>`,
		parent ? `<tr><td>${resourceLabel(config, parent)} chain multiplier</td><td>${format(parentMultiplier)}x</td></tr>` : "",
		`<tr><td>Relic and potion multiplier</td><td>${format(relicPotionMultiplier, 2)}x</td></tr>`,
		resourceId === "money" ? `<tr><td>Stone mining multiplier</td><td>${format(miningMultiplier, 2)}x</td></tr>` : "",
		resourceId !== "money" ? `<tr><td>Level passive multiplier</td><td>${format(passiveLevelMultiplier(), 2)}x</td></tr>` : "",
		resourceId === "money" ? `<tr><td>Estimated money per second</td><td>$${format(moneyPerSecond)}/s</td></tr>` : `<tr><td>Money translation</td><td>More ${themedName(resource)} improves the chain shown below; Money itself is produced by Multi.</td></tr>`
	].filter(Boolean).join("");
	const relics = relicRows(config, resourceId);
	const potion = potionRow(config, resourceId);
	const tiers = buttonTierRows(config, resourceId);
	const passiveRows = passiveGenerationRows(config, resourceId);
	return `
		<p>${themedName(resource)} is part of the resource chain. Higher resources multiply button gains for the tier below them, and now also passively generate that lower tier every tick using your level multiplier.</p>
		<table class="breakdownTable"><tbody>${rows}</tbody></table>
		${passiveRows.length ? `<h2>Passive Generation</h2><table class="breakdownTable"><tbody>${passiveRows.join("")}</tbody></table>` : ""}
		<h2>Bonus Items</h2>
		<table class="breakdownTable">
			<thead><tr><th>Item</th><th>Bonus</th><th>Total multiplier</th></tr></thead>
			<tbody>${relics.length ? relics.join("") : `<tr><td colspan="3">No relic bonuses for ${themedName(resource)}.</td></tr>`}${potion}</tbody>
		</table>
		<h2>Chain Effects</h2>
		<table class="breakdownTable">
			<thead><tr><th>Tier</th><th>Effect</th></tr></thead>
			<tbody>${tiers.length ? tiers.join("") : `<tr><td colspan="2">No button tier currently depends directly on ${themedName(resource)}.</td></tr>`}</tbody>
		</table>
		${resourceId === "money" ? `<h2>Money Formula</h2><p><code>Multi (${format(game.multi)}) x money bonuses (${format(game.relicPotionMultipliers[0], 2)}x) x Stone (${format(miningMultiplier, 2)}x) = $${format(moneyPerSecond)}/s</code></p>` : ""}
	`;
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

export function closeMessageDialog() {
	closeDialog(null);
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

export function clearCrateNotificationBlink() {
	const notification = document.getElementById("crateNotification");
	if (notification) notification.classList.remove("blinking");
}

export function showResourceBreakdown(config, resourceId) {
	const resource = config.resourceById[resourceId];
	if (!resource) return;
	document.getElementById("resourceBreakdownTitle").textContent = themedName(resource);
	document.getElementById("resourceBreakdownContent").innerHTML = resourceBreakdownHtml(config, resourceId);
	document.getElementById("resourceBreakdownScreen").style.display = "block";
}

export function closeResourceBreakdown() {
	document.getElementById("resourceBreakdownScreen").style.display = "none";
}


export function initializeStaticViews(config) {
	const modernHelpTemplate = document.getElementById(
		getModernTheme() === "tech" ? "tech-help-content-template" : "modern-help-content-template"
	);
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
		fragment.querySelector('[data-field="resource-name"]').textContent = themedName(resource);
		fragment.querySelector('[data-field="resource-value"]').id = resource.id;
		resourceList.append(fragment);
	}
	const icons = document.getElementById("activePotionIcons");
	icons.replaceChildren();
	for (const potion of config.potions.items) {
		const fragment = document.getElementById("potion-icon-template").content.cloneNode(true);
		const icon = fragment.querySelector(".potionIcon");
		icon.src = themedImage(potion);
		icon.alt = themedName(potion);
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
	const crateTotal = totalUnopenedCrates();
	if (lastCrateTotal === null) {
		notification.style.display = crateTotal > 0 ? "block" : "none";
		notification.textContent = format(crateTotal);
		lastCrateTotal = crateTotal;
	} else if (crateTotal !== lastCrateTotal) {
		notification.style.display = crateTotal > 0 ? "block" : "none";
		notification.textContent = format(crateTotal);
		if (crateTotal > lastCrateTotal) {
			notification.classList.remove("blinking");
			void notification.offsetWidth;
			notification.classList.add("blinking");
		}
		lastCrateTotal = crateTotal;
	}
	config.potions.items.forEach(potion => {
		const icon = document.querySelector(`[data-potion-id="${potion.id}"]`);
		icon.style.display = game.potionCooldowns[potion.id] > 0 ? "block" : "none";
	});
	if (currentPotionTooltip) {
		const potion = config.potionById[currentPotionTooltip - 1];
		document.getElementById("potionTooltip").textContent =
			`${themedName(potion)}: ${formatTime(game.potionCooldowns[potion.id])}`;
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
	const helpScreen = document.getElementById("helpScreen");
	helpScreen.style.display = helpScreen.classList.contains("helpPanel") ? "flex" : "block";
}

export function hideHelp() {
	document.getElementById("helpScreenOverlay").style.display = "none";
	document.getElementById("helpScreen").style.display = "none";
}

export function closeWorldPurchase() {
	document.getElementById("worldPurchaseScreen").style.display = "none";
}
