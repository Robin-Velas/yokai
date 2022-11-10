"use strict"

module.exports = {

	// transforme un nombre de secondes en texte français
	// exemple avec la précision ::
	// 61 => "1 minute et 1 seconde" si la précision est 2
	// 61 => "1 minute" si la précision est 1
	format_sec : (seconds, precision = 2) => {
		if (seconds < 0)
			seconds = -seconds;
		if (seconds < 1)
			return "un instant"
		const units = [31556927, 2629744, 604800, 86400, 3600, 60, 1];
		const names = ["an", "mois", "semaine", "jour", "heure", "minute", "seconde"];
		const res = [ ]
		for(const i in units)
		{
			if (seconds >= units[i]) {
				const n = Math.floor(seconds / units[i])
				seconds %= units[i]
				res.push(n + " " + names[i] + (n > 1 ? "s" : ""))
				if (res.length === precision)
					break
			}
		}
		if (res.length > 1) {
			const last = res.pop()
			res.push("et", last)
		}
		return res.join(" ").replace("ss", "s");
	}

}