const MODERN_THEME_KEY = "ABS2ModernTheme";
const DEFAULT_THEME = "tech";
const TECH_THEME = "tech";
const FANTASY_THEME = "fantasy";

function isModernPage() {
	return document.body.dataset.theme === "modern";
}

export function getModernTheme() {
	if (!isModernPage()) return DEFAULT_THEME;
	return localStorage.getItem(MODERN_THEME_KEY) === FANTASY_THEME ? FANTASY_THEME : TECH_THEME;
}

export function applyModernTheme() {
	if (!isModernPage()) return;
	const theme = getModernTheme();
	document.body.dataset.modernTheme = theme;
	const toggle = document.getElementById("modernThemeToggle");
	if (toggle) toggle.textContent = theme === TECH_THEME ? "Fantasy" : "Tech";
	const brand = document.querySelector(".brandBlock strong");
	if (brand) brand.textContent = theme === TECH_THEME ? "AI Society" : "Fantasy Glass";
	const labels = theme === TECH_THEME
		? {navCrates: "Data caches", navRelics: "Relics", navPotions: "Power-ups", navMining: "Fusion mining"}
		: {navCrates: "Crates", navRelics: "Relics", navPotions: "Potions", navMining: "Mining"};
	for (const [className, label] of Object.entries(labels)) {
		const button = document.querySelector(`.${className}`);
		if (!button) continue;
		button.dataset.tooltip = label;
		button.setAttribute("aria-label", label);
	}
	const miningHeading = document.getElementById("miningHeadingIcon");
	if (miningHeading) {
		miningHeading.src = theme === TECH_THEME ? "images/modern/tech/nav-mining.png" : "images/modern/fantasy/nav-mining.png";
		miningHeading.alt = labels.navMining;
	}
	const miningCopy = theme === TECH_THEME
		? {
			description: "Fusion miners automatically scan for reactor resources. Higher-energy resources increase the yield of the resource beneath them, while Deuterium multiplies Credit generation.",
			boost: "Credit boost",
			cooldown: "Next scan"
		}
		: {
			description: "Miners automatically discover ores. Higher ores increase the amount of the ore beneath them, while Stone multiplies Money gain.",
			boost: "Money boost",
			cooldown: "Next ore"
		};
	const miningDescription = document.getElementById("miningDescription");
	if (miningDescription) miningDescription.textContent = miningCopy.description;
	const miningBoostLabel = document.getElementById("miningBoostLabel");
	if (miningBoostLabel) miningBoostLabel.textContent = miningCopy.boost;
	const miningCooldownLabel = document.getElementById("miningCooldownLabel");
	if (miningCooldownLabel) miningCooldownLabel.textContent = miningCopy.cooldown;
}

export function toggleModernTheme() {
	const next = getModernTheme() === TECH_THEME ? FANTASY_THEME : TECH_THEME;
	localStorage.setItem(MODERN_THEME_KEY, next);
	applyModernTheme();
	return next;
}

export function themedName(item) {
	return getModernTheme() === TECH_THEME && item?.techName ? item.techName : item?.name;
}

export function themedShortName(item) {
	if (getModernTheme() === TECH_THEME) return item?.techShortName || item?.techName || item?.shortName || item?.name;
	return item?.shortName || item?.name;
}

export function themedImage(item) {
	if (getModernTheme() === TECH_THEME && item?.techImage) return item.techImage;
	if (isModernPage() && item?.modernImage) return item.modernImage;
	return item?.image;
}

export function themedIcon(item) {
	if (getModernTheme() === TECH_THEME && item?.techIcon) return item.techIcon;
	return item?.modernIcon || item?.icon || "";
}

export function themedBackgrounds(world) {
	if (getModernTheme() === TECH_THEME && world?.techBackgrounds) return world.techBackgrounds;
	return world?.modernBackgrounds || [];
}

export function themedHeadingIcon(type) {
	const tech = getModernTheme() === TECH_THEME;
	const icons = tech
		? {
			crates: "images/modern/tech/crate-1.png",
			patterns: "images/modern/tech/world-1.jpg",
			relics: "images/modern/tech/relic-1.png",
			potions: "images/modern/tech/potion-1.png"
		}
		: {
			crates: "images/modern/fantasy/nav-crates.png",
			patterns: "images/modern/fantasy/world-1.jpg",
			relics: "images/modern/fantasy/nav-relics.png",
			potions: "images/modern/fantasy/nav-potions.png"
		};
	return icons[type];
}

export function themedCollectionTitle(type) {
	if (getModernTheme() !== TECH_THEME) {
		return {crates: "Crates", patterns: "Patterns", relics: "Relics", potions: "Potions"}[type];
	}
	return {crates: "Data Caches", patterns: "World Files", relics: "Relics", potions: "Power-ups"}[type];
}
