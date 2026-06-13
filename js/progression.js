import {game, debugMultiplier} from "./state.js";

export function xpToLevel(config, xp) {
	const leveling = config.progression.leveling;
	return xp.div(leveling.xpDivisor).pow(leveling.levelExponent).floor().add(1);
}

export function levelToXp(config, level) {
	const leveling = config.progression.leveling;
	return level.sub(1).pow(1 / leveling.levelExponent).mul(leveling.xpDivisor).ceil();
}

export function levelToColour(level) {
	const colour = Math.floor(((level - 1) ** 0.5) * 50) % 960;
	const stage = Math.ceil((colour + 1) / 160);
	if (stage === 1) return `#c0${(32 + colour).toString(16)}20`;
	if (stage === 2) return `#${(192 - (colour - 160)).toString(16)}c020`;
	if (stage === 3) return `#20c0${(32 + (colour - 320)).toString(16)}`;
	if (stage === 4) return `#20${(192 - (colour - 480)).toString(16)}c0`;
	if (stage === 5) return `#${(32 + (colour - 640)).toString(16)}20c0`;
	return `#c020${(192 - (colour - 800)).toString(16)}`;
}

export function calculateButtonGain(config, tier, button) {
	const parentMultiplier = tier.parentResource ? game[tier.parentResource].add(1) : new Decimal(1);
	return new Decimal(button.gain)
		.mul(parentMultiplier)
		.mul(game.relicPotionMultipliers[tier.relicIndex])
		.mul(debugMultiplier);
}

export function canBuyButton(tier, button) {
	return game[tier.costResource].gte(button.cost);
}

function resetResources(config, resourceIds) {
	for (const resourceId of resourceIds) {
		game[resourceId] = new Decimal(config.resourceById[resourceId].initial);
	}
}

export function buyButton(config, tierId, button) {
	const tier = config.tierById[tierId];
	if (!tier || !canBuyButton(tier, button)) return false;
	game[tier.costResource] = game[tier.costResource].sub(button.cost);
	resetResources(config, tier.resets);
	game[tier.gainResource] = game[tier.gainResource].add(calculateButtonGain(config, tier, button));
	if (tier.xp) {
		game.XP = game.XP.add(tier.xp * debugMultiplier);
		awardLevelCrates(config);
	}
	return true;
}

export function claimFreeResource(freeButton) {
	if (game[freeButton.requiredResource].lt(freeButton.requiredAmount)) return false;
	if (game[freeButton.targetResource].gte(freeButton.amount)) return false;
	game[freeButton.targetResource] = new Decimal(freeButton.amount);
	return true;
}

export function awardLevelCrates(config) {
	const leveling = config.progression.leveling;
	game.level = xpToLevel(config, game.XP);
	if (game.level.lt(game.nextCrateLevel) || game.level.gt(leveling.lastCrateLevel)) return;
	const amount = Decimal.min(
		game.level.sub(game.nextCrateLevel).add(1),
		leveling.maxCratesPerCheck
	).toNumber();
	const existing = game.crates.find(crate => crate[0] === 0);
	if (existing) existing[1] += amount;
	else game.crates.push([0, amount]);
	game.cratesNotChecked += amount;
	game.nextCrateLevel = game.level.add(1);
}
