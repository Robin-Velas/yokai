"use strict"

module.exports = group => ({

    period: 30,
    order_timeout: 10,
    css_anim_duration: 1.5,

    logs: require("./logs")(), // récupère une instance de logs
    board: require("./board")(), // récupère une instance de board

    is_complete: false,
    group: group,

    init: function () {

        this.logs.init(this.group)
        this.board.init(this.group)

        this.group.forEach(p => p.sock.on("emoji_send", (message) => this.emoji(p,message)))
        this.group.forEach(p => p?.sock.once("disconnect", () => this.end("Partie terminée car " + p.id + " s'est " + (p.sex === "F" ? "déconnectée" : "déconnecté") + ".")))

        // Les joueurs sont triés : d'abord ceux qui veulent commencer (mélangés) puis ceux qui ne veulent pas commencer (mélangés)
        const order_the_group_then_begin = () => {
            if (this.is_complete) return
            this.group.sort((a, b) => !b.want_begin === !a.want_begin ? -.5 + Math.random() : !a.want_begin - !b.want_begin)
            this.logs.set_group(this.group)
            const compo = this.group.map(p => p.getProfile())

            this.group.forEach((p, pos) => {
                p?.sock.emit("game_thats_your_group", compo, p.pos = pos)
                p?.sock.on("game_its_ok", () => p.playing && this.end_by_player(p))
            })



            setTimeout(() => this.next(), 3e2)
        }

        const timeout = setTimeout(order_the_group_then_begin, this.order_timeout * 1e3)

        setTimeout(() => {
            this.group.forEach(p => {
                p?.sock.once("game_answer_want_you_to_begin", ans => {
                    p.want_begin = ans
                    if (this.group.every(p => p.want_begin !== undefined)) {
                        clearTimeout(timeout)
                        order_the_group_then_begin()
                    }
                    if (ans)
                        this.logs.to_all(`${p.id} a peur des fantômes.`)
                })
                p?.sock.emit("game_question_want_you_to_begin", this.period, this.order_timeout)
            })
        }, 3e2)
        return this
    },

    next: function () {
        const player = this.getPlayer()
        if (this.is_complete || player.sock.disconnected) return
        player.playing = true
        this.destroy_limiter = this.timeout(player);
        this.logs.write(player, `commence son tour`)
        this.reveal_a_card(player, null, (number_1, color_1) =>
            this.reveal_a_card(player, number_1, (number_2, color_2) =>
                setTimeout(() => {
                    this.group.forEach(p => p?.sock.emit("game_stop_reveal"))
                    setTimeout(() =>
                            this.move_a_card(player, (...args) =>
                                setTimeout(() =>
                                    this.exec_hint_move(player, (...args) => {
                                        player.playing = false
                                        if (this.destroy_limiter) {
                                            this.destroy_limiter()
                                            this.destroy_limiter = false
                                            this.logs.write(player, `a terminé son tour`)
                                        }
                                        if (this.group.every(p => p.sock.connected))
                                            setTimeout(() => this.next(), // a joué son tour
                                                1e3 * this.css_anim_duration, {once: true}) // a joué avec un indice
                                    }), 1e3 * this.css_anim_duration, {once: true})) // a bougé une carte
                        , 1e3 * this.css_anim_duration, {once: true}) // ne révèle plus les cartes
                }, 1e3 * this.css_anim_duration, {once: true}) // a révélé 2 cartes
            ))
        this.group.forEach(p => p?.sock.emit("game_next_move", player.pos))
    },

    move_a_card: function (player, callback) {
        player?.sock.once("game_answer_card_to_play", (...args) => {
            if (this.is_complete) return
            try {
                this.board.move_a_card(...args)
                this.group.forEach(p => p?.sock.emit("game_apply_card_move", ...args))
                this.logs.write(player, ...args)
                callback(...args)
            } catch (err) {
                this.logs.warn(player, err)
                if (player.sock.connected)
                    return this.move_a_card(player, callback)
            }
        })
        player?.sock.emit("game_question_card_to_play")
        return this
    },

    exec_hint_move: function (player, callback) {
        player?.sock.once("game_answer_hint_to_play", (...args) => {
            if (this.is_complete) return
            try {
                const ans = this.board.game_apply_hint_move(...args)
                this.group.forEach(p => p?.sock.emit("game_apply_hint_move", ...ans))
                this.logs.write(player, ...args)
                callback(...args)
            } catch (err) {
                this.logs.warn(player, err)
                if (player.sock.connected)
                    return this.exec_hint_move(player, callback)
            }
        })
        player?.sock.emit("game_question_hint_to_play")
        return this
    },

    reveal_a_card: function (player, but_not, callback) {
        player?.sock.once("game_answer_card_to_reveal", number => {
            if (this.is_complete) return
            try {
                const color = this.board.reveal_a_card(number, but_not)
                this.group.forEach(p => p?.sock.emit("game_apply_reveal", number, p === player ? color : "unknown"))
                this.logs.write(player, number, color)
                callback(number, color)
            } catch (err) {
                this.logs.warn(player, err)
                if (player.sock.connected)
                    return this.reveal_a_card(player, but_not, callback)
            }
        })
        player?.sock.emit("game_question_card_to_reveal")
        return this
    },

    end_by_player: function (player) {
        const cards = this.board.reveal_all()
        this.group.forEach(p => p.sock.emit("game_reveal_all", cards))
        // this.end("Test")
    },

    getPlayer: function () {
        for (const player of this.group)
            if (player?.sock.disconnected)
                throw "Partie terminée car " + player.id + " s'est " + (player.sex === "F" ? "déconnectée" : "déconnecté")
        return this.board.get_current_player()
    },

    timeout: function (player) {
        if (this.is_complete) return

        const period_ms = 1e3 * this.period

        // les calculs concernant le temps écoulé depuis le début du coup
        const date_of_call = Date.now()
        const calc_elapsed = () => require("./utils").format_sec(Math.floor((Date.now() - date_of_call) / 1e3), 1)

        // la préparation du message de fin de partie si le joueur ne joue pas à temps ou si quelqu'un refuse d'attendre l'absent
        const game_ends = () => this.end("La partie est terminée car " +
            player.id + " n’a pas joué depuis " + calc_elapsed() +
            ". Selon les règles, le serveur attend chaque joueur jusqu’à " + this.period + " secondes.")

        // un émetteur pour tous les joueurs sauf celui qui est absent
        const waiters_emitter = (...args) => this.group.forEach(p => p === player || p?.sock.emit(...args))

        // les identifieurs des deux timeouts
        // - celui qui est déclenché si le joueur ne joue pas à temps
        // - celui qui est déclenché si au moins un joueur répond à la question et qu'un autre ne répond pas à temps à la question
        let outer_limiter, inner_limiter

        // le limiteur, une fonction fléchée (si le joueur (absent ou pas) joue, tout ce qui suit est immédiatement neutralisé)
        const limiter = () => {
            const elapsed = calc_elapsed()
            // le total des joueurs qui ne sont pas encore d'accord pour attendre l'absent
            let waiters = this.group.length - 1
            this.group.forEach(p => {
                // on annonce au joueur absent qu'il devrait jouer
                if (p === player)
                    return p?.sock.emit("game_wait_you", "Cela fait " + elapsed + " que le temps est écoulé, merci de jouer.")
                // on attend une réponse de tous les autres joueurs
                p?.sock.once("game_wait_answer", ans => {
                    if (ans) {
                        --waiters
                        clearTimeout(inner_limiter)
                        // si tout le monde est d'accord pour attendre l'absent on relance un sablier pour le joueur absent
                        if (waiters === 0) {
                            waiters_emitter("game_wait_again", elapsed)
                            outer_limiter = setTimeout(limiter, period_ms)
                        } else
                            // si au moins un joueur à répondu, alors les autres ont un timeout pour répondre,
                            // sinon la partie prend fin
                            inner_limiter = setTimeout(() => game_ends, period_ms)
                    } else
                        // si un joueur n'est pas d'accord pour attendre alors la partie prend fin
                        game_ends()
                })
            })
            // on pose la question à tous les joueurs sauf l'absent, voulez-vous l'attendre ?
            waiters_emitter("game_wait_question", player.id)
        }
        // on lance le limiteur avec un timeout égal au temps dont il dispose pour jouer
        outer_limiter = setTimeout(limiter, period_ms)
        // on fournit à l'appelant une fonction (fléchée) pour neutraliser le limiteur (par exemple si le joueur joue à temps)
        return () => {
            this.group.forEach(p => p?.sock.removeAllListeners("game_wait_answer"))
            clearTimeout(outer_limiter)
            clearTimeout(inner_limiter)
        }

    },

    end: function (reason) {
        if (this.is_complete)
            return
        this.is_complete = true
        if (this.destroy_limiter) {
            this.destroy_limiter()
            this.destroy_limiter = false
        }

        this.logs.close()

        // tell the whole group that the game is over
        this.group.forEach(player => player?.sock.emit("game_end", reason))
        // honor the "after" callbacks
        this._after.forEach(fn => fn())
        return this
    },

    after: function (fn) {
        this._after.push(fn)
        return this
    },

    _after: [],

    emoji : function (player, message) {
        if (!["😃", "🤬"].includes(message)) {
            this.logs.warn(player, "error emoji")
        }
        else {
            this.logs.to_all(`${player.id} : ${message}.`)
        }
    }
})
