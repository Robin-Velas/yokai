"use strict"

module.exports = () => ({

    init: function (group) {

        this.group = group

        // PREPARATION DES INDICES
        this.hints = [ ]
        this.hints.push(...["r", "g", "b", "p"].sort(() => -.5 + Math.random()).slice(this.group.length === 4 ? -3 : -2))
        this.hints.push(...["rg", "rb", "rp", "gb", "gp", "bp"].sort(() => -.5 + Math.random()).slice(this.group.length === 2 ? -3 : -4))
        this.hints.push(...["rgb", "rgp", "rbp", "gbp"].sort(() => -.5 + Math.random()).slice(this.group.length === 2 ? -2 : -3))

        this.shuffle(this.hints)

        this.scores = this.hints.map(hint => ({ name : hint, owner : null, value : 0, }))

        // PREPARATION D'UNE STRUCTURE DE CARTES
        this.cards = "rgbp".repeat(4).split("")
        this.shuffle(this.cards)

        this.base = require("../../public/js/base-board")()
        this.base.init(this.group)

        return this
    },

    get_current_player : function(){
        return this.base.get_current_player()
    },

    shuffle : function(array){
        do array.sort(() => -.5 + Math.random())
        while(Math.random() < Math.SQRT1_2)
    },

    // LES NUMEROS DE CARTES COMMENCENT A 1 POUR LE CLIENT
    reveal_a_card: function (number, but_not) {
        if (number === but_not)
            throw "La carte sélectionnée est déjà révélée."
        const [y, x] = this.get_y_x(number)
        if (!this.base.has_card(y, x))
            throw "Seules les cartes peuvent être retournées."
        if (this.base.has_hint(y, x))
            throw "Les cartes sous un indice ne peuvent plus être retournées ou déplacées."
        return this.cards[this.base.data[y][x][0] - 1]
    },

    get_y_x : function(num){
        for(let y=0; y<this.base.data.length; ++y)
            for(let x=0; x<this.base.data[0].length; ++x)
                if (this.base.data[y][x][0] === num)
                    return [y, x]
        return [0, 0]
    },

    dump_board : function(){
        console.log("----------------")
        this.base.data.forEach(row => console.log(row.map(x => x === 0 ? "  " : (x[0] > 9 ? x[0] : " " + x[0])).join(" ")))

        console.log("----------------")
    },

    // LES NUMEROS DE CARTES COMMENCENT A 1 POUR LE CLIENT
    move_a_card: function (from, dir, to) {
        to = +to
        if (to <= 0 || to > this.cards.length)
            throw "La fonctionnalité n'est pas implémentée"
        from = +from
        if (from <= 0 || from > this.cards.length)
            throw "La fonctionnalité n'est pas implémentée"
        dir = dir?.charAt(0).toLowerCase()
        if ("nsew".indexOf(dir) === -1)
            throw "La fonctionnalité n'est pas implémentée"
        let [to_y, to_x] = this.get_y_x(to)
        if (dir === "n")
            --to_y
        else if(dir === "e")
            ++to_x
        else if(dir === "s")
            ++to_y
        else if(dir === "w")
            --to_x
        const [from_y, from_x] = this.get_y_x(from)
        this.base.move_card(from_y, from_x, to_y, to_x)
    },

    // LES NUMEROS DE CARTES COMMENCENT A 1 POUR LE CLIENT
    game_apply_hint_move: function (name, num) {
        if (name === "u") {
            if (!this.base.can_pick_hint())
                throw "La pile d’indices est désormais vide."
            const reveal = this.hints.pop()
            this.base.add_hint(reveal)
            return [ reveal ]
        }
        const [to_y, to_x] = this.get_y_x(num)
        this.base.move_hint(name, to_y, to_x)
        return [ name, num ]
    },

    reveal_all : function(){
      return this.cards
    },


})
