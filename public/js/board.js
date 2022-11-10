;"use strict"

jload(true, {

	/**
	 * BOARD
	 */

	init: function (player, hints_id, cards_id) {

		this.player = player

		this.hints_container = document.getElementById(hints_id)
		this.cards_container = document.getElementById(cards_id)

		this.hints_stack_size = 9999 + player.mode === 2 ? 7 : player.mode === 3 ? 9 : 10

		/**
		 * HINTS
		 */
		const hints_board = document.createElement("table")
		hints_board.classList.add("hints")
		const hints = ["hu", "hr", "hg", "hb", "hp", "hrg", "hrb", "hrp", "hgb", "hgp", "hbp", "hrgb", "hrgp", "hrbp", "hgbp"]
		hints.forEach(name => {
			const tr = document.createElement("tr")
			tr.classList.add("d-none")
			const td = document.createElement("td")
			td.classList.add("hint", name)
			td.dataset.name = name
			td.title = name
			// td.innerHTML = name
			tr.appendChild(td)
			hints_board.appendChild(tr)
		})
		hints_board.firstChild.classList.remove("d-none")
		/**
		 * CARDS
		 */
		this._all_cards = []
		const cards_board = document.createElement("table")
		cards_board.classList.add("cards")
		for (let row = 0; row < 6; ++row) {
			const tr = document.createElement("tr")
			for (let col = 0; col < 6; ++col) {
				const td = document.createElement("td")
				//td.innerHTML = "" + row + " - " + col
				if (row === 0 || row === 5 || col === 0 || col === 5) {
				} else {
					this._all_cards.push(td)
					td.classList.add("card")
					td.classList.add("card-" + this._all_cards.length) // utilisé pour le débogage
				}
				tr.appendChild(td)
			}
			cards_board.appendChild(tr)
		}

		this.hints_container.appendChild(this.hints_board = hints_board)
		this.cards_container.appendChild(this.cards_board = cards_board)

		const adapt_size = (() => {
			let timeout
			return () => {
				clearTimeout(timeout)
				timeout = setTimeout(() => this.adapt_hints_size().adapt_cards_size(), 1e2)
			}
		})()
		window.addEventListener("resize", adapt_size)
		this.add_after_handler(() => window.removeEventListener("resize", adapt_size))
		adapt_size()

		return this
	},

	get_card_num: function (td) {
		return td ? 1 + this._all_cards.indexOf(td) : 0
	},

	adapt_hints_size: function () {
		return this.adapt_size(this.hints_board, 8)
	},
	adapt_cards_size: function () {
		return this.adapt_size(this.cards_board, 67)
	},

	// le facteur de zoom est ajusté quand une cellule est ajoutée ou supprimée
	adapt_size: function (container, width_vw) {
		const avaliable_width = innerWidth * width_vw / 100
		const element_width = container.offsetWidth
		const width_scale = avaliable_width / element_width
		const avaliable_height = innerHeight
		const element_height = container.offsetHeight
		const height_scale = avaliable_height / element_height
		const scale = Math.min(width_scale, height_scale)
		container.style.setProperty("--scale-factor", scale)
		return this
	},

	// la fonction va appeler callback et lui fournir comme paramètre un élément de "wrapper" ayant été cliqué et portant la classe ".accessible"
	click_on_accessible: function (wrapper, callback) {
		let remover
		const handler = ev => {
			if (ev.target?.classList.contains("accessible")) {
				switch (getComputedStyle(ev.target)?.["animation-name"]) {
					case "none":
					case undefined:
						remover()
						this.remove_after_handler(remover)
						wrapper.classList.remove("expect-click")
						return callback(ev.target)
				}
			}
		}
		//
		remover = () => wrapper.removeEventListener("click", handler)
		this.add_after_handler(remover)
		//
		wrapper.classList.add("expect-click")
		wrapper.addEventListener("click", handler)
		return this
	},

	// ajoute ou retire la classe ".accessible" à toutes les cellules selon que "fn" réponde vrai ou faux
	set_accessible: function (wrapper, fn) {
		wrapper.childNodes.forEach(
			row => row.childNodes.forEach(
				cell => cell.classList[fn(cell) ? "add" : "remove"]("accessible")))
		return this
	},

	// appelle la fonction callback avec comme parmètre un numéro de carte lorsque le joueur a cliqué sur la carte.
	// le joueur ne peut pas cliquer sur des cartes ayant un indice
	get_card_to_reveal: function (callback) {
		this.set_accessible(this.cards_board, td => td.classList.contains("card")) // la classList contient soit "card", soit "hint" soit aucun des deux.
			.click_on_accessible(this.cards_board, td => callback(this.get_card_num(td)))
		return this
	},


	// reçoit un tableau de 16 couleurs, et révèle les 16 couleurs correspondantes à chacunes des cartes
	// retourne une fonction permettant d'arrêter de révéler les cartes
	reveal_all: function (array) {
		const removers = []
		for (let i = 0; i < array.length; ++i) {
			const remover = this.reveal_that(1 + i, array[i])
			removers.push(remover)
		}
		return () => removers.forEach(fn => fn())
	},

	// révèle une carte, et retourne une fonction permettant d'arrêter de la révéler
	reveal_that: function (num, color) {
		if (typeof color === "string" && color.length) {
			color = color.charAt(0).toLowerCase()
			const td = this._all_cards[+num - 1]
			if (td) {
				td.style.setProperty("--secret-url", "var(--" + color + "-url)")
				td.classList.add("flip")
				return () => {
					const remover = () => {
						td.removeEventListener("transitionend", remover)
						td.style.removeProperty("--secret-url")
					}
					td.addEventListener("transitionend", remover)
					td.classList.remove("flip")
				}
			}
		}
		return () => undefined
	},

	// appelle callback dès que le joueur a choisi son déplacement de cartes
	// callback reçoit 3 paramètres :
	// - numéro de la carte d'origine
	// - point cardinal
	// - numéro de la carte cible
	// le joueur veut bouger la carte d'origine à "point cardinal" de la carte cible
	get_a_card_move: function (callback) {
		const can_move = from => {
			if (from?.classList.contains("card"))
				for (const tr of this.cards_board.childNodes)
					for (const to of tr.childNodes)
						if (from !== to && this.is_legal(from, to))
							return true
			return false
		}
		this.set_accessible(this.cards_board, can_move)
			.click_on_accessible(this.cards_board, from => {
				this.set_accessible(this.cards_board, td => from === td || this.is_legal(from, td))
					.click_on_accessible(this.cards_board, to => {
						return from === to || !this.is_legal(from, to) ? this.get_a_card_move(callback)
							: callback(this.get_card_num(from), ...this.identify_position(to))
					})
			})
	},

	// reçoit une cellule quelconque et retourne un tableau permettant de localiser la cellule (ex : "au nord de la carte 13")
	identify_position: function (td) {
		let num = this.get_card_num(td.nextSibling)
		if (num) return ["W", num]
		num = this.get_card_num(td.previousSibling)
		if (num) return ["E", num]
		num = this.get_card_num(td.parentElement.nextSibling?.childNodes[td.cellIndex])
		if (num) return ["N", num] // td (qui n'a pas forcément un numéro) est au nord de la carte numéro "num"
		num = this.get_card_num(td.parentElement.previousSibling?.childNodes[td.cellIndex])
		if (num) return ["S", num]
		console.assert(false)
	},

	// retourne vrai si la cellule td "from" peut être déplacée sur la cellule "to" en toute légalité, faux sinon
	is_legal: function (td_from, td_to) {
		return true
		if (td_from?.cellIndex === undefined || td_to?.cellIndex === undefined)
			return false
		if (td_from.classList.contains("hint") || td_to.classList.contains("hint"))
			return false
		if (!td_from.classList.contains("card") || td_to.classList.contains("card"))
			return false
		if (td_from === td_to)
			return true
		const visited = [td_from], stack = [td_to]
		// exactement le même principe qu'en théorie des langages (presque copier-coller du TP en C++)
		while (stack.length) {
			const curr = stack.pop()
			for (const td of [
				curr?.nextSibling,
				curr?.previousSibling,
				curr.parentElement.previousSibling?.childNodes[curr.cellIndex],
				curr.parentElement.nextSibling?.childNodes[curr.cellIndex]])
				if (td?.classList.contains("card") && visited.indexOf(td) === -1) {
					visited.push(td)
					stack.push(td)
				}
		}
		return visited.length === this._all_cards.length
	},

	// la carte from doit être bougée à "cardinal" de la carte other
	// cardinal est un point cardinal en anglais, seule la première lettre est utilisée
	// la permutation est instantanée, l'animation est en CSS...
	apply_card_move: function (from, cardinal, other) {
		if (typeof cardinal !== "string" || !cardinal.length)
			return console.assert(false);
		cardinal = cardinal.charAt(0).toUpperCase()
		if ("NESW".indexOf(cardinal) === -1)
			return console.assert(false);
		if (!(from = +from) in this._all_cards)
			return console.assert(false);
		if (!(other = +other) in this._all_cards)
			return console.assert(false);
		from = this._all_cards[from - 1]
		other = this._all_cards[other - 1]
		let to
		if (cardinal === "N")
			to = other.parentElement.previousSibling.childNodes[other.cellIndex]
		else if (cardinal === "S")
			to = other.parentElement.nextSibling.childNodes[other.cellIndex]
		else if (cardinal === "E")
			to = other.nextSibling
		else if (cardinal === "W")
			to = other.previousSibling
		else
			return console.assert(false)

		if (from === to)
			return // rien à déplacer

		this.is_legal(from, to) || console.log("Le déplacement de carte(s) exécuté semble illégal.")

		this.swap_cards(from, to); // déplacement pris en compte
		[from, to] = [to, from]

		this.cards_board_padding_process(from, to);


		const apply_anim = (origin, destination) => {
			origin.style.setProperty("--moved-x", (100 * (destination.offsetLeft - origin.offsetLeft) / innerWidth).toFixed(2) + "vw")
			origin.style.setProperty("--moved-y", (100 * (destination.offsetTop - origin.offsetTop) / innerHeight).toFixed(2) + "vh")
			const anim_handler = () => {
				origin.removeEventListener("animationend", anim_handler)
				origin.classList.remove("moved-card")
				origin.style.removeProperty("--moved-x")
				origin.style.removeProperty("--moved-y")
			}
			origin.addEventListener("animationend", anim_handler)
			origin.classList.add("moved-card")
		}

		apply_anim(from, to)
		apply_anim(to, from)

		return this
	},

	// reçoit deux éléments HTML A et B et les permute
	swap_cards: function (a, b) {
		const temp = document.createElement("td");
		a.parentNode.insertBefore(temp, a);
		b.parentNode.insertBefore(a, b);
		temp.parentNode.insertBefore(b, temp);
		temp.parentNode.removeChild(temp);
		return this

	},

	// s'assure qu'il y a toujours strictement une colonne vide à gauche et à droite du board cartes
	// s'assure qu'il y a toujours strictement une ligne vide en haut et en bas du board cartes
	// si la fonction applique brutalement des changements, elle déclenche un redimensionnement du board
	cards_board_padding_process: function (from, to) {
		// minimiser le tableau
		const table = this.cards_board
		let change_1 = true, change_2 = true
		if (from.parentElement === from.parentElement.parentElement.firstChild.nextSibling && !table.querySelector("tr:nth-child(2) > td.card"))
			table.removeChild(table.firstChild) // premier row supprimé
		else if (from.parentElement === from.parentElement.parentElement.lastChild.previousSibling && !table.querySelector("tr:nth-last-child(2) > td.card"))
			table.removeChild(table.lastChild) // dernier row supprimé
		else if (from === from.parentElement.firstChild.nextSibling && !table.querySelector("tr > td:nth-child(2).card"))
			table.childNodes.forEach(row => row.removeChild(row.firstChild)) // première col supprimée
		else if (from === from.parentElement.lastChild.previousSibling && !table.querySelector("tr > td:nth-last-child(2).card"))
			table.childNodes.forEach(row => row.removeChild(row.lastChild)) // dernière col supprimée
		else
			change_1 = false
		// agrandir le tableau
		if (to.parentElement === to.parentElement.parentElement.firstChild && table.firstChild.querySelector(".card"))
			table.prepend(table.lastChild.cloneNode(true)) // premier row ajouté (par copie du dernier row)
		else if (to.parentElement === to.parentElement.parentElement.lastChild && table.lastChild.querySelector(".card"))
			table.append(table.firstChild.cloneNode(true)) // dernier row ajouté (par copie du premier row)
		else if (to === to.parentElement.firstChild && table.querySelector("tr > td:first-child.card"))
			table.childNodes.forEach(row => row.prepend(document.createElement("td"))) // première col ajoutée
		else if (to === to.parentElement.lastChild && table.querySelector("tr > td:last-child.card"))
			table.childNodes.forEach(row => row.append(document.createElement("td"))) // dernière col ajoutée
		else
			change_2 = false
		//
		if (change_1 || change_2)
			this.adapt_cards_size()
		return this
	},

	get_a_hint_move: function (callback) {
		this.set_accessible(this.hints_board, td => !td.parentElement.classList.contains("d-none"))
			.click_on_accessible(this.hints_board, el => {
				const name = el.dataset.name.substr(1)
				if (name === "u")
					callback(name)
				else {
					const cancel = this.cards_board.firstChild.firstChild
					this.set_accessible(this.cards_board, td => td === cancel || td.classList.contains("card") && !td.classList.contains("hint"))
						.click_on_accessible(this.cards_board, td => {
							if (td === cancel)
								return this.get_a_hint_move(callback)
							callback(name, this.get_card_num(td))
						})
				}
			})
	},

	reveal_a_hint: function (name) {
		const el = this.hints_board.querySelector(`tr > td[data-name="h${name}"]`)
		console.log(el)
		if (el && el.parentElement.classList.contains("d-none")) {
			el.parentElement.classList.remove("d-none")
			if (--this.hints_stack_size === 0)
				el.parentElement.parentElement.firstChild.classList.add("d-none")
			this.adapt_hints_size()
		}
	},

	move_a_hint: function (name, num) {
		const hint = this.hints_board.querySelector(`tr > td[data-name="h${name}"]`)
		if (!hint)
			return
		const card = this._all_cards[num - 1]
		if (!card)
			return
		hint.parentElement.classList.add("d-none")
		hint.classList.forEach(n => card.classList.add(n))
		this.adapt_hints_size()
	},

	apply_hint_move: function (...args) {
		console.log(args, args[1] === undefined)
		return args[1] === undefined ? this.reveal_a_hint(...args) : this.move_a_hint(...args)
	},

	fn_13: function () {
	},
	fn_14: function () {
	},
	fn_15: function () {
	},
	fn_16: function () {
	},
	fn_17: function () {
	},

	/* AFTER */
	_after: [],
	add_after_handler: function (fn) {
		return this.generic_add_handler(this._after, fn)
	},
	remove_after_handler: function (fn) {
		return this.generic_remove_handler(this._after, fn)
	},

	generic_add_handler: function (array, fn) {
		const index = array.indexOf(fn)
		if (index === -1)
			array.push(fn)
		return this
	},

	generic_remove_handler: function (array, fn) {
		const index = array.indexOf(fn)
		if (index !== -1)
			array.splice(index, 1)
		return this
	},

	close: function () {
		this._after.forEach(fn => fn())
		this._after = []
		this.hints_container.innerHTML = ""
		this.cards_container.innerHTML = ""
		return this
	}

});
