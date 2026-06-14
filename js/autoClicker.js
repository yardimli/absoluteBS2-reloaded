import {currentWorld, game, saveState, setCurrentWorld} from "./state.js";
import {calculateButtonGain, canBuyButton} from "./progression.js";
import {format, formatTime} from "./format.js";
import {getModernTheme, themedName} from "./themes.js";
import {activateWorldButton, renderWorld, updateWorldButtons} from "./worlds.js";

const E = value => new Decimal(value);
const SLEEP_DURATION_MS = 6 * 60 * 60 * 1000;
const BEST_VALUE_LEVEL = 2;
const WAIT_PLANNING_LEVEL = 4;
const WORLD_TRAVEL_LEVEL = 8;
const ROW_UNLOCK_LEVELS = [0, 2, 5, 8, 11, 14];
let autoClickerViewKey = "";
let autoClickerFrequencyKey = "";
let autoClickerDescriptionExpanded = true;
const autoClickerTextExpanded = {
	behaviorSummary: true,
	hint: true
};

function themeConfig(config) {
	return config.autoClicker.themes[getModernTheme()] || config.autoClicker.themes.tech;
}

function upgradeCost(upgrade, level) {
	return E(upgrade.baseCost).mul(E(upgrade.growth).pow(level));
}

function behaviorCaps(config) {
	const intelligence = game.autoClicker.intelligenceLevel;
	const rowUnlocks = ROW_UNLOCK_LEVELS.filter(level => intelligence >= level).length;
	const waitBand = intelligence >= WAIT_PLANNING_LEVEL ? Math.floor((intelligence - WAIT_PLANNING_LEVEL) / 2) + 1 : 0;
	return {
		canChooseBest: intelligence >= BEST_VALUE_LEVEL,
		maxWaitSeconds: waitBand > 0
			? Math.min(60, waitBand * 5)
			: 0,
		maxRowDepth: Math.max(1, Math.min(config.progression.tiers.length, rowUnlocks)),
		canUseWorlds: intelligence >= WORLD_TRAVEL_LEVEL
	};
}

function defaultRowFrequency(rowIndex) {
	if (rowIndex === 1) return 5;
	if (rowIndex === 2) return 4;
	return 3;
}

function maxFrequencyTargetRow(config, behavior) {
	return Math.max(0, Math.min(behavior.rowDepth - 1, config.progression.tiers.length - 2));
}

function behaviorSettings(config) {
	const caps = behaviorCaps(config);
	const behavior = game.autoClicker.behavior || {};
	if (!game.autoClicker.behavior) game.autoClicker.behavior = behavior;
	if (!["simple", "best"].includes(behavior.priority)) behavior.priority = "simple";
	if (behavior.priority === "best" && !caps.canChooseBest) behavior.priority = "simple";
	behavior.waitSeconds = Math.max(0, Math.min(caps.maxWaitSeconds, Number(behavior.waitSeconds) || 0));
	behavior.rowDepth = Math.max(1, Math.min(caps.maxRowDepth, Math.floor(Number(behavior.rowDepth) || 1)));
	if (!behavior.rowEvery || typeof behavior.rowEvery !== "object") behavior.rowEvery = {};
	if (!behavior.rowClicks || typeof behavior.rowClicks !== "object") behavior.rowClicks = {};
	if (behavior.row2Every && !behavior.rowEvery[1]) behavior.rowEvery[1] = behavior.row2Every;
	if (behavior.row3Every && !behavior.rowEvery[2]) behavior.rowEvery[2] = behavior.row3Every;
	if (behavior.row1Clicks && !behavior.rowClicks[0]) behavior.rowClicks[0] = behavior.row1Clicks;
	if (behavior.row2Clicks && !behavior.rowClicks[1]) behavior.rowClicks[1] = behavior.row2Clicks;
	for (let rowIndex = 0; rowIndex < config.progression.tiers.length; rowIndex += 1) {
		behavior.rowClicks[rowIndex] = Math.max(0, Math.floor(Number(behavior.rowClicks[rowIndex]) || 0));
	}
	for (let targetRow = 1; targetRow <= maxFrequencyTargetRow(config, behavior); targetRow += 1) {
		behavior.rowEvery[targetRow] = Math.max(
			1,
			Math.min(20, Math.floor(Number(behavior.rowEvery[targetRow]) || defaultRowFrequency(targetRow)))
		);
	}
	if (!["current", "all"].includes(behavior.worldMode)) behavior.worldMode = "current";
	if (behavior.worldMode === "all" && !caps.canUseWorlds) behavior.worldMode = "current";
	return behavior;
}

