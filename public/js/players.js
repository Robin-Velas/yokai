;"use strict"

jload(true, {

	/**
	 * PLAYERS
	 */

	init: function (player, sidebar_id) {
		this.wrapper = document.createElement("div")
		this.wrapper.id = "players"
		//
		document.getElementById(sidebar_id).appendChild(this.wrapper)
		//
		this.ul = document.createElement("ul")
		this.wrapper.appendChild(this.ul)
		player.sock.on("group_compo", (...args) => this.apply_compo(...args))
	},

	apply_compo: function (group, my_pos) {
		this.ul.innerHTML = ""
		group.forEach((p, pos) => {
			const li = document.createElement("li")
			if (pos === my_pos)
				li.classList.add("me")
			li.innerText += p.id
			li.innerHTML += "\n"
			const icon = document.createElement("i")
			icon.classList.add("player-icon")
			if (p.sex === "F")
			{
				li.classList.add("jane")
				icon.classList.add("player-icon-F")
			}
			else
			{
				li.classList.add("jon")
				icon.classList.add("player-icon-M")
			}
			li.prepend(icon)
			this.ul.appendChild(li)
		})
	},

	set_current: function(pos){
		this.ul.querySelector(".current")?.classList.remove("current")
		this.ul.childNodes?.[pos].classList.add("current")
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
