const SAVE_KEY = "ABS2Save";

export let game;
export let currentWorld = 1;
export let debugMultiplier = 1;

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
		hasSeenHelp: false
	};
	currentWorld = 1;
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