function unlockSummary(config) {
	const caps = behaviorCaps(config);
	const rowLevels = ROW_UNLOCK_LEVELS
		.slice(1, config.progression.tiers.length)
		.map((level, index) => `row ${index + 2} at ${level}`)
		.join(", ");
	return [
		`Best value unlocks at ${BEST_VALUE_LEVEL}.`,
		`Waiting unlocks at ${WAIT_PLANNING_LEVEL} and grows by 5s every 2 levels, now ${caps.maxWaitSeconds}s.`,
		`Rows unlock as ${rowLevels}; now ${caps.maxRowDepth} ${caps.maxRowDepth === 1 ? "row" : "rows"}.`,
		`World travel unlocks at ${WORLD_TRAVEL_LEVEL}.`
	].join(" ");
}

export function autoClickerInterval(config) {
	const speed = game.autoClicker.speedLevel;
	const settings = config.autoClicker;
	return Math.max(
		settings.minimumIntervalSeconds,
		settings.baseIntervalSeconds * (settings.speed.intervalMultiplier ** speed)
	);
}

export function autoClickerStage(config) {
	const total = game.autoClicker.speedLevel + game.autoClicker.intelligenceLevel;
	const max = config.autoClicker.speed.maxLevel + config.autoClicker.intelligence.maxLevel;
	if (total >= max * 0.72) return 3;
	if (total >= max * 0.4) return 2;
	if (total >= max * 0.16) return 1;
	return 0;
}

export function autoClickerImage(config) {
	const themed = themeConfig(config);
	return themed.images[autoClickerStage(config)] || themed.images[0];
}

export function autoClickerName(config) {
	return themeConfig(config).name;
}

export function autoClickerSleepRemaining() {
	return Math.max(game.autoClicker.sleepUntil - Date.now(), 0) / 1000;
}

export function isAutoClickerSleeping() {
	return autoClickerSleepRemaining() > 0;
}

export function autoClickerUpgradeCost(config, type) {
	const settings = type === "speed" ? config.autoClicker.speed : config.autoClicker.intelligence;
	return upgradeCost(settings, game.autoClicker[`${type}Level`]);
}

export function canUpgradeAutoClicker(config, type) {
	const settings = type === "speed" ? config.autoClicker.speed : config.autoClicker.intelligence;
	const level = game.autoClicker[`${type}Level`];
	return level < settings.maxLevel && game.money.gte(autoClickerUpgradeCost(config, type));
}

export function upgradeAutoClicker(config, type) {
	if (!canUpgradeAutoClicker(config, type)) return false;
	game.money = game.money.sub(autoClickerUpgradeCost(config, type));
	game.autoClicker[`${type}Level`] += 1;
	if (type === "intelligence") behaviorSettings(config);
	updateAutoClickerView(config);
	updateWorldButtons(config);
	return true;
}

function tierOrder(config, tierId) {
	return Math.max(0, config.progression.tiers.findIndex(tier => tier.id === tierId));
}

function candidateScore(config, candidate) {
	const tier = config.tierById[candidate.tierId];
	const tierWeight = tierOrder(config, candidate.tierId) + 1;
	if (candidate.type === "free") return tierWeight * 120 + 15;
	const gain = calculateButtonGain(config, tier, candidate.button);
	const gainScore = gain.add(1).log10().toNumber();
	const indexScore = candidate.buttonIndex + 1;
	return tierWeight * 100 + gainScore * 16 + indexScore;
}

