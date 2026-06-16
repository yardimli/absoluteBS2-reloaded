const SAVE_KEY = "ABS2Save";

export let game;
export let currentWorld = 1;
export let debugMultiplier = 1;
const BEST_VALUE_LEVEL = 2;
const WAIT_PLANNING_LEVEL = 4;
const WORLD_TRAVEL_LEVEL = 8;
const ROW_UNLOCK_LEVELS = [0, 2, 5, 8, 11, 14];
const DEFAULT_AUTO_CLICKER_HIBERNATION_MS = 100 * 365 * 24 * 60 * 60 * 1000;

function decimalArray(length) {
	return Array.from({length}, () => new Decimal(0));
}

export function resetState(config) {
	const resourceState = Object.fromEntries(
		config.progression.resources.map(resource => [resource.id, new Decimal(resource.initial)])
	);
	game = {
		timeOfLastUpdate: Date.now(),
		...resourceState,
		miners: new Decimal(0),
		minerCost: new Decimal(config.mining.initialMinerCost),
		miningCooldown: 0,
		miningResources: decimalArray(config.mining.ores.length),
		XP: new Decimal(0),
		level: new Decimal(1),
		nextCrateLevel: new Decimal(config.progression.leveling.firstCrateLevel),
		crates: [],
		cratesNotChecked: 0,
		patterns: [[0, 0, 1]],
		relics: [],
		relicPotionMultipliers: decimalArray(config.progression.resources.length).map(() => new Decimal(1)),
		potions: [],
		potionCooldowns: Array(config.potions.items.length).fill(0),
		currentItemScreen: "",
		currentPattern: [1, 0],
		notifications: [true],
		worldsUnlocked: 1,
		autoClicker: {
			speedLevel: 0,
			intelligenceLevel: 0,
			lastActionAt: Date.now(),
			sleepUntil: Date.now() + DEFAULT_AUTO_CLICKER_HIBERNATION_MS,
			manualWorldId: 0,
			hasSeenDescription: false,
			hasSeenBehaviorText: false,
			behavior: {
				priority: "simple",
				waitSeconds: 0,
				rowDepth: 1,
				worldMode: "current",
				rowEvery: {},
				rowClicks: {}
			}
		},
		hasSeenHelp: false
	};
	currentWorld = 1;
}

