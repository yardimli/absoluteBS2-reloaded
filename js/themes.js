const MODERN_THEME_KEY = "ABS2ModernTheme";
const DEFAULT_THEME = "liquid";
const TECH_THEME = "tech";

function isModernPage() {
	return document.body.dataset.theme === "modern";
}

export function getModernTheme() {
	if (!isModernPage()) return DEFAULT_THEME;
	return localStorage.getItem(MODERN_THEME_KEY) === TECH_THEME ? TECH_THEME : DEFAULT_THEME;
}

export function applyModernTheme() {
	if (!isModernPage()) return;
	const theme = getModernTheme();
	document.body.dataset.modernTheme = theme;
	const toggle = document.getElementById("modernThemeToggle");
	if (toggle) toggle.textContent = theme === TECH_THEME ? "Fantasy Theme" : "Tech Theme";
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
		miningHeading.src = theme === TECH_THEME ? "images/modern/tech/nav-mining.png" : "images/modern/nav-mining.png";
		miningHeading.alt = labels.navMining;
	}
}

export function toggleModernTheme() {
	const next = getModernTheme() === TECH_THEME ? DEFAULT_THEME : TECH_THEME;
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
			crates: "images/modern/nav-crates.png",
			patterns: "images/modern/pattern-1.png",
			relics: "images/modern/nav-relics.png",
			potions: "images/modern/nav-potions.png"
		};
	return icons[type];
}

export function themedCollectionTitle(type) {
	if (getModernTheme() !== TECH_THEME) {
		return {crates: "Crates", patterns: "Patterns", relics: "Relics", potions: "Potions"}[type];
	}
	return {crates: "Data Caches", patterns: "World Files", relics: "Relics", potions: "Power-ups"}[type];
}