function currentMoneyPerSecond() {
	return game.multi.mul(game.relicPotionMultipliers[0]);
}

function collectCandidates(config, worldId) {
	const world = config.worldById[worldId];
	if (!world) return [];
	const candidates = [];
	for (const section of world.sections) {
		const tier = config.tierById[section.tier];
		if (section.freeButton) {
			const free = section.freeButton;
			candidates.push({
				type: "free",
				worldId,
				tierId: section.tier,
				available: game[free.requiredResource].gte(free.requiredAmount) && game[free.targetResource].lt(free.amount),
				score: tierOrder(config, section.tier) * 120 + 15
			});
		}
		section.buttons.forEach((button, buttonIndex) => {
			const candidate = {
				type: "button",
				worldId,
				tierId: section.tier,
				button,
				buttonIndex,
				available: canBuyButton(tier, button)
			};
			candidate.score = candidateScore(config, candidate);
			candidates.push(candidate);
		});
	}
	return candidates;
}

function allowedWorldIds(config) {
	const behavior = behaviorSettings(config);
	if (behavior.worldMode === "all") {
		return config.worlds
			.filter(world => world.id <= game.worldsUnlocked)
			.map(world => world.id);
	}
	const manualWorldId = game.autoClicker.manualWorldId;
	if (manualWorldId > 0 && manualWorldId <= game.worldsUnlocked && config.worldById[manualWorldId]) {
		return [manualWorldId];
	}
	return [currentWorld];
}

function chooseAvailableCandidate(config, available) {
	const behavior = behaviorSettings(config);
	available = available.filter(candidate => tierOrder(config, candidate.tierId) < behavior.rowDepth);
	const scheduledRow = scheduledRowIndex(config, behavior);
	const scheduled = chooseFromRow(config, available, scheduledRow, behavior.priority);
	if (scheduled) return scheduled;
	if (behavior.priority !== "best") {
		return available
			.slice()
			.sort((a, b) => a.worldId - b.worldId || tierOrder(config, a.tierId) - tierOrder(config, b.tierId) || (a.buttonIndex ?? -1) - (b.buttonIndex ?? -1))[0];
	}
	return available
		.slice()
		.sort((a, b) => b.score - a.score)[0];
}

function scheduledRowIndex(config, behavior) {
	for (let targetRow = maxFrequencyTargetRow(config, behavior); targetRow >= 1; targetRow -= 1) {
		if ((behavior.rowClicks[targetRow - 1] || 0) >= behavior.rowEvery[targetRow]) return targetRow;
	}
	return 0;
}

function chooseFromRow(config, available, rowIndex, priority) {
	const row = available.filter(candidate => tierOrder(config, candidate.tierId) === rowIndex);
	if (!row.length) return null;
	if (priority === "best") return row.slice().sort((a, b) => b.score - a.score)[0];
	return row
		.slice()
		.sort((a, b) => a.worldId - b.worldId || (a.buttonIndex ?? -1) - (b.buttonIndex ?? -1))[0];
}

function recordAutoClickerRow(config, candidate) {
	const behavior = behaviorSettings(config);
	const row = tierOrder(config, candidate.tierId);
	behavior.rowClicks[row] = (behavior.rowClicks[row] || 0) + 1;
	if (row > 0) behavior.rowClicks[row - 1] = 0;
}

function resourceAfterCandidate(config, resourceId, candidate) {
	if (!candidate || candidate.type !== "button") return game[resourceId];
	const tier = config.tierById[candidate.tierId];
	if (tier.gainResource !== resourceId) return game[resourceId];
	const gain = calculateButtonGain(config, tier, candidate.button);
	return tier.resets.includes(resourceId) ? gain : game[resourceId].add(gain);
}

