;"use strict"

jload(true, {

    /**
     * AUTH
     */

    rules_href: "https://www.play-in.com/pdf/rules_games/yokai_regles_fr.pdf",

    show_rules: function () {
        document.getElementById("auth_rules").click()
    },

    success: function (success) {
        this.success_callback = success
        return this
    },

    preload: function (...args) {
        jload(...args, null)
        return this
    },

    init: function () {

        jload("inputs", Inputs => {
            const e_main = document.getElementById("auth")
            const e_game = document.getElementById("game")
            const e_form = document.querySelector("form:first-child")
            const e_id = document.getElementById("auth_id")
            const e_mode = document.getElementById("auth_mode")
            const ajax_span = document.getElementById("auth_ajax")
            const e_type = document.getElementById("auth_type")
            const is_private = () => e_type.querySelector("input[name=auth_type]:checked")?.value === "private"
            const e_choose_namespace = e_type.querySelector("p:last-child")
            const e_namespace = document.getElementById("auth_namespace")
            const e_process = document.getElementById("auth_process")
            //
            const e_close = document.getElementById("auth_close")
            if (e_close) {
                const close_handler = () => Inputs => Inputs.confirm("Voulez-vous quitter la salle ?", ans => ans && this.close())
                e_close.addEventListener("click", close_handler)
                this.after(() => e_close.removeEventListener("click", close_handler))
            }
            //
            document.getElementById("auth_rules").href = this.rules_href
            e_game.classList.add("d-none")
            e_form.reset()
            this.doc_title = document.title
            const ajax_handler = () => {
                ajax_span.innerText = ""
                if (is_private())
                    return
                fetch("/apis/yokai/stats")
                    .then(res => res.json())
                    .then(data => {
                        let max_players = 4, curr = data.waiters[4]
                        if (data.waiters[3] > data.waiters[max_players])
                            curr = data.waiters[max_players = 3]
                        if (data.waiters[2] > data.waiters[max_players])
                            curr = data.waiters[max_players = 2]
                        if (curr) {
                            const remaining = max_players - curr
                            if (remaining === 1)
                                ajax_span.innerText = "Une partie à " + max_players + " est sur le point de commencer…"
                            else
                                ajax_span.innerHTML = "Plus que <b>" + remaining + "</b> joueurs pour commencer une partie à " + max_players + "…"
                        }
                    })
            }

            const ajax = setInterval(ajax_handler, 6e4)
            ajax_handler()

            e_type.addEventListener("change", () => {
                if (is_private()) {
                    ajax_span.innerText = ""
                    e_choose_namespace.style.display = "block"
                    e_namespace.focus()
                } else {
                    e_choose_namespace.style.display = "none"
                    ajax_handler()
                }
            })

            e_process.addEventListener("click", (e) => {
                e.preventDefault()
                const uri_id = encodeURIComponent(e_id.value)
                const uri_sex = document.querySelector("input[name=auth_sex]:checked")?.value === "M" ? "M" : "F"
                const uri_mode = encodeURIComponent(e_mode.value)
                const uri_base = "?service=Yōkai&id=" + uri_id + "&sex=" + uri_sex + "&mode=" + uri_mode
                const uri_handshake = is_private() ? uri_base + "&namespace=" + encodeURIComponent(e_namespace.value) : uri_base
                const sock = io(uri_handshake, {autoConnect: false, withCredentials: false})

                window.addEventListener("beforeunload", () => sock.disconnect(true))

                // if the server restart then the players will themselves reform the groups from the reconnection uri
                sock.once("auth_namespace", unique_namespace => sock.io.uri = uri_base + "&namespace=" + unique_namespace)

                sock.once("auth_failed", errors => {
                    sock.off("auth_success")
                    sock.disconnect()
                    errors = errors.join("\n")
                    Inputs.alert(errors)
                })

                sock.once("auth_success", player => {
                    clearInterval(ajax)
                    sock.off("auth_failed")
                    sock.on("auth_global_message", message => Inputs.alert("Le serveur indique : " + message))
                    this.player = player
                    this.player.sock = sock
                    e_game.classList.remove("d-none")
                    e_main.classList.add("d-none")
                    document.title = player.id + " — Yōkai à " + player.mode + " joueurs"
                    this.success_callback(this.player)
                })
                sock.connect()
            })
        })
        return this
    },

    close: function () {
        this.player.sock.disconnect()
        // honor the "after" callbacks
        this._after.forEach(fn => fn())
        document.title = this.doc_title
        const e_main = document.getElementById("auth")
        const e_game = document.getElementById("game")
        e_main.classList.remove("d-none")
        e_game.classList.add("d-none")
    },

    after: function (fn) {
        this._after.push(fn)
        return this
    },

    _after: [],

})