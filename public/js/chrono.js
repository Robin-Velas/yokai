;"use strict"

jload(true, {

    /**
     * CHRONO
     */

    init: function (player, sidebar_id) {
        this.wrapper = document.createElement("div")
        this.wrapper.id = "chrono"
        //
        document.getElementById(sidebar_id).appendChild(this.wrapper)
        //
    },

    get_chrono: function (seconds) {
        const span = document.createElement("span")
        if (seconds < 1)
            span.innerHTML = this.format(0)
        else {
            span.innerHTML = this.format(seconds)
            const handler = () => {
                const s = + span.innerHTML.substring(3)
                const m = + span.innerHTML.substring(0,2)
                span.innerHTML = this.format(m > 0 ? m * 60 + s - 1 : s - 1)
                if (s === 0 && m === 0)
                    clearInterval(interval)
            }
            const interval = setInterval(handler, 1e3);
        }
        return span
    },

    play: function (seconds) {
        this.wrapper.innerHTML = ""
        this.wrapper.appendChild(this.get_chrono(seconds))
    },

    format: function (s) {
        if (s < 10)
            return "00:0" + s
        if (s < 60)
            return "00:" + s
        const m = Math.floor(s / 60)
        s -= m * 60
        return (m < 10 ? "0" + m : "" + m) + ":" + (s < 10 ? "0" + s : "" + s)
    },


    end: function () {

    },


    close: function () {

    },


});
