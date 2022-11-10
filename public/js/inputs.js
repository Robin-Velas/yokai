;"use strict"

jload(true, {

	/**
	 * INPUTS
	 */

	// a question and a callback expecting one argument (the boolean answer of the question)
	confirm: function (question, callback) {

		this.clear()

		const overlay = document.createElement("div")
		overlay.id = "simple-overlay"
		const box = document.createElement("div")
		box.id = "simple-dialog"
		const q = document.createElement("p")
		q.innerHTML = question
		const a_no = document.createElement("button")
		a_no.innerText = "Non"
		const a_yes = document.createElement("button")
		a_yes.innerText = "Oui"
		box.appendChild(q)
		box.appendChild(a_no)
		box.appendChild(a_yes)

		let no_callback, yes_callback

		const keyboard_enter = (e) => e.key === "Enter" && e.preventDefault() || a_yes.click()
		document.addEventListener("keypress", keyboard_enter)

		this._clear = () => {
			document.removeEventListener("keypress", keyboard_enter)
			a_no.removeEventListener("click", no_callback)
			a_yes.removeEventListener("click", yes_callback)
			overlay.remove()
			box.remove()
		}

		no_callback = () => {
			this.clear()
			callback && callback(false)
		}

		yes_callback = () => {
			this.clear()
			callback && callback(true)
		}

		a_no.addEventListener("click", no_callback)
		a_yes.addEventListener("click", yes_callback)

		document.body.appendChild(overlay)
		document.body.appendChild(box)

		this.she_say(question)


	},

	big_alert: function (message, timeout = 60) {
		const div = document.getElementById("big-alert")
		div.innerHTML = "<p class='inc'>" + message + "</p>"
		setTimeout(() => div.innerHTML = "", timeout * 1e3)
		this.she_say(message)
	},

	// fait le même travail que la fenêtre alert standard de JS, mais ne bloque pas l'exécution du script pendant ce temps
	alert: function (message) {

		this.clear()

		const overlay = document.createElement("div")
		overlay.id = "simple-overlay"
		const box = document.createElement("div")
		box.id = "simple-dialog"
		const m = document.createElement("p")
		m.innerHTML = message
		const agree = document.createElement("button")
		agree.innerText = "D’accord"
		box.appendChild(m)
		box.appendChild(agree)

		const keyboard_enter = (e) => e.key === "Enter" && e.preventDefault() || agree.click()
		document.addEventListener("keypress", keyboard_enter)

		this._clear = () => {
			document.removeEventListener("keypress", keyboard_enter)
			agree.removeEventListener("click", this._clear)
			overlay.remove()
			box.remove()
		}

		agree.addEventListener("click", () => this.clear())

		document.body.appendChild(overlay)
		document.body.appendChild(box)

		this.she_say(message)

	},

	vocal_synthesis: function (active) {
		this.vocal_active = active
		if (active)
			this.she_say("OK", {lang: "en-US"})
		else
			window.speechSynthesis.cancel()
	},

	she_say: function (msg, params = {lang: "fr"}, last = false) {
		if (this.vocal_active && "speechSynthesis" in window) {
			if (last)
				window.speechSynthesis.cancel()
			if (msg && params.lang) {
				msg = msg.replaceAll(/Y[ōo]kai/gi, "[yo-kaï]")
				const instance = new SpeechSynthesisUtterance(msg)
				instance.pitch = 1.3
				instance.volume = 0.7
				instance.rate = 1.25
				for (const opt in params)
					instance[opt] = params[opt]
				window.speechSynthesis.speak(instance)
			}
		}
	},

	clear: function () {
		if ("speechSynthesis" in window)
			window.speechSynthesis.cancel()
		this._clear && this._clear()
	},

});
