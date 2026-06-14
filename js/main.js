import {loadConfig} from "./config.js";
import {
	exportState,
	game,
	importState,
	loadState,
	resetState,
	saveState,
	setDebugMultiplier,
	ensureAutoClickerState
} from "./state.js";
import {xpToLevel} from "./progression.js";
import {
	activateWorldButton,
	nextWorld,
	previousWorld,
	purchaseWorld,
	renderWorld,
	updateButtonGridVisibility,
	updatePassiveIncomeButtons,
	updateWorldPurchaseView,
	updateWorldButtons
} from "./worlds.js";
import {
	activateItem,
	addItem,
	calculateItemMultipliers,
	closeItems,
	hideItemInfo,
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
	closeMessageDialog,
	closeSectionLore,
	closeWorldPurchase,
	clearCrateNotificationBlink,
	closeResourceBreakdown,
	hideHelp,
	hidePotionTooltip,
	initializeDialog,
	initializeStaticViews,
	showConfirmation,
	showHelp,
	showMessage,
	showPotionTooltip,
	showResourceBreakdown,
	showSectionLore,
	showTextPrompt,
	updateVisuals
} from "./ui.js";
import {applyModernTheme, toggleModernTheme} from "./themes.js";
import {
	closeAutoClicker,
	isAutoClickerSleeping,
	runAutoClicker,
	showAutoClicker,
	toggleAutoClickerDescription,
	toggleAutoClickerText,
	toggleAutoClickerSleep,
	updateAutoClickerBehavior,
	updateAutoClickerView,
	upgradeAutoClicker
} from "./autoClicker.js";

window.isDevVersion = false;
const SIMULATION_INTERVAL_MS = 100;
const VISUAL_INTERVAL_MS = 200;
const config = await loadConfig();
loadState(config);
ensureAutoClickerState(config);
applyModernTheme();
initializeStaticViews(config);
initializeMiningView(config);
initializeDialog();
calculateItemMultipliers(config);
setPattern(config, game.currentPattern[0], game.currentPattern[1]);
renderWorld(config);
updateAutoClickerView(config);

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
		activateWorldButton(config, element);
	} else if (action === "free-resource") {
		activateWorldButton(config, element);
	} else if (action === "show-items") {
		if (element.dataset.itemType === "crates") clearCrateNotificationBlink();
		showItems(config, element.dataset.itemType);
	} else if (action === "close-items") closeItems();
	else if (action === "show-auto-clicker") {
		if (isAutoClickerSleeping()) toggleAutoClickerSleep(config);
		else showAutoClicker(config);
	}
	else if (action === "close-auto-clicker") closeAutoClicker();
	else if (action === "toggle-auto-clicker-description") toggleAutoClickerDescription(config);
	else if (action === "toggle-auto-clicker-text") toggleAutoClickerText(config, element.dataset.textKey);
	else if (action === "upgrade-auto-clicker") upgradeAutoClicker(config, element.dataset.upgrade);
	else if (action === "update-auto-clicker-behavior") updateAutoClickerBehavior(config, element.dataset.setting, element.value);
	else if (action === "toggle-auto-clicker-sleep") toggleAutoClickerSleep(config);
	else if (action === "show-mining") showMining(config);
	else if (action === "close-mining") closeMining();
	else if (action === "purchase-miner") purchaseMiner(config);
	else if (action === "previous-world") previousWorld(config, {manual: true});
	else if (action === "next-world") nextWorld(config, {manual: true});
	else if (action === "purchase-world") purchaseWorld(config, (type, id) => addItem(config, type, id));
	else if (action === "close-world-purchase") closeWorldPurchase();
	else if (action === "show-resource-breakdown") {
		document.body.classList.remove("resourcesOpen");
		showResourceBreakdown(config, element.dataset.resourceId);
	}
	else if (action === "close-resource-breakdown") closeResourceBreakdown();
	else if (action === "show-section-lore") showSectionLore(config, element.dataset.resourceId);
	else if (action === "close-section-lore") closeSectionLore();
	else if (action === "show-resources") document.body.classList.add("resourcesOpen");
	else if (action === "hide-resources") document.body.classList.remove("resourcesOpen");
	else if (action === "show-help") {
		document.body.classList.remove("resourcesOpen");
		showHelp();
	}
	else if (action === "hide-help") hideHelp();
	else if (action === "save") saveState();
	else if (action === "hard-reset") hardReset();
	else if (action === "export") exportGame();
	else if (action === "import") importGame();
	else if (action === "toggle-modern-theme") {
		toggleModernTheme();
		initializeStaticViews(config);
		initializeMiningView(config);
		renderWorld(config);
		updateAutoClickerView(config);
		if (game.currentItemScreen) {
			const itemScreen = game.currentItemScreen;
			game.currentItemScreen = "";
			showItems(config, itemScreen);
		}
		updateVisuals(config);
	}
	else if (action === "debug-multiplier") {
		setDebugMultiplier(Number(element.dataset.value));
		updateWorldButtons(config);
	}
}

