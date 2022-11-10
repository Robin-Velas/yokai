;"use strict"

jload(true, {

    /**
     * GAME
     */

    init: function (player) {

        this.player = player
        this.sock = player.sock

        jload("auth", "inputs", "board", "players", "chrono", "controls", "logs",
            (Auth, Inputs, Board, Players, Chrono, Controls, Logs) => {

                this.Auth = Auth
                this.Inputs = Inputs
                this.Board = Board
                this.Players = Players
                this.Chrono = Chrono
                this.Controls = Controls
                this.Logs = Logs

                Board.init(player, "hints", "cards")
                Controls.init(player, "sidebar")
                Players.init(player, "sidebar")
                Chrono.init(player, "sidebar")
                Logs.init(player, "sidebar")

                Auth.after(() => confirm("Voulez-vous la feuille de partie ?") && Controls.download())
                    .after(() => Board.close())
                    .after(() => Controls.close())
                    .after(() => Players.close())
                    .after(() => Chrono.close())
                    .after(() => Logs.close())

                // FIN DE PARTIE
                this.sock.once("game_end", reason => {
                    this.Logs.add(`${reason}`)
                    Inputs.alert(`${reason}`)
                    Auth.close()
                })

                // DEMANDER AUX JOUEURS SI ILS VEULENT COMMENCER
                this.sock.once("game_question_want_you_to_begin", (per_move_timeout, question_timeout) => {
                    this.Logs.add(`Chaque joueur dispose de ${per_move_timeout} secondes pour jouer.`)
                    this.per_move_timeout = per_move_timeout
                    this.question_timeout = question_timeout
                    Inputs.confirm("La partie va commencer, avez-vous peur des fantômes ?", ans => this.sock.emit("game_answer_want_you_to_begin", ans) , question_timeout)
                })

                // PRENDRE CONNAISSANCE DE L'ORDRE DANS LEQUEL LES JOUEURS VONT JOUER, ET DE MA POSITION DANS LE GROUPE
                this.sock.once("game_thats_your_group", (group, my_pos) => {
                    Players.apply_compo(group, my_pos)
                    this.Logs.add(`La composition du groupe est validée.`)
                    this.group = group
                    this.my_pos = my_pos
                })

                this.return_all = [ ]

                // CHANGEMENT DE JOUEUR
                this.sock.on("game_next_move", curr_pos => {
                    this.Inputs.clear()
                    this.Logs.add(`C'est au tour de ${this.group[curr_pos].id}.`)
                    this.Players.set_current(curr_pos)
                    this.player.playing = this.my_pos === curr_pos
                    this.Controls.blink_title(  this.player.playing)
                })

                // WARNING
                this.sock.on("game_warning", message => this.Inputs.big_alert(`${message}`, 5))

                // SAISIR UNE CARTE A REVELER
                this.sock.on("game_question_card_to_reveal", () => this.Board.get_card_to_reveal((...args) => this.sock.emit("game_answer_card_to_reveal", ...args)))

                // SAISIR UN DEPLACEMENT
                this.sock.on("game_question_card_to_play", () => this.Board.get_a_card_move((...args) => this.sock.emit("game_answer_card_to_play", ...args)))

                // SAISIR UN COUP D'INDICE
                this.sock.on("game_question_hint_to_play", () => this.Board.get_a_hint_move((...args) => this.sock.emit("game_answer_hint_to_play", ...args)))

                // APPLIQUER UNE REVELATION
                this.sock.on("game_apply_reveal", (...args) => {
                    const destructor = this.Board.reveal_that(...args)
                    this.return_all.push(destructor)
                })

                // NE PLUS APPLIQUER UNE REVELATION
                this.sock.on("game_stop_reveal", () => {
                    while(this.return_all.length)
                        this.return_all.pop()()
                })

                // TOUT REVELER
                this.sock.on("game_reveal_all", (...args) => this.Board.reveal_all(...args))

                // APPLIQUER UN DEPLACEMENT DE CARTE
                this.sock.on("game_apply_card_move", (...args) => this.Board.apply_card_move(...args))

                // APPLIQUER UN DEPLACEMENT D'INDICE
                this.sock.on("game_apply_hint_move", (...args) => this.Board.apply_hint_move(...args))

                // AJOUTER UNE LIGNE DE LOGS
                this.sock.on("game_log", (...args) => this.Logs.add(...args))

                // LE RETARDATAIRE EST AVERTI
                this.sock.on("game_wait_you", message =>  Inputs.alert(`${message}`, 1e3 * (this.per_move_timeout - 3)))

                // LES AUTRES JOUEURS DECIDENT SI LE RETARDATAIRE ABANDONNE
                this.sock.on("game_wait_question", p_id =>
                    Inputs.confirm(p_id + " n’a pas joué, le serveur doit-il l’attendre pendant " + this.per_move_timeout + " secondes ?",
                        response => this.sock.emit("game_wait_answer", response)))

                // LES AUTRES JOUEURS ACCEPTENT D’ATTENDRE LE RETARDATAIRE
                this.sock.on("game_wait_again", seconds =>  this.group.length > 2 && Inputs.alert("Le groupe est d’accord pour attendre.", 1e3 * (this.per_move_timeout - 3)))

            })
    },

});
