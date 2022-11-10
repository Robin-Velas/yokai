"use strict"

module.exports = () => ({

	fs : require("fs"),
	filename : "./logs/error.txt",

	init : function(group){
		const time = Date.now();
		this.filename = `${__dirname}/logs/partie-${time}-${group[0].namespace}.txt`
		this.stream = this.fs.createWriteStream(this.filename, {flags: "a+"}); // handled by root
		return this.set_group(group)
	},

	set_group : function(group){
		for(const player of group)
			this.stream?.write(`There is ${player.id} (sex:${player.sex}, ip:${player.sock.handshake.address})\n`)
		this.group = group
		return this
	},

	next_move : function(){
		return this
	},

	write : function(player, ...args){
		const line = `${player.id} <= ${args}`
		this.stream?.write(line + "\n")
		console.log(line)
		return this
	},

	warn : function(player, message){
		const line = `${player.id} <= ${message}`
		this.stream?.write(line + "\n")
		console.log(line)
		player?.sock.emit("game_warn", message)
		return this
	},

	to_all : function(message){
		const line = `${message}`
		this.stream?.write(line + "\n")
		console.log(line)
		this.group.forEach(player => player?.sock.emit("game_log", message))
		return this
	},

	close : function(){
		this.stream?.end()
	},

})
