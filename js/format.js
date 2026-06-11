export function format(value, accuracy = 0, max = 6) {
	const E = x => new Decimal(x);
	let number = E(value);
	const negative = number.lt(0) ? "-" : "";
	if (number.mag === Infinity) return `${negative}Infinity`;
	if (Number.isNaN(number.mag)) return `${negative}NaN`;
	if (number.layer > 0 && number.mag % 1 > 0.9999) number.mag = Math.round(number.mag);
	if (number.lt(0)) number = number.mul(-1);
	if (number.eq(0)) return number.toFixed(accuracy);
	const exponent = number.log10().floor();
	if (number.log10().lt(Math.min(-accuracy, 0)) && accuracy > 1) {
		const smallExponent = number.log10().ceil();
		const mantissa = number.div(smallExponent.eq(-1) ? E(0.1) : E(10).pow(smallExponent));
		const largeExponent = smallExponent.mul(-1).max(1).log10().gte(9);
		return negative + (largeExponent ? "" : mantissa.toFixed(2)) + "e" + format(smallExponent, 0, max);
	}
	if (exponent.lt(max)) {
		const places = Math.max(Math.min(accuracy - exponent.toNumber(), accuracy), 0);
		const fixed = number.toFixed(places);
		return negative + (places > 0 ? fixed : fixed.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,"));
	}
	if (number.gte("eeee10")) {
		const slog = number.slog();
		return (slog.gte(1e9) ? "" : E(10).pow(slog.sub(slog.floor())).toFixed(4)) + "F" + format(slog.floor(), 0);
	}
	const mantissa = number.div(E(10).pow(exponent));
	const largeExponent = exponent.log10().gte(4);
	return negative + (largeExponent ? "" : mantissa.toFixed(2)) + "e" + format(exponent, 0, max);
}

export function formatTime(value) {
	const safeValue = Math.max(value, 0);
	const wholeSeconds = Math.floor(safeValue);
	const minutes = Math.floor(wholeSeconds / 60);
	const seconds = wholeSeconds % 60;
	const hundredths = Math.floor((safeValue % 1) * 100);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}