function waitDecision(config, chosen, allCandidates) {
	const behavior = behaviorSettings(config);
	if (!chosen || behavior.waitSeconds <= 0) return null;
	const interval = autoClickerInterval(config);
	const allowedCandidates = allCandidates.filter(candidate => tierOrder(config, candidate.tierId) < behavior.rowDepth);
	const betterTargets = allowedCandidates
		.filter(candidate => !candidate.available && candidate.type === "button" && candidate.score > chosen.score)
		.sort((a, b) => b.score - a.score);
	for (const candidate of betterTargets) {
		const tier = config.tierById[candidate.tierId];
		const costResource = tier.costResource;
		const missing = E(candidate.button.cost).sub(game[costResource]);
		if (missing.lte(0)) continue;
		if (costResource === "money") {
			const income = currentMoneyPerSecond();
			if (income.lte(0)) continue;
			const seconds = missing.div(income).toNumber();
			if (Number.isFinite(seconds) && seconds <= behavior.waitSeconds) return {wait: true};
			continue;
		}
		const producers = allowedCandidates
			.filter(producer => producer.available && config.tierById[producer.tierId].gainResource === costResource)
			.sort((a, b) => resourceAfterCandidate(config, costResource, b).cmp(resourceAfterCandidate(config, costResource, a)));
		const producer = producers[0];
		if (!producer) continue;
		const tierResetsResource = config.tierById[producer.tierId].resets.includes(costResource);
		const gain = calculateButtonGain(config, config.tierById[producer.tierId], producer.button);
		const actions = tierResetsResource
			? (gain.gte(candidate.button.cost) ? 1 : Infinity)
			: Math.ceil(missing.div(gain).toNumber());
		if (Number.isFinite(actions) && actions * interval <= behavior.waitSeconds) {
			return {candidate: producer};
		}
	}
	return null;
}

function legacyMoneyWaitForBetter(config, chosen, allCandidates) {
	const behavior = behaviorSettings(config);
	if (!chosen || behavior.waitSeconds <= 0) return false;
	const income = currentMoneyPerSecond();
	if (income.lte(0)) return false;
	const scheduledRow = scheduledRowIndex(config, behavior);
	for (const candidate of allCandidates) {
		if (candidate.available || candidate.type !== "button") continue;
		const candidateRow = tierOrder(config, candidate.tierId);
		if (candidateRow >= behavior.rowDepth || candidateRow !== scheduledRow) continue;
		const tier = config.tierById[candidate.tierId];
		if (tier.costResource !== "money") continue;
		const missing = E(candidate.button.cost).sub(game.money);
		if (missing.lte(0)) continue;
		const seconds = missing.div(income).toNumber();
		if (!Number.isFinite(seconds) || seconds > behavior.waitSeconds) continue;
		if (candidate.score > chosen.score) return true;
	}
	return false;
}

function selectorForCandidate(candidate) {
	if (candidate.type === "free") return `[data-action="free-resource"][data-tier="${candidate.tierId}"]`;
	return `[data-action="buy-button"][data-tier="${candidate.tierId}"][data-button-index="${candidate.buttonIndex}"]`;
}

function interfaceOverlayOpen() {
	if (document.body.classList.contains("resourcesOpen")) return true;
	const selectors = [
		".modalShell",
		".messageDialogShell",
		"#helpScreen",
		"#helpScreenOverlay"
	];
	return selectors.some(selector => Array.from(document.querySelectorAll(selector)).some(element => {
		const style = window.getComputedStyle(element);
		return style.display !== "none" && style.visibility !== "hidden";
	}));
}

function targetCoordinates(element) {
	if (!element?.isConnected || element.disabled) return null;
	const style = window.getComputedStyle(element);
	if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
	const rect = element.getBoundingClientRect();
	if (
		!Number.isFinite(rect.left) ||
		!Number.isFinite(rect.top) ||
		!Number.isFinite(rect.width) ||
		!Number.isFinite(rect.height) ||
		rect.width <= 0 ||
		rect.height <= 0
	) return null;
	const x = rect.left + rect.width / 2;
	const y = rect.top + rect.height / 2;
	if (x <= 0 || y <= 0 || x >= window.innerWidth || y >= window.innerHeight) return null;
	const hit = document.elementFromPoint(x, y);
	if (!hit || (hit !== element && !element.contains(hit))) return null;
	return {x, y};
}

