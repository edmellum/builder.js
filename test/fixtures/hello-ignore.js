require.register("hello/foo.js", function(module, exports, require){
module.exports = 'foo';
});
require.register("hello/bar.js", function(module, exports, require){
module.exports = 'bar';
});
require.alias("component-emitter/index.js", "hello/deps/emitter/index.js");
