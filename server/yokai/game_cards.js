module.exports = class Game_cards {

	constructor() {
		this.cards = [ ];
		this.initialise();
	}

	initialise() {
		let compteur_famille = {"red": 4, "blue": 4, "purple": 4, "green": 4,}
		for (let i = 0; i < 16; ++i) {
			let not = true;
			let color;
			do {
				color = ["red", "blue", "purple", "green"][Math.floor(Math.random() * 4)];
				if (compteur_famille[color] > 0) {
					not = false;
					compteur_famille[color] -= 1;
				}
			} while (not)
			this.cards.push({"color": color, "x": i % 4, "y": Math.trunc(i / 4), "hints": "no_hint"})
		}
		this.cards.forEach(card => console.log("x: " + card['x'] + ", y: " + card['y'] + ", color: " + card["color"] + ", hints: " + card["hint"]))
	}

	modify(from, dir, to) {
		--from; --to; // ça commence à 1
		switch (dir) {
			case 'W' :
				this.cards[from]["x"] = this.cards[to]["x"]--;
				break;
			case 'E' :
				this.cards[from]["x"] = this.cards[to]["x"]++;
				break;
			case 'N' :
				this.cards[from]["y"] = this.cards[to]["y"]--;
				break;
			case 'S' :
				this.cards[from]["y"] = this.cards[to]["y"]++;
				break;
			default:
		}
	}

	isLegal(from, dir, to) {

		let opposite_dir = ""

		switch (dir) {
			case 'N' :
				opposite_dir = 'S'
				break
			case 'S' :
				opposite_dir = 'N'
				break
			case 'E' :
				opposite_dir = 'W'
				break
			case 'W' :
				opposite_dir = 'E'
				break
		}
		this.modify(from, dir, to);

		for (let card in this.cards) {
			for (let card_comp in this.cards) {
				if (card === card_comp) {
					continue
				}
				if (!((card["x"] === card_comp["x"] + 1 && card["y"] === card_comp["y"]) ||
					(card["x"] === card_comp["x"] - 1 && card["y"] === card_comp["y"]) ||
					(card["x"] === card_comp["x"] && card["y"] === card_comp["y"] + 1) ||
					(card["y"] === card_comp["y"] - 1 && card["x"] === card_comp["x"]))) {
					this.modify(from, opposite_dir, to)
					return false;
				}
			}
		}
		this.modify(from, opposite_dir, to)
		return true;
	}

	get_coords() {
		let ret = new Array(16);
		for (let i = 0; i < 16; i++) {
			ret[i] = {"x": this.cards[i]["x"], "y": this.cards[i]["y"]}
		}
		return ret
	}

	contains(x, y) {
		for (let card in this.cards) {
			if (card['x'] === x && card['y'] === y) {
				return card
			}
		}
		return false
	}
}