function animateAutoClicker(config, coordinates) {
	if (!coordinates) return;
	const avatar = document.getElementById("autoClickerAvatar");
	const burst = document.getElementById("autoClickerBurst");
	if (!avatar || !burst) return;
	const image = autoClickerImage(config);
	avatar.src = image;
	const {x, y} = coordinates;
	avatar.style.setProperty("--pet-x", `${x}px`);
	avatar.style.setProperty("--pet-y", `${y}px`);
	avatar.classList.remove("isClicking");
	void avatar.offsetWidth;
	avatar.classList.add("isClicking");
	burst.style.left = `${x}px`;
	burst.style.top = `${y}px`;
	burst.classList.remove("isActive");
	void burst.offsetWidth;
	burst.classList.add("isActive");
}

export function runAutoClicker(config) {
	if (isAutoClickerSleeping() || interfaceOverlayOpen()) return;
	const now = Date.now();
	const intervalMs = autoClickerInterval(config) * 1000;
	if (now - game.autoClicker.lastActionAt < intervalMs) return;
	const worldIds = allowedWorldIds(config);
	const allCandidates = worldIds.flatMap(worldId => collectCandidates(config, worldId));
	const available = allCandidates.filter(candidate => candidate.available);
	let chosen = chooseAvailableCandidate(config, available);
	if (!chosen) return;
	const decision = waitDecision(config, chosen, allCandidates);
	if (decision?.wait) return;
	if (decision?.candidate) chosen = decision.candidate;
	if (chosen.worldId !== currentWorld) {
		setCurrentWorld(chosen.worldId);
		renderWorld(config);
	}
	const element = document.querySelector(selectorForCandidate(chosen));
	const coordinates = targetCoordinates(element);
	if (!coordinates || interfaceOverlayOpen()) return;
	if (activateWorldButton(config, element)) {
		animateAutoClicker(config, coordinates);
		recordAutoClickerRow(config, chosen);
		game.autoClicker.lastActionAt = now;
		updateAutoClickerView(config);
	}
}

export function toggleAutoClickerSleep(config) {
	if (isAutoClickerSleeping()) {
		game.autoClicker.sleepUntil = 0;
		game.autoClicker.lastActionAt = Date.now();
	} else {
		game.autoClicker.sleepUntil = Date.now() + SLEEP_DURATION_MS;
	}
	updateAutoClickerView(config);
}

export function updateAutoClickerBehavior(config, setting, value) {
	const behavior = behaviorSettings(config);
	if (setting === "priority") behavior.priority = value === "best" ? "best" : "simple";
	if (setting === "waitSeconds") behavior.waitSeconds = Number(value) || 0;
	if (setting === "rowDepth") {
		behavior.rowDepth = Number(value) || 1;
		autoClickerFrequencyKey = "";
	}
	if (setting?.startsWith("rowEvery:")) {
		const targetRow = Number(setting.split(":")[1]);
		if (!behavior.rowEvery) behavior.rowEvery = {};
		behavior.rowEvery[targetRow] = Number(value) || defaultRowFrequency(targetRow);
	}
	if (setting === "worldMode") behavior.worldMode = value === "all" ? "all" : "current";
	autoClickerViewKey = "";
	behaviorSettings(config);
	updateAutoClickerView(config);
}

function upgradeText(config, type) {
	const themed = themeConfig(config);
	const settings = type === "speed" ? config.autoClicker.speed : config.autoClicker.intelligence;
	const level = game.autoClicker[`${type}Level`];
	const cost = autoClickerUpgradeCost(config, type);
	const label = type === "speed" ? themed.speedName : themed.intelligenceName;
	const effect = type === "speed"
		? `Action timer: ${formatTime(autoClickerInterval(config))}`
		: `Unlocks: ${behaviorCaps(config).maxRowDepth} ${behaviorCaps(config).maxRowDepth === 1 ? "row" : "rows"}, ${behaviorCaps(config).maxWaitSeconds}s wait cap${behaviorCaps(config).canUseWorlds ? ", world travel" : ""}.`;
	return {
		label,
		level: `Level ${level}/${settings.maxLevel}`,
		cost: level >= settings.maxLevel ? "Maxed" : `Upgrade: $${format(cost)}`,
		effect
	};
}

function setText(id, value) {
	const element = document.getElementById(id);
	if (element && element.textContent !== value) element.textContent = value;
}

function setImage(element, src, alt) {
	if (!element) return;
	if (element.getAttribute("src") !== src) element.src = src;
	if (element.alt !== alt) element.alt = alt;
}

function setButtonTextAndDisabled(id, text, disabled) {
	const button = document.getElementById(id);
	if (!button) return;
	if (button.textContent !== text) button.textContent = text;
	if (button.disabled !== disabled) button.disabled = disabled;
}

function isMobileAutoClickerView() {
	return window.matchMedia("(max-width: 700px)").matches;
}

function updateAutoClickerDescription(config) {
	const description = document.getElementById("autoClickerDescription");
	if (!description) return;
	setText("autoClickerDescription", themeConfig(config).description);
	const mobile = isMobileAutoClickerView();
	const expanded = !mobile || autoClickerDescriptionExpanded;
	description.classList.toggle("isCollapsed", !expanded);
	if (mobile) {
		description.setAttribute("role", "button");
		description.tabIndex = 0;
		description.setAttribute("aria-expanded", expanded ? "true" : "false");
		description.setAttribute("aria-label", expanded ? "Collapse description" : "Show full description");
	} else {
		description.removeAttribute("role");
		description.removeAttribute("tabindex");
		description.removeAttribute("aria-expanded");
		description.removeAttribute("aria-label");
	}
}

function updateCollapsibleText(id, key) {
	const element = document.getElementById(id);
	if (!element) return;
	const mobile = isMobileAutoClickerView();
	const expanded = !mobile || autoClickerTextExpanded[key];
	element.classList.toggle("isCollapsed", !expanded);
	if (mobile) {
		element.setAttribute("role", "button");
		element.tabIndex = 0;
		element.setAttribute("aria-expanded", expanded ? "true" : "false");
		element.setAttribute("aria-label", expanded ? "Collapse text" : "Show full text");
	} else {
		element.removeAttribute("role");
		element.removeAttribute("tabindex");
		element.removeAttribute("aria-expanded");
		element.removeAttribute("aria-label");
	}
}

function updateAutoClickerCollapsibleTexts() {
	updateCollapsibleText("autoClickerBehaviorSummary", "behaviorSummary");
	updateCollapsibleText("autoClickerHint", "hint");
}

function autoClickerStateKey(config, themed, image, sleeping) {
	const manualWorld = game.autoClicker.manualWorldId > 0 ? config.worldById[game.autoClicker.manualWorldId] : null;
	const speedCost = autoClickerUpgradeCost(config, "speed").toString();
	const intelligenceCost = autoClickerUpgradeCost(config, "intelligence").toString();
	const behavior = behaviorSettings(config);
	const behaviorViewKey = JSON.stringify({
		priority: behavior.priority,
		waitSeconds: behavior.waitSeconds,
		rowDepth: behavior.rowDepth,
		worldMode: behavior.worldMode,
		rowEvery: behavior.rowEvery
	});
	return [
		getModernTheme(),
		themed.name,
		themed.title,
		themed.navTooltip,
		themed.description,
		themed.speedName,
		themed.intelligenceName,
		image,
		game.autoClicker.speedLevel,
		game.autoClicker.intelligenceLevel,
		game.autoClicker.manualWorldId,
		behaviorViewKey,
		manualWorld ? themedName(manualWorld) : "",
		sleeping,
		game.autoClicker.sleepUntil,
		speedCost,
		intelligenceCost,
		game.money.gte(autoClickerUpgradeCost(config, "speed")),
		game.money.gte(autoClickerUpgradeCost(config, "intelligence"))
	].join("|");
}

