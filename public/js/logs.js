;"use strict"

jload(true, {

	/**
	 * LOGS
	 */

	init: function (player, sidebar_id) {
		this.wrapper = document.createElement("div")
		this.wrapper.id = "logs"
		//
		document.getElementById(sidebar_id).appendChild(this.wrapper)
		//
		this.ul = document.createElement("ul")
		this.wrapper.appendChild(this.ul)
		this.add("Connexion au serveur Yōkai établie")


		const array_emoji = ["😃", "🤬"]
		let div = document.createElement("div");
		div.id = "emoji"

		document.getElementById("logs").appendChild(div)
		array_emoji.forEach(e => {
			const p = document.createElement("button")
			p.innerText = e
			document.getElementById("emoji").appendChild(p);
		})

		const emoji = document.getElementById("emoji")
		const emoji_handler = ev => {
			let target = ev.target
			console.log(player)
			player.sock.emit("emoji_send", target.innerHTML)
		}
		emoji.addEventListener("click", emoji_handler)
		this.add_after_handler(() => emoji.removeEventListener("click", emoji_handler))
	},

	add : function(message){
		const li = document.createElement("li")
		li.innerHTML = ("" + message).trim()
		li.innerHTML += "\n"
		const span = document.createElement("span")
		span.innerText = (new Date()).toLocaleTimeString() + " "
		li.prepend(span)
		this.ul.appendChild(li)
	},

	clear : function(){
		while(this.ul.firstChild !== this.ul.lastChild)
			this.ul.lastChild.remove()
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
		this.wrapper.remove()
		return this
	}

});
