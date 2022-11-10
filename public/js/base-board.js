;"use strict";

/**
 * La logique du Yōkai
 */

(board => {
	if (typeof exports === "object")
		module.exports = board; // NODE
	else
		jload(true, board) // BROWSER
})(() => ({

	data : [ ],

	// Initialise le board pour une partie de Yōkai,
	// le serveur et le joueur exécutent tous les deux ce code pour gérer la partie.
	init: function (group) {

		this.private_turn_number = 1
		this.public_turn_number = 1

		this.group = group
		this.group.forEach(p => p.hints = [])

		this.total_hints = this.group.length === 2 ? 7 : this.group.length === 3 ? 9 : 10
		this.hints = [[ /* names */], [ /* positions */],]

		for (let row = 0, card_number = 0; row < 6; ++row) {
			this.data[row] = []
			for (let col = 0; col < 6; ++col)
				// une carte est un tableau contenant son id (entier de 1 à 16)
				// le second élément du tableau sera éventuellement un indice (chaîne de caractères)
				this.data[row].push(row && col && row < 5 && col < 5 ? [++card_number] : 0)
		}

		this.max_y = this.data.length - 2
		this.max_x = this.data[0].length - 2
	},

	// Retourne le joueur courant qui n'a pas encore terminé son tour.
	get_current_player : function(){
		const pos = (this.private_turn_number - 1) % this.group.length
		return this.group[pos]
	},

	// Retourne le numéro du coup privé ou public (le numéro commence à 1)
	// - le numéro de coup privé est incrémenté à chaque fois qu'un joueur est appelé
	// - le numéro de coup public est incrémenté quand tous les joueurs ont terminé leur tour
	get_move_number: function (internal = false) {
		return internal ? this.private_turn_number : this.public_turn_number
	},

	// Retourne vrai si la pile des indices restants à découvrir n'est pas encore vide, faux si elle est vide.
	can_pick_hint: function () {
		return this.total_hints > 0
	},

	// Retourne vrai si l'indice est sur le coté du board, faux sinon.
	is_movable_hint: function (css) {
		return this.hints[0].indexOf(css) !== -1
	},

	// Retourne vrai si l'indice est sur le coté du board et si il peut être déplacé vers la carte en [y_1, x_1], faux sinon.
	can_move_hint: function (css, y, x) {
		return this.is_movable_hint(css) && this.has_card(y, x) && !this.has_hint(y, x)
	},

	// Ajoute un indice sur le coté du board.
	add_hint: function (css) {
		if (this.total_hints === 0)
			throw "Tous les indices ont déjà été dépilés."
		--this.total_hints
		this.hints[0].push(css)
		if (++this.private_turn_number % this.group.length === 1)
			++this.public_turn_number
	},

	// Déplace un indice depuis les indices sur le coté du board vers la carte en [y_1, x_1].
	move_hint: function (css, y, x) {
		if (!this.has_card(y, x))
			throw "Un indice doit toujours être placé sur une carte."
		if (this.has_hint(y, x))
			throw "Un indice ne doit pas en recouvrir un autre."
		if (!this.is_movable_hint(css))
			throw "L’indice n'est pas disponible."
		const pos = this.hints[0].indexOf(css)
		const card = this.data[y][x]
		for(const player of this.group)
		{
			const pos = player.hints.indexOf(css)
			if (pos !== -1)
			{
				player.hints = player.hints.splice(pos, 1)
				break
			}
		}
		this.get_current_player().hints.push(css)
		this.hints[0].splice(pos, 1)
		card.push(css)
		this.hints[1].push(css)
		if (++this.private_turn_number % this.group.length === 1)
			++this.public_turn_number
	},

	// Retourne vrai si la cellule [y, x] contient une carte, faux sinon.
	has_card: function (y, x) {
		return this.data[y]?.[x]?.[0] > 0
	},

	// Retourne vrai si la cellule [y, x] contient un indice, faux sinon.
	has_hint: function (y, x) {
		return this.data[y]?.[x]?.[1] !== undefined
	},

	// Retourne vrai si la cellule [y, x] existe, faux sinon.
	exists: function (y, x) {
		return this.data[y]?.[x] !== undefined
	},

	// Retourne vrai si la cellule [y, x] existe et ne contient pas une carte.
	is_empty: function (y, x) {
		return this.data[y]?.[x] === 0
	},

	// Retourne vrai si la carte en [y_1, x_1] peut légalement être déplacée en [y_2, x_2], faux sinon.
	can_move_card: function (y_1, x_1, y_2, x_2) {
		if (!this.is_empty(y_2, x_2))
			return false
		if (this.has_hint(y_1, x_1) || this.has_card(y_2, x_2))
			return false
		y_1 = ~~+y_1
		x_1 = ~~+x_1
		y_2 = ~~+y_2
		x_2 = ~~+x_2
		if (x_1 === x_2 && y_1 === y_2)
			return false
		const stack = [[y_2, x_2],], reached = new Array(17)
		reached[0] = 0
		do {
			const [curr_y, curr_x] = stack.pop()
			const num = this.data[curr_y][curr_x][0]
			++reached[0]
			reached[num] = true
			for (let i = -1; i < 1; ++i)
				for (let j = -1; j < 1; ++j) {
					// itère Est, Sud, Nord, Ouest
					let y = curr_y + j - i, x = curr_x + (j ^ i - 1) % 2
					this.has_card(y, x) && (y !== y_1 || x !== x_1)
					&& !reached[this.data[y][x][0]] &&
					!stack.some(pending => pending[0] === y && pending[1] === x)
					&& stack.push([y, x])
				}
		}
		while (stack.length)
		return reached[0] === 16
	},

	// Effectue le mouvement demandé,
	// retourne un tableau contenant les informations relatives aux lignes et aux colonnes ajoutées ou supprimées.
	move_card: function (y_1, x_1, y_2, x_2) {
		if (!this.has_card(y_1, x_1))
			throw "Seules les cartes peuvent être déplacées."
		if (this.has_hint(y_1, x_1))
			throw "La carte est sous un indice, elle ne doit plus être déplacée."
		if (!this.is_empty(y_2, x_2))
			throw "La carte doit être déplacée à coté d’une autre carte."
		if (!this.can_move_card(y_1, x_1, y_2, x_2))
			throw "Ce déplacement séparerait les cartes en deux groupes non reliés par un de leur bord, c’est interdit."
		const updates = [false, false, false, false, false, false, false, false,]
		this.max_x = this.data[0].length - 2
		this.data[y_2][x_2] = this.data[y_1][x_1]
		this.data[y_1][x_1] = 0
		// AJOUT D'UNE LIGNE
		if (y_2 === 0)
			this.data.unshift(this.data[this.max_y + 1].slice()) && (updates[0] = true)
		else if (y_2 === this.max_y + 1)
			this.data.push(this.data[0].slice()) && (updates[1] = true)
		this.max_y = this.data.length - 2
		// AJOUT D'UNE COLONNE
		if (x_2 === 0)
			this.data.forEach(row => row.unshift(0)) && (updates[2] = true)
		else if (x_2 === this.max_x + 1)
			this.data.forEach(row => row.push(0)) && (updates[3] = true)
		this.max_x = this.data[0].length - 2
		// SUPPRESSION D'UNE LIGNE
		if (this.data[1].every(cell => cell === 0))
			this.data.shift() && (updates[4] = true)
		else if (this.data[this.max_y].every(cell => cell === 0))
			this.data.pop() && (updates[5] = true)
		this.max_y = this.data.length - 2
		// SUPPRESSION D'UNE COLONNE
		if (this.data.every(row => row[1] === 0))
			this.data.forEach(row => row.shift()) && (updates[6] = true)
		else if (this.data.every(row => row[this.max_x] === 0))
			this.data.forEach(row => row.pop()) && (updates[7] = true)
		this.max_x = this.data[0].length - 2
		return updates
	},

}));