export function updateAutoClickerView(config) {
	const themed = themeConfig(config);
	const image = autoClickerImage(config);
	const sleeping = isAutoClickerSleeping();
	const remaining = autoClickerSleepRemaining();
	const viewKey = autoClickerStateKey(config, themed, image, sleeping);
	const staticChanged = viewKey !== autoClickerViewKey;
	const nav = document.getElementById("autoClickerNavButton");
	if (nav && staticChanged) {
		const backgroundImage = `url("${image}")`;
		if (nav.style.backgroundImage !== backgroundImage) nav.style.backgroundImage = backgroundImage;
		nav.dataset.tooltip = themed.navTooltip;
		nav.setAttribute("aria-label", themed.navTooltip);
		nav.classList.toggle("isSleeping", sleeping);
		nav.dataset.sleepLabel = getModernTheme() === "tech" ? "RECHARGE" : "SLEEP";
	}
	const avatar = document.getElementById("autoClickerAvatar");
	if (staticChanged) {
		setImage(avatar, image, themed.name);
		setImage(document.getElementById("autoClickerModalIcon"), image, themed.name);
		setText("autoClickerTitle", `${themed.name} upgrades`);
		setText("autoClickerEyebrow", themed.title);
		updateAutoClickerDescription(config);
	}
	const sleepButtonText = sleeping
		? `${getModernTheme() === "tech" ? `Power on ${themed.name}` : `Wake up ${themed.name}`} ${formatTime(Math.ceil(remaining))}`
		: (getModernTheme() === "tech" ? `Make ${themed.name} recharge for 6 hours` : `Make ${themed.name} sleep for 6 hours`);
	setText("autoClickerSleepButton", sleepButtonText);
	if (staticChanged) {
		for (const type of ["speed", "intelligence"]) {
			const text = upgradeText(config, type);
			const prefix = type === "speed" ? "autoClickerSpeed" : "autoClickerIntelligence";
			setText(`${prefix}Name`, text.label);
			setText(`${prefix}Level`, text.level);
			setText(`${prefix}Effect`, text.effect);
			setButtonTextAndDisabled(`${prefix}Button`, text.cost, !canUpgradeAutoClicker(config, type));
		}
			updateBehaviorControls(config);
			updateAutoClickerCollapsibleTexts();
			autoClickerViewKey = viewKey;
	}
}

function setInputDisabled(input, disabled) {
	if (input && input.disabled !== disabled) input.disabled = disabled;
}

function rowLabel(config, rowIndex) {
	const tier = config.progression.tiers[rowIndex];
	const resource = tier ? config.resourceById[tier.gainResource] : null;
	return resource ? themedName(resource) : `row ${rowIndex + 1}`;
}

function renderFrequencyControls(config, behavior) {
	const root = document.getElementById("autoClickerFrequencyControls");
	if (!root) return;
	const maxTargetRow = maxFrequencyTargetRow(config, behavior);
	const key = [
		getModernTheme(),
		maxTargetRow,
		Array.from({length: maxTargetRow}, (_, index) => behavior.rowEvery[index + 1] || defaultRowFrequency(index + 1)).join(",")
	].join("|");
	if (key === autoClickerFrequencyKey) return;
	root.replaceChildren();
	root.style.display = maxTargetRow >= 1 ? "" : "none";
	for (let targetRow = 1; targetRow <= maxTargetRow; targetRow += 1) {
		const value = behavior.rowEvery[targetRow] || defaultRowFrequency(targetRow);
		const label = document.createElement("label");
		label.className = "autoClickerSlider autoClickerBehaviorCell";
		const heading = document.createElement("span");
		const text = document.createElement("span");
		text.textContent = `${rowLabel(config, targetRow)} frequency`;
		const strong = document.createElement("strong");
		strong.textContent = `Every ${value} ${rowLabel(config, targetRow - 1)}`;
		heading.append(text, strong);
		const input = document.createElement("input");
		input.type = "range";
		input.min = "1";
		input.max = "20";
		input.step = "1";
		input.value = String(value);
		input.dataset.action = "update-auto-clicker-behavior";
		input.dataset.setting = `rowEvery:${targetRow}`;
		label.append(heading, input);
		root.append(label);
	}
	autoClickerFrequencyKey = key;
}