export function ensureAutoClickerState(config) {
	if (!game.autoClicker || typeof game.autoClicker !== "object") {
		game.autoClicker = {};
	}
	if (!Number.isFinite(Number(game.autoClicker.speedLevel))) game.autoClicker.speedLevel = 0;
	if (!Number.isFinite(Number(game.autoClicker.intelligenceLevel))) game.autoClicker.intelligenceLevel = 0;
	if (!Number.isFinite(Number(game.autoClicker.lastActionAt))) game.autoClicker.lastActionAt = Date.now();
	if (!Number.isFinite(Number(game.autoClicker.sleepUntil))) game.autoClicker.sleepUntil = 0;
	if (!Number.isFinite(Number(game.autoClicker.manualWorldId))) game.autoClicker.manualWorldId = 0;
	game.autoClicker.hasSeenDescription = game.autoClicker.hasSeenDescription === true;
	game.autoClicker.hasSeenBehaviorText = game.autoClicker.hasSeenBehaviorText === true;
	if (!game.autoClicker.behavior || typeof game.autoClicker.behavior !== "object") game.autoClicker.behavior = {};
	game.autoClicker.speedLevel = Math.max(0, Math.min(config.autoClicker.speed.maxLevel, Math.floor(Number(game.autoClicker.speedLevel))));
	game.autoClicker.intelligenceLevel = Math.max(0, Math.min(config.autoClicker.intelligence.maxLevel, Math.floor(Number(game.autoClicker.intelligenceLevel))));
	game.autoClicker.sleepUntil = Math.max(0, Number(game.autoClicker.sleepUntil));
	game.autoClicker.manualWorldId = Math.max(0, Math.floor(Number(game.autoClicker.manualWorldId)));
	const intelligence = game.autoClicker.intelligenceLevel;
	const rowUnlocks = ROW_UNLOCK_LEVELS.filter(level => intelligence >= level).length;
	const waitBand = intelligence >= WAIT_PLANNING_LEVEL ? Math.floor((intelligence - WAIT_PLANNING_LEVEL) / 2) + 1 : 0;
	const maxRowDepth = Math.max(1, Math.min(config.progression.tiers.length, rowUnlocks));
	const maxWaitSeconds = waitBand > 0
		? Math.min(60, waitBand * 5)
		: 0;
	const behavior = game.autoClicker.behavior;
	if (!["simple", "best"].includes(behavior.priority)) behavior.priority = "simple";
	if (behavior.priority === "best" && intelligence < BEST_VALUE_LEVEL) behavior.priority = "simple";
	behavior.waitSeconds = Math.max(0, Math.min(maxWaitSeconds, Number(behavior.waitSeconds) || 0));
	behavior.rowDepth = Math.max(1, Math.min(maxRowDepth, Math.floor(Number(behavior.rowDepth) || 1)));
	if (!behavior.rowEvery || typeof behavior.rowEvery !== "object") behavior.rowEvery = {};
	if (!behavior.rowClicks || typeof behavior.rowClicks !== "object") behavior.rowClicks = {};
	if (behavior.row2Every && !behavior.rowEvery[1]) behavior.rowEvery[1] = behavior.row2Every;
	if (behavior.row3Every && !behavior.rowEvery[2]) behavior.rowEvery[2] = behavior.row3Every;
	if (behavior.row1Clicks && !behavior.rowClicks[0]) behavior.rowClicks[0] = behavior.row1Clicks;
	if (behavior.row2Clicks && !behavior.rowClicks[1]) behavior.rowClicks[1] = behavior.row2Clicks;
	const maxTargetRow = Math.max(0, Math.min(behavior.rowDepth - 1, config.progression.tiers.length - 2));
	for (let rowIndex = 0; rowIndex < config.progression.tiers.length; rowIndex += 1) {
		behavior.rowClicks[rowIndex] = Math.max(0, Math.floor(Number(behavior.rowClicks[rowIndex]) || 0));
	}
	for (let targetRow = 1; targetRow <= maxTargetRow; targetRow += 1) {
		const fallback = targetRow === 1 ? 5 : targetRow === 2 ? 4 : 3;
		behavior.rowEvery[targetRow] = Math.max(1, Math.min(20, Math.floor(Number(behavior.rowEvery[targetRow]) || fallback)));
	}
	if (!["current", "all"].includes(behavior.worldMode)) behavior.worldMode = "current";
	if (behavior.worldMode === "all" && intelligence < WORLD_TRAVEL_LEVEL) {
		behavior.worldMode = "current";
	}
	if (game.autoClicker.manualWorldId > game.worldsUnlocked || !config.worldById[game.autoClicker.manualWorldId]) {
		game.autoClicker.manualWorldId = 0;
	}
}

function hydrateValue(value) {
	if (Array.isArray(value)) return value.map(hydrateValue);
	if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
		return new Decimal(value);
	}
	return value;
}

export function loadState(config) {
	resetState(config);
	const saved = localStorage.getItem(SAVE_KEY);
	if (!saved) return;
	try {
		const loaded = JSON.parse(saved);
		for (const [key, value] of Object.entries(loaded)) {
			if (value !== undefined) game[key] = hydrateValue(value);
		}
		game.currentItemScreen = "";
		currentWorld = 1;
	} catch (error) {
		console.error("Could not load save data.", error);
	}
}

export function saveState() {
	game.lastSave = Date.now();
	localStorage.setItem(SAVE_KEY, JSON.stringify(game));
}

export function setCurrentWorld(value) {
	currentWorld = value;
}

export function setDebugMultiplier(value) {
	debugMultiplier = value;
}

export function importState(config, encodedSave) {
	const loaded = JSON.parse(atob(encodedSave));
	resetState(config);
	for (const [key, value] of Object.entries(loaded)) game[key] = hydrateValue(value);
	saveState();
}

export function exportState() {
	saveState();
	return btoa(JSON.stringify(game));
}
