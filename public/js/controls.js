;"use strict"

jload(true, {

	/**
	 * CONTROLS
	 */

	init: function (player, sidebar_id) {

		jload("auth", "inputs", "players", "logs", (Auth, Inputs, Players, Logs) => {

			this.wrapper = document.createElement("div")
			this.wrapper.id = "controls"
			//
			document.getElementById(sidebar_id).appendChild(this.wrapper)
			//
			//ajout d'un div dans le id controls pour la gestion des boutons
			this.div = document.createElement("div")
			this.wrapper.appendChild(this.div)

			this.ul = document.createElement("ul")
			this.wrapper.appendChild(this.ul)
			// BTN_1
			const app = "les Yōkai sont appaisés"
			this.append_button("Déclarer que " + app, () => {
				if (player.playing) {
					Inputs.confirm("Voulez-vous déclarer que " + app + " ?", ans => {
						if (ans) {
							player.sock.emit("les_yokai_sont_appaises")
						}
					})
				} else {
					Inputs.alert("Vous pouvez déclarer que " + app + " seulement quand c'est à vous de jouer.")
				}
			})
			// BTN_2
			this.append_button("Règles du jeu", btn => Auth.show_rules())
			// BTN_3
			this.download_handler = btn => {
				const a = document.createElement("a");
				const date = new Date().toLocaleString()
				const filename = "partie-de-yokai-" + date.replaceAll(/[^0-9]+/g, "-") + ".txt"
				const eol = "\n" + "-".repeat(50) + "\n"
				a.innerHTML = "Partie de Yōkai en ligne du " + date + eol
					//+ Players.wrapper.innerHTML + eol
					+ Logs.wrapper.innerHTML + eol
					+ document.location + " by NodeJS + Express"
				const file = a.innerText.split("\n").map(s => s.trim()).filter(s => s.length).join("\n")
				a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(file))
				a.setAttribute("download", filename)
				a.style.display = "none"
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
			}
			this.append_button("Feuille de partie", this.download_handler)
			// BTN_4
			this.append_button("Synthèse vocale ON", btn => {
				const was_active = btn.dataset.active === "1"
				Inputs.vocal_synthesis(!was_active)
				btn.dataset.active = was_active ? "0" : "1"
				btn.innerHTML = "Synthèse vocale " + (was_active ? "ON" : "OFF")
			})
			// BTN_5
			this.append_button("Quitter", () => Inputs.confirm("Voulez-vous quitter ?", ans => ans && Auth.close()))
			// BTN_6
			this.append_button("Dark mode", btn => {
				const was_active = btn.dataset.active === "1"
				btn.dataset.active = was_active ? "0" : "1"
				document.getElementById("game").className = was_active ? "dark" : ""
				btn.innerHTML = "Dark Mode " + (was_active ? "ON" : "OFF")
			})
			this.doc_title = document.title

		})

	},

	append_button: function (title, callback) {
		const btn = document.createElement("button")
		btn.className = "button_class"
		const handler = () => callback(btn)
		btn.innerHTML = title
		btn.addEventListener("click", handler)
		const remover = () => btn.removeEventListener("click", handler)
		this.add_after_handler(remover)
		this.div.appendChild(btn)
		return this
	},

	download : function(){
		this.download_handler()
	},

	blink_title : function(active){
		clearInterval(this.blink_interval)
		if (active) {
			const handler = () => {
				const char = document.title.charAt(0) === "\u26AA" ? "\u26AB" : "\u26AA"
				document.title = char + " " + this.doc_title
			}
			this.blink_interval = setInterval(handler, 8e2);
			handler()
		}
		else
			document.title = this.doc_title
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
		this.blink_title(false)
		this._after.forEach(fn => fn())
		this._after = []
		this.wrapper.remove()
		return this
	}

});
