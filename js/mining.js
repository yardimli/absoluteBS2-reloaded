import {game} from "./state.js";
import {format, formatTime} from "./format.js";

export function initializeMiningView(config) {
	const list = document.getElementById("miningResourceList");
	list.replaceChildren();
	for (const ore of config.mining.ores) {
		const fragment = document.getElementById("mining-resource-template").content.cloneNode(true);
		const image = fragment.querySelector('[data-field="ore-image"]');
		if (image && ore.image) {
			image.src = ore.image;
			image.alt = ore.name;
		}
		const amount = fragment.querySelector('[data-field="ore-amount"]');
		amount.dataset.oreId = ore.id;
		const name = fragment.querySelector('[data-field="ore-name"]');
		name.textContent = ore.name.toLowerCase();
		name.style.color = ore.color;
		list.append(fragment);
	}
}

export function showMining(config) {
	document.getElementById("itemScreen").style.display = "none";
	game.currentItemScreen = "";
	document.getElementById("miningScreen").style.display = "block";
	updateMiningView(config);
}

export function closeMining() {
	document.getElementById("miningScreen").style.display = "none";
}

export function purchaseMiner(config) {
	if (game.money.lt(game.minerCost)) return false;
	game.money = game.money.sub(game.minerCost);
	game.miners = game.miners.add(1);
	game.minerCost = new Decimal(config.mining.minerCostBase).pow(game.miners).mul(config.mining.initialMinerCost);
	updateMiningView(config);
	return true;
}

export function rollMiningResource(config) {
	const roll = Math.random();
	let cumulative = 0;
	let selectedIndex = config.mining.ores.length - 1;
	for (let index = 0; index < config.mining.ores.length; index++) {
		cumulative += config.mining.ores[index].rollChance;
		if (roll < cumulative) {
			selectedIndex = index;
			break;
		}
	}
	const ore = config.mining.ores[selectedIndex];
	const sourceAmount = ore.amountFrom
		? game.miningResources[config.oreIndexById[ore.amountFrom]]
		: new Decimal(0);
	game.miningResources[selectedIndex] = game.miningResources[selectedIndex].add(sourceAmount.add(1));
}

export function miningMoneyMultiplier(config) {
	const index = config.oreIndexById[config.mining.moneyBoostOre];
	return game.miningResources[index].pow(config.mining.moneyBoostExponent).add(1);
}

export function updateMiningView(config) {
	if (!config || document.getElementById("miningScreen").style.display !== "block") return;
	document.getElementById("minerPurchaseCost").textContent = `Costs $${format(game.minerCost)}`;
	document.getElementById("miners").textContent = format(game.miners);
	document.getElementById("miningCooldown").textContent = formatTime(game.miningCooldown);
	document.getElementById("miningBoost").textContent = format(miningMoneyMultiplier(config), 2);
	document.querySelectorAll("[data-ore-id]").forEach(element => {
		element.textContent = format(game.miningResources[config.oreIndexById[element.dataset.oreId]]);
	});
}
