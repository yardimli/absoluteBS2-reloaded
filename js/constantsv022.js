//Name ideas:
//Exotic
//Infinity
//Hyper-prestige
//Magic
//Collapse
//Galactic
//Void

resetTiers = ["money", "multi", "prestige", "power", "super prestige", "ascension"]
multiPrices = [5, 100, 1200, 20000, 300000, 5e6, 8e7, 2e9, 1e11, 6e12, 5e14, 1e17, 3e19, 1.2e22, 1e25, 1.5e28, 2e31, 5e34, 1e38, 3e41, 1.2e45, 8e48, 7.5e52, 8e56, 1e61, 2e65, 5e69]
multiBoosts = [1, 8, 80, 750, 7000, 30000, 120000, 500000, 2e6, 8e6, 4e7, 3e8, 1.2e9, 8e9, 5e10, 6e11, 8e12, 8e13, 7.5e14, 7e15, 6e16, 5e17, 4e18, 3e19, 2.5e20, 2e21, 1.5e22]
prestigePrices = [10000, 50000, 300000, 3e6, 5e7, 2e9, 8e10, 5e12, 5e14, 7.5e16, 1e19, 3e21, 1e24, 6e26, 5e29, 6e32, 7.5e35, 1e39, 1e42, 1.3e45, 2e48, 3.5e51, 5e54, 9e57, 2e60, 5e63]
prestigeBoosts = [2, 5, 15, 60, 200, 750, 2500, 12000, 60000, 200000, 750000, 4e6, 2.5e7, 1.2e8, 6e8, 2e9, 9e9, 4e10, 1.8e11, 8e11, 3e12, 1.5e13, 7e13, 2.5e14, 1e15, 4.5e15]
powerPrices = [2500, 10000, 45000, 250000, 1.8e6, 1.5e7, 2e8, 2.5e9, 3e10, 6e11, 3e13, 5e15, 1e18, 2.5e20, 7e22, 2e25, 1e28, 7.5e30, 5e33, 5e36, 6e39, 8e42]
powerBoosts = [2, 6, 15, 50, 180, 450, 1300, 7500, 30000, 120000, 500000, 1.6e6, 6e6, 2.5e7, 1e8, 4.5e8, 1.4e9, 6e9, 2.4e10, 1e11, 4e11, 1.5e12]
superPrestigePrices = [2500, 12000, 55000, 350000, 2.5e6, 5e7, 1e9, 3e10, 1e12, 4.5e13, 2e15, 1e17, 8e18, 8e20, 1e23, 1.4e25]
superPrestigeBoosts = [2, 5, 14, 40, 140, 400, 1200, 6000, 24000, 110000, 450000, 1.6e6, 7.5e6, 2.5e7, 1.2e8, 5e8]
ascensionPrices = [2500, 12000, 60000, 400000, 2.5e6, 5e7, 1.2e9, 3.5e10, 1.2e12, 5e13, 2e15]
ascensionBoosts = [2, 5, 14, 40, 150, 400, 1200, 5500, 22000, 90000, 400000]
infernalPrices = [2500, 12000, 60000, 400000, 2.5e6, 5e7]
infernalBoosts = [2, 5, 14, 40, 150, 400]

crateNames = ["Basic crate", "Advanced crate"]
patternNames = ["Stripes", "Checkerboard", "Zig-zag", "Dots", "Skulls", "Binary", "Stripes 2", "Money", "Warning"]
patternSpecialTypes = ["", "red ", "blue "]
relicNames = ["Magic dice", "Ruby crown", "Tome of finances", "Tome of multi", "Shiny screw", "Golden key", "Tome of prestige", "Tome of power"]
relicEffects = [[0,0.2],[1,0.3],[0,0.75],[1,0.75],[1,0.6],[0,1],[2,0.75],[3,0.75]]
potionNames = ["Money potion", "Multi potion", "Prestige potion", "Power potion", "Super prestige potion"]

worldCosts = ["1e20", "1e50", "1e9999"]
worldNames = ["Overworld", "Cave world", "Sky world"]
worldBackgrounds = ["#ca9", "#888", "#9ce"]

basicCrateRarities = [
[1,5,3], //Relative probabilities of getting a pattern, relic or potion
[[0,28],[1,16],[2,10],[3,6],[4,3],[5,1]], //Relative pattern probabilities
[[0,12],[1,8],[2,5],[3,3]], //Relative relic probabilities
[[0,5],[1,3],[2,2],[3,1]] //Relative potion probabilities
]

advancedCrateRarities = [
[1,5,3], //Relative probabilities of getting a pattern, relic or potion
[[0,10],[1,28],[2,16],[3,10],[4,6],[5,3],[6,1]], //Relative pattern probabilities
[[4,12],[5,8],[6,5],[7,3]], //Relative relic probabilities
[[2,4],[3,2],[4,1]] //Relative potion probabilities
]