function closeBackdropModal(element) {
	if (element.id === "itemScreen") closeItems();
	else if (element.id === "autoClickerScreen") closeAutoClicker();
	else if (element.id === "miningScreen") closeMining();
	else if (element.id === "resourceBreakdownScreen") closeResourceBreakdown();
	else if (element.id === "sectionLoreScreen") closeSectionLore();
	else if (element.id === "worldPurchaseScreen") closeWorldPurchase();
	else if (element.id === "messageDialog") closeMessageDialog();
	else return false;
	return true;
}

document.addEventListener("click", event => {
	if (
		document.body.classList.contains("resourcesOpen") &&
		!event.target.closest("#resourcesScreen") &&
		!event.target.closest('[data-action="show-resources"]')
	) {
		document.body.classList.remove("resourcesOpen");
		return;
	}
	if (event.target.id === "helpScreenOverlay") {
		hideHelp();
		return;
	}
	if (event.target.classList.contains("modalShell") || event.target.classList.contains("messageDialogShell")) {
		if (closeBackdropModal(event.target)) return;
	}
	const card = event.target.closest(".itemBox");
	if (card) {
		activateItem(config, card);
		return;
	}
	const actionable = event.target.closest("[data-action]");
	if (actionable) activateButton(actionable);
});

document.addEventListener("input", event => {
	const element = event.target.closest('[data-action="update-auto-clicker-behavior"]');
	if (element) updateAutoClickerBehavior(config, element.dataset.setting, element.value);
});

document.addEventListener("change", event => {
	const element = event.target.closest('[data-action="update-auto-clicker-behavior"]');
	if (element) updateAutoClickerBehavior(config, element.dataset.setting, element.value);
});

document.addEventListener("keydown", event => {
	if (["ArrowRight", "d", "D"].includes(event.key)) nextWorld(config, {manual: true});
	else if (["ArrowLeft", "a", "A"].includes(event.key)) previousWorld(config, {manual: true});
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

let buttonGridResizeFrame = 0;
window.addEventListener("resize", () => {
	if (buttonGridResizeFrame) cancelAnimationFrame(buttonGridResizeFrame);
	buttonGridResizeFrame = requestAnimationFrame(() => {
		buttonGridResizeFrame = 0;
		updateButtonGridVisibility();
	});
});

function updateSimulation() {
	const now = Date.now();
	const elapsedSeconds = Math.max((now - game.timeOfLastUpdate) / 1000, 0);
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
		updateWorldButtons(config);
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
	runAutoClicker(config);
	game.timeOfLastUpdate = now;
}

function visualLoop() {
	if (document.hidden) return;
	updateVisuals(config);
	updatePassiveIncomeButtons(config);
	updateMiningView(config);
	updateAutoClickerView(config);
	updateWorldPurchaseView(config);
}

setInterval(updateSimulation, SIMULATION_INTERVAL_MS);
if (!window.isDevVersion) setInterval(saveState, 5000);
setInterval(visualLoop, VISUAL_INTERVAL_MS);
document.addEventListener("visibilitychange", () => {
	if (!document.hidden) {
		updateSimulation();
		visualLoop();
	}
});
