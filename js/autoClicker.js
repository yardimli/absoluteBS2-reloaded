import {currentWorld, game, setCurrentWorld} from "./state.js";
import {calculateButtonGain, canBuyButton} from "./progression.js";
import {format, formatTime} from "./format.js";
import {getModernTheme} from "./themes.js";
import {activateWorldButton, renderWorld, updateWorldButtons} from "./worlds.js";

const E = value => new Decimal(value);
const SLEEP_DURATION_MS = 6 * 60 * 60 * 1000;

function themeConfig(config) {
	return config.autoClicker.themes[getModernTheme()] || config.autoClicker.themes.tech;
}

function upgradeCost(upgrade, level) {
	return E(upgrade.baseCost).mul(E(upgrade.growth).pow(level));
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
	const intelligence = game.autoClicker.intelligenceLevel;
	const canNavigate = intelligence >= config.autoClicker.intelligence.worldNavigationLevel;
	if (!canNavigate) return [currentWorld];
	return config.worlds
		.filter(world => world.id <= game.worldsUnlocked)
		.map(world => world.id);
}

function chooseAvailableCandidate(config, available) {
	const intelligence = game.autoClicker.intelligenceLevel;
	if (intelligence < 3) {
		return available
			.slice()
			.sort((a, b) => a.worldId - b.worldId || tierOrder(config, a.tierId) - tierOrder(config, b.tierId) || (a.buttonIndex ?? -1) - (b.buttonIndex ?? -1))[0];
	}
	return available
		.slice()
		.sort((a, b) => b.score - a.score)[0];
}

function shouldWaitForBetter(config, chosen, allCandidates) {
	const intelligence = game.autoClicker.intelligenceLevel;
	const settings = config.autoClicker.intelligence;
	if (!chosen || intelligence < settings.waitPlanningLevel) return false;
	const income = currentMoneyPerSecond();
	if (income.lte(0)) return false;
	const waitWindow = intelligence * settings.waitWindowPerLevelSeconds;
	for (const candidate of allCandidates) {
		if (candidate.available || candidate.type !== "button") continue;
		const tier = config.tierById[candidate.tierId];
		if (tier.costResource !== "money") continue;
		const missing = E(candidate.button.cost).sub(game.money);
		if (missing.lte(0)) continue;
		const seconds = missing.div(income).toNumber();
		if (!Number.isFinite(seconds) || seconds > waitWindow) continue;
		if (candidate.score > chosen.score * 1.22) return true;
	}
	return false;
}

function selectorForCandidate(candidate) {
	if (candidate.type === "free") return `[data-action="free-resource"][data-tier="${candidate.tierId}"]`;
	return `[data-action="buy-button"][data-tier="${candidate.tierId}"][data-button-index="${candidate.buttonIndex}"]`;
}