function updateBehaviorControls(config) {
	const themed = themeConfig(config);
	const caps = behaviorCaps(config);
	const behavior = behaviorSettings(config);
	const intelligenceLabel = themed.intelligenceName;
	setText("autoClickerBehaviorTitle", `${intelligenceLabel} behavior`);
	setText(
		"autoClickerBehaviorSummary",
		unlockSummary(config)
	);
	document.querySelectorAll('input[name="autoClickerPriority"]').forEach(input => {
		input.checked = input.value === behavior.priority;
		setInputDisabled(input, input.value === "best" && !caps.canChooseBest);
	});
	const wait = document.getElementById("autoClickerWaitSlider");
	if (wait) {
		wait.max = String(caps.maxWaitSeconds);
		wait.value = String(behavior.waitSeconds);
		setInputDisabled(wait, caps.maxWaitSeconds <= 0);
	}
	setText("autoClickerWaitValue", `${behavior.waitSeconds}s`);
	const rowDepth = document.getElementById("autoClickerRowDepthSlider");
	if (rowDepth) {
		rowDepth.max = String(caps.maxRowDepth);
		rowDepth.value = String(behavior.rowDepth);
		setInputDisabled(rowDepth, caps.maxRowDepth <= 1);
	}
	setText("autoClickerRowDepthValue", `${behavior.rowDepth} ${behavior.rowDepth === 1 ? "row" : "rows"}`);
	renderFrequencyControls(config, behavior);
	document.querySelectorAll('input[name="autoClickerWorldMode"]').forEach(input => {
		input.checked = input.value === behavior.worldMode;
		setInputDisabled(input, input.value === "all" && !caps.canUseWorlds);
	});
}

export function showAutoClicker(config) {
	const mobile = isMobileAutoClickerView();
	autoClickerDescriptionExpanded = !mobile || !game.autoClicker.hasSeenDescription;
	autoClickerTextExpanded.behaviorSummary = !mobile || !game.autoClicker.hasSeenBehaviorText;
	autoClickerTextExpanded.hint = !mobile || !game.autoClicker.hasSeenBehaviorText;
	if (mobile && !game.autoClicker.hasSeenDescription) {
		game.autoClicker.hasSeenDescription = true;
		saveState();
	}
	if (mobile && !game.autoClicker.hasSeenBehaviorText) {
		game.autoClicker.hasSeenBehaviorText = true;
		saveState();
	}
	updateAutoClickerDescription(config);
	updateAutoClickerCollapsibleTexts();
	updateAutoClickerView(config);
	document.getElementById("autoClickerScreen").style.display = "block";
}

export function toggleAutoClickerDescription(config) {
	if (!isMobileAutoClickerView()) return;
	autoClickerDescriptionExpanded = !autoClickerDescriptionExpanded;
	updateAutoClickerDescription(config);
}

export function toggleAutoClickerText(config, key) {
	if (!isMobileAutoClickerView() || !Object.hasOwn(autoClickerTextExpanded, key)) return;
	autoClickerTextExpanded[key] = !autoClickerTextExpanded[key];
	updateAutoClickerCollapsibleTexts(config);
}

export function closeAutoClicker() {
	document.getElementById("autoClickerScreen").style.display = "none";
}
