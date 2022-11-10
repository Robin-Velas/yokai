;"use strict";

(sample => {
    if (typeof exports === "object")
        module.exports = sample; // NODE
    else
        jload(true, sample) // BROWSER
})({

    fn_1 : () => "available in both browser and nodejs" +
        "\n - in browser : jload('sample', sample => sample.fn_1())" +
        "\n - in node : require('../../public/js/sample').fn_1()",

    fn_2 : function() {
        return "available in both browser and nodejs"
    },

});
