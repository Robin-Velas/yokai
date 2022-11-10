;"use strict"

/**
 * Yōkai, un Mini Projet de Web avancé proposé par Robin + Michel en L3-Info
 */

const jload = (() => {
	let wrapped = false
	const names = [],
		values = [],
		delayed = [],
		//
		resolver = (callback, answer) => {
			callback && callback(...answer)
			wrapped = false
			const query = delayed.shift()
			query && loader(query)
		},
		//
		loader = args => {
			wrapped = true
			let completed = 0
			const callback = args.pop(),
				answer = new Array(args.length)
			args.forEach((name, id) => {
				const i = names.indexOf(name)
				if (i === -1) {
					const script = document.createElement("script")
					script.src = "./js/" + name + ".js?v=1"
					script.async = true
					script.addEventListener("load", () => {
						// script.remove()
						answer[id] = values[names.length]
						names.push(name)
						if (++completed === args.length)
							resolver(callback, answer)
					}, {once: true})
					document.head.appendChild(script)
				} else {
					answer[id] = values[i]
					if (++completed === args.length)
						resolver(callback, answer)
				}
			})
		}
	return (...args) =>
		args[0] === true && values.push(args[1])
		|| wrapped && delayed.push(args)
		|| loader(args)
})()

document.addEventListener("DOMContentLoaded", () => jload("yokai", yokai => yokai.init()));