function animateAutoClicker(config, element) {
	if (!element) return;
	const avatar = document.getElementById("autoClickerAvatar");
	const burst = document.getElementById("autoClickerBurst");
	if (!avatar || !burst) return;
	const image = autoClickerImage(config);
	avatar.src = image;
	const rect = element.getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + rect.height / 2;
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
	if (isAutoClickerSleeping()) return;
	const now = Date.now();
	const intervalMs = autoClickerInterval(config) * 1000;
	if (now - game.autoClicker.lastActionAt < intervalMs) return;
	const worldIds = allowedWorldIds(config);
	const allCandidates = worldIds.flatMap(worldId => collectCandidates(config, worldId));
	const available = allCandidates.filter(candidate => candidate.available);
	const chosen = chooseAvailableCandidate(config, available);
	if (!chosen) return;
	if (shouldWaitForBetter(config, chosen, allCandidates)) return;
	if (chosen.worldId !== currentWorld) {
		setCurrentWorld(chosen.worldId);
		renderWorld(config);
	}
	const element = document.querySelector(selectorForCandidate(chosen));
	animateAutoClicker(config, element);
	if (activateWorldButton(config, element)) {
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

function upgradeText(config, type) {
	const themed = themeConfig(config);
	const settings = type === "speed" ? config.autoClicker.speed : config.autoClicker.intelligence;
	const level = game.autoClicker[`${type}Level`];
	const cost = autoClickerUpgradeCost(config, type);
	const label = type === "speed" ? themed.speedName : themed.intelligenceName;
	const effect = type === "speed"
		? `Action timer: ${formatTime(autoClickerInterval(config))}`
		: level >= config.autoClicker.intelligence.worldNavigationLevel
			? "Can compare buttons across unlocked worlds."
			: level >= config.autoClicker.intelligence.waitPlanningLevel
				? "Can wait briefly for stronger money buttons."
				: "Chooses simple available buttons.";
	return {
		label,
		level: `Level ${level}/${settings.maxLevel}`,
		cost: level >= settings.maxLevel ? "Maxed" : `Upgrade: $${format(cost)}`,
		effect
	};
}

export function updateAutoClickerView(config) {
	const themed = themeConfig(config);
	const image = autoClickerImage(config);
	const sleeping = isAutoClickerSleeping();
	const remaining = autoClickerSleepRemaining();
	const nav = document.getElementById("autoClickerNavButton");
	if (nav) {
		nav.style.backgroundImage = `url("${image}")`;
		nav.dataset.tooltip = themed.navTooltip;
		nav.setAttribute("aria-label", themed.navTooltip);
		nav.classList.toggle("isSleeping", sleeping);
		nav.dataset.sleepLabel = getModernTheme() === "tech" ? "RECHARGE" : "SLEEP";
	}
	const avatar = document.getElementById("autoClickerAvatar");
	if (avatar) {
		avatar.src = image;
		avatar.alt = themed.name;
	}
	const modalIcon = document.getElementById("autoClickerModalIcon");
	if (modalIcon) {
		modalIcon.src = image;
		modalIcon.alt = themed.name;
	}
	const title = document.getElementById("autoClickerTitle");
	if (title) title.textContent = `${themed.name} upgrades`;
	const eyebrow = document.getElementById("autoClickerEyebrow");
	if (eyebrow) eyebrow.textContent = themed.title;
	const description = document.getElementById("autoClickerDescription");
	if (description) description.textContent = themed.description;
	const status = document.getElementById("autoClickerStatus");
	if (status) {
		status.textContent = sleeping
			? `${themed.name} is ${getModernTheme() === "tech" ? "recharging" : "sleeping"} for ${formatTime(remaining)}.`
			: `${themed.name} acts every ${formatTime(autoClickerInterval(config))}. Intelligence ${game.autoClicker.intelligenceLevel} controls planning depth.`;
	}
	const sleepButton = document.getElementById("autoClickerSleepButton");
	if (sleepButton) {
		sleepButton.textContent = sleeping
			? (getModernTheme() === "tech" ? `Power on ${themed.name}` : `Wake up ${themed.name}`)
			: (getModernTheme() === "tech" ? `Make ${themed.name} recharge for 6 hours` : `Make ${themed.name} sleep for 6 hours`);
	}
	for (const type of ["speed", "intelligence"]) {
		const text = upgradeText(config, type);
		const prefix = type === "speed" ? "autoClickerSpeed" : "autoClickerIntelligence";
		document.getElementById(`${prefix}Name`).textContent = text.label;
		document.getElementById(`${prefix}Level`).textContent = text.level;
		document.getElementById(`${prefix}Effect`).textContent = text.effect;
		const button = document.getElementById(`${prefix}Button`);
		button.textContent = text.cost;
		button.disabled = !canUpgradeAutoClicker(config, type);
	}
}

export function showAutoClicker(config) {
	updateAutoClickerView(config);
	document.getElementById("autoClickerScreen").style.display = "block";
}

export function closeAutoClicker() {
	document.getElementById("autoClickerScreen").style.display = "none";
}
