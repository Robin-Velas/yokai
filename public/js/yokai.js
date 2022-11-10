;"use strict"

jload(true, {
	/**
	 * YOKAI
	 */
	init : () =>
		jload("auth", auth =>
			auth.init()
				.preload("board", "controls", "game", "inputs", "logs", "players", "chrono")
				.success(player => jload("game", game => game.init(player))))
	,
});
