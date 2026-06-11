import {loadConfig} from "./config.js";
import {
	exportState,
	game,
	importState,
	loadState,
	resetState,
	saveState,
	setDebugMultiplier
} from "./state.js";
import {buyButton, xpToLevel} from "./progression.js";
import {
	claimWorldFreeButton,
	findWorldButton,
	nextWorld,
	previousWorld,
	purchaseWorld,
	renderWorld,
	updateWorldButtons
} from "./worlds.js";
import {
	activateItem,
	addItem,
	calculateItemMultipliers,
	closeItems,
	hideItemInfo,
	renderItems,
	setPattern,
	showItemInfo,
	showItems
} from "./items.js";
import {
	closeMining,
	initializeMiningView,
	miningMoneyMultiplier,
	purchaseMiner,
	rollMiningResource,
	showMining,
	updateMiningView
} from "./mining.js";
import {
	closeWorldPurchase,
	hideHelp,
	hidePotionTooltip,
	initializeDialog,
	initializeStaticViews,
	showConfirmation,
	showHelp,
	showMessage,
	showPotionTooltip,
	showTextPrompt,
	updateVisuals
} from "./ui.js";

window.isDevVersion = false;
const config = await loadConfig();
loadState(config);
initializeStaticViews(config);
initializeMiningView(config);
initializeDialog();
calculateItemMultipliers(config);
setPattern(config, game.currentPattern[0], game.currentPattern[1]);
renderWorld(config);

if (!game.hasSeenHelp) {
	showHelp();
	game.hasSeenHelp = true;
	saveState();
}

async function hardReset() {
	const confirmed = await showConfirmation(
		"Hard reset",
		"Are you sure? This permanently removes all game progress.",
		"Reset everything"
	);
	if (!confirmed) return;
	resetState(config);
	saveState();
	location.reload();
}

async function exportGame() {
	try {
		await navigator.clipboard.writeText(exportState());
		showMessage("Export complete", "Your save data was copied to the clipboard.");
	} catch {
		showMessage("Export failed", "The save could not be copied. Check browser clipboard permissions and try again.");
	}
}

async function importGame() {
	const value = await showTextPrompt("Import save", "Paste your exported save data below.");
	if (!value) return;
	try {
		importState(config, value);
		location.reload();
	} catch {
		showMessage("Import failed", "That save data is invalid or incomplete.");
	}
}

function activateButton(element) {
	const action = element.dataset.action;
	if (action === "buy-button") {
		const button = findWorldButton(config, element.dataset.tier, Number(element.dataset.buttonIndex));
		if (button && buyButton(config, element.dataset.tier, button)) renderWorld(config);
	} else if (action === "free-resource") {
		if (claimWorldFreeButton(config, element.dataset.tier)) renderWorld(config);
	} else if (action === "show-items") {
		showItems(config, element.dataset.itemType);
	} else if (action === "close-items") closeItems();
	else if (action === "show-mining") showMining(config);
	else if (action === "close-mining") closeMining();
	else if (action === "purchase-miner") purchaseMiner(config);
	else if (action === "previous-world") previousWorld(config);
	else if (action === "next-world") nextWorld(config);
	else if (action === "purchase-world") purchaseWorld(config, (type, id) => addItem(config, type, id));
	else if (action === "close-world-purchase") closeWorldPurchase();
	else if (action === "show-help") showHelp();
	else if (action === "hide-help") hideHelp();
	else if (action === "save") saveState();
	else if (action === "hard-reset") hardReset();
	else if (action === "export") exportGame();
	else if (action === "import") importGame();
	else if (action === "switch-theme") {
		saveState();
		location.href = element.dataset.target;
	}
	else if (action === "debug-multiplier") {
		setDebugMultiplier(Number(element.dataset.value));
		renderWorld(config);
	}
}

document.addEventListener("click", event => {
	const card = event.target.closest(".itemBox");
	if (card) {
		activateItem(config, card);
		return;
	}
	const actionable = event.target.closest("[data-action]");
	if (actionable) activateButton(actionable);
});

document.addEventListener("keydown", event => {
	if (["ArrowRight", "d", "D"].includes(event.key)) nextWorld(config);
	else if (["ArrowLeft", "a", "A"].includes(event.key)) previousWorld(config);
	else if (event.key === "Enter" || event.key === " ") {
		const actionable = event.target.closest("[data-action]");
		if (actionable) {
			event.preventDefault();
			activateButton(actionable);
		}
	}
});

document.getElementById("itemScreenInner").addEventListener("mouseover", event => {
	const card = event.target.closest(".itemBox");
	if (card) showItemInfo(config, card);
});
document.getElementById("itemScreenInner").addEventListener("mouseout", event => {
	if (event.target.closest(".itemBox")) hideItemInfo();
});
document.getElementById("activePotionIcons").addEventListener("mouseover", event => {
	const icon = event.target.closest("[data-potion-id]");
	if (icon) showPotionTooltip(Number(icon.dataset.potionId));
});
document.getElementById("activePotionIcons").addEventListener("mouseout", hidePotionTooltip);

let mouseDown = false;
document.addEventListener("mousedown", () => { mouseDown = true; });
document.addEventListener("mouseup", () => { mouseDown = false; });
document.getElementById("buttons").addEventListener("mouseover", event => {
	if (!mouseDown) return;
	const element = event.target.closest('[data-action="buy-button"]');
	if (element) activateButton(element);
});

function updateSimulation() {
	const elapsedSeconds = Math.max((Date.now() - game.timeOfLastUpdate) / 1000, 0);
	game.money = game.money.add(
		game.multi
			.mul(game.relicPotionMultipliers[0])
			.mul(miningMoneyMultiplier(config))
			.mul(elapsedSeconds)
	);
	let potionExpired = false;
	game.potionCooldowns = game.potionCooldowns.map(cooldown => {
		if (cooldown <= 0) return 0;
		const next = Math.max(cooldown - elapsedSeconds, 0);
		if (next === 0) potionExpired = true;
		return next;
	});
	if (potionExpired) {
		calculateItemMultipliers(config);
		renderWorld(config);
	}
	if (game.miners.gte(1)) {
		game.miningCooldown -= elapsedSeconds;
		if (game.miningCooldown <= 0) {
			rollMiningResource(config);
			const effectiveMiners = Decimal.min(game.miners, config.mining.maxEffectiveMiners).toNumber();
			game.miningCooldown = config.mining.baseIntervalSeconds / effectiveMiners;
		}
	}
	game.level = xpToLevel(config, game.XP);
	game.timeOfLastUpdate = Date.now();
}

function visualLoop() {
	updateVisuals(config);
	updateWorldButtons(config);
	updateMiningView(config);
	requestAnimationFrame(visualLoop);
}

setInterval(updateSimulation, 16);
if (!window.isDevVersion) setInterval(saveState, 5000);
requestAnimationFrame(visualLoop);
