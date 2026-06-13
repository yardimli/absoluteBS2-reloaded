const DATA_FILES = {
	progression: "data/progression.json",
	crates: "data/crates.json",
	patterns: "data/patterns.json",
	relics: "data/relics.json",
	potions: "data/potions.json",
	mining: "data/mining.json",
	autoClicker: "data/autoclicker.json"
};

async function loadJson(path) {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`Unable to load ${path}: ${response.status}`);
	}
	return response.json();
}

export async function loadConfig() {
	const entries = await Promise.all(
		Object.entries(DATA_FILES).map(async ([key, path]) => [key, await loadJson(path)])
	);
	const worlds = await Promise.all([1, 2, 3].map(id => loadJson(`data/worlds/world-${id}.json`)));
	const config = Object.fromEntries(entries);
	config.worlds = worlds;
	config.resourceById = Object.fromEntries(config.progression.resources.map(resource => [resource.id, resource]));
	config.tierById = Object.fromEntries(config.progression.tiers.map(tier => [tier.id, tier]));
	config.worldById = Object.fromEntries(worlds.map(world => [world.id, world]));
	config.crateById = Object.fromEntries(config.crates.items.map(crate => [crate.id, crate]));
	config.crateByKey = Object.fromEntries(config.crates.items.map(crate => [crate.key, crate]));
	config.patternById = Object.fromEntries(config.patterns.items.map(pattern => [pattern.id, pattern]));
	config.patternSpecialById = Object.fromEntries(config.patterns.specialTypes.map(type => [type.id, type]));
	config.relicById = Object.fromEntries(config.relics.items.map(relic => [relic.id, relic]));
	config.potionById = Object.fromEntries(config.potions.items.map(potion => [potion.id, potion]));
	config.oreIndexById = Object.fromEntries(config.mining.ores.map((ore, index) => [ore.id, index]));
	return config;
}
