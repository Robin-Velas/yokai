"use strict"

// Auth (dépendance avec "crypto" et avec "game")

module.exports = {

	groups: { }, // en clé un espace de noms, en valeur un tableau de joueurs

	players: { }, // en clé un user-id, en valeur un joueur (requis car les user-id doivent rester uniques)

	stats: {
		waiters: {2: 0, 3: 0, 4: 0,}, // le total des joueurs qui recherchent un groupe
		in_progress: {2: 0, 3: 0, 4: 0,}, // le total des parties en cours
		completed: {2: 0, 3: 0, 4: 0,}, // le total des parties terminées
		auth_count : 0, // débug
	},

	welcome: function (sock) {

		const errors = []
		const id = sock.handshake.query.id
		const hash = this.validate_id(id, errors)
		const sex = this.validate_sex(sock.handshake.query.sex, errors)
		const mode = this.validate_mode(sock.handshake.query.mode, errors)
		const in_private = typeof sock.handshake.query.namespace === "string"
		const namespace = this.validate_namespace((in_private ? sock.handshake.query.namespace : "public") + mode, errors)
		if (errors.length) {
			sock.emit("auth_failed", errors)
			return sock.disconnect();
		}


		// à partir de maintenant on est sûrs que le client a correctement rempli son formulaire d'inscription
		const player = this.players[hash] = {
			sock: sock,
			namespace: namespace,
			date: Date.now(),
			in_private: in_private,
			in_public: !in_private,
			// les propriétés ci-dessous sont communes entre client et serveur
			id: id,
			sex: sex,
			mode: mode,
			getProfile: function () {
				return {
					id: this.id,
					sex: this.sex,
					mode: this.mode,
				}
			},
		}

		sock.emit("auth_success", player.getProfile())

		// On tient à jour nos statistiques (nombre de joueurs ayant réussi une authentification)
		++this.stats.auth_count

		// si le joueur se déconnecte on libère son identifiant, et on le supprime si nécessaire du groupe dans lequel il attendait
		sock.once("disconnect", () => {
			delete this.players[hash]
			if (this.groups.hasOwnProperty(player.namespace)) {
				this.groups[player.namespace] = this.groups[player.namespace].filter(p => p !== player && p?.sock.connected)
				if (this.groups[player.namespace].length === 0)
					delete this.groups[player.namespace]
			}
			this.stats_update(player)
		})

		// on tente d'insérer le joueur dans un groupe d'attente existant, si un tel groupe existe
		if (this.groups.hasOwnProperty(player.namespace)) {
			if (this.groups[player.namespace].some(mate => mate?.sock.disconnected))
				this.groups[player.namespace] = this.groups[player.namespace].filter(mate => mate?.sock.connected)
			this.groups[player.namespace].push(player)
			// on vérifie si le groupe est au complet pour démarrer une partie
			if (this.groups[player.namespace].length === player.mode) {
				++this.stats.in_progress[player.mode]
				this.stats_update(player)
				const group = this.groups[player.namespace]
				delete this.groups[player.namespace]
				// la partie va démarrer, on fournit un espace de nom aléatoire aux joueurs afin qu'ils puissent se retrouver si le serveur redémarre
				const game_namespace = this.randomId()
				group.forEach(p => p?.sock.emit("auth_namespace", p.namespace = game_namespace))
				// installation de threads à partir d'ici prévue dès qu'on tourne à 20 parties simultanées de moyenne
				return require("./game")(group)
					.after(() => ++this.stats.completed[player.mode] ^ --this.stats.in_progress[player.mode])
					.init()
			}
		} else
			// le joueur est tout seul dans son groupe d'attente, on crée le groupe
			this.groups[player.namespace] = [player]

		this.stats_update(player)
	},

	// met à jour les statistiques du service, et informe le groupe du joueur de la composition du groupe (qui sont les joueurs dans le groupe d'attente)
	stats_update: function (player) {
		const ns = player.namespace
		if (this.groups.hasOwnProperty(ns)) {
			if (player.in_public)
				this.stats.waiters[player.mode] = this.groups[ns].length % player.mode
			const group = this.groups[ns]
			const compo = group.map(p => p.getProfile())
			setTimeout(() => group.forEach((p, nth_child) => p?.sock.emit("group_compo", compo, nth_child)), 300)
		} else if (player.in_public)
			this.stats.waiters[player.mode] = 0
	},

	// retourne une empreinte de l'user-id en cas de succès, et remplit le tableau d'erreurs en cas de problème
	validate_id: function (id, errors) {
		if (typeof id !== "string")
			return errors.push("L’identifiant du joueur doit être renseigné")
		id = id.trim()
		if (id.length < 1)
			return errors.push("L’identifiant du joueur ne doit pas rester vide")
		if (id.length > 30)
			return errors.push("L’identifiant du joueur dépasse les 30 caractères autorisés")
		if (id.match(/[<>]/))
			return errors.push("L’identifiant du joueur ne doit pas contenir du code HTML")
		if (id.match(/^[^a-z]/i))
			return errors.push("L’identifiant du joueur doit commencer par une lettre")
		const hash = this.hash(id)
		if (this.players.hasOwnProperty(hash))
			return errors.push("L’identifiant demandé pour le joueur est déjà en cours d’utilisation")
		return hash
	},

	// retourne le sexe "F" ou "M" du joueur cas de succès, et remplit le tableau d'erreurs en cas de problème
	validate_sex: function (sex, errors) {
		if (typeof sex !== "string")
			return errors.push("Le sexe du joueur doit être renseigné")
		sex = sex.toUpperCase()
		if (sex !== "F" && sex !== "M")
			return errors.push("Le sexe du joueur doit être correctement renseigné")
		return sex
	},

	// retourne le mode 2, 3 ou 4 du joueur cas de succès, et remplit le tableau d'erreurs en cas de problème
	// le mode correspond au nombre maximum de joueurs prévus dans le groupe (partie à 2, partie à 3, partie à 4)
	validate_mode: function (mode, errors) {
		if (typeof mode !== "string")
			return errors.push("Le nombre de joueurs dans la partie doit être choisi parmi 2, 3 et 4")
		mode = parseInt(mode, 10)
		if (mode < 2)
			return errors.push("Le nombre de joueurs dans la partie doit être supérieur à 1")
		if (mode > 4)
			return errors.push("Le nombre de joueurs dans la partie doit être inférieur à 5")
		return mode
	},

	// retourne une empreinte de l'espace de nom en cas de succès, et remplit le tableau d'erreurs en cas de problème
	// l'espace de nom est comme "le dossier dans lequel les joueurs attendent d'avoir un groupe complet"
	validate_namespace: function (namespace, errors) {
		if (typeof namespace !== "string")
			return errors.push("Le nom de la partie privée doit être renseigné")
		namespace = namespace.trim()
		if (namespace.length < 2)
			return errors.push("Le nom de la partie privée ne doit pas rester vide")
		if (namespace.length > 15)
			return errors.push("Le nom de la partie privée dépasse les 30 caractères autorisés")
		if (namespace.match(/[<>]/))
			return errors.push("Le nom de la partie privée ne doit pas contenir du code HTML")
		return this.hash(namespace)
	},

	// fournit une empreinte sous forme de chaîne de caractères de l'élément fournit
	// l'empreinte est utilisée pour garantir l'unicité dans les user-id et les espaces de noms
	hash: function (element) {
		if (typeof element !== "string")
			element = JSON.stringify(element)
		element = element
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, " ")
			.trim()
		return "$" + require("crypto")
			.createHash("sha1")
			.update(element)
			.digest('hex')
			.substring(20)
	},

	// fournit un espace de nom aléatoire pour les joueurs qui démarrent une nouvelle partie
	randomId: () =>  "_" + Math.random().toString(16).slice(2),

}
