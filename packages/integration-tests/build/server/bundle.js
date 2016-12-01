module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(7);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var xstream_1 = __webpack_require__(9);
	var React = __webpack_require__(3);
	var reboot_core_1 = __webpack_require__(4);
	var root_1 = __webpack_require__(2);
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = function () { return root_1.default()
	    .subroute('/counter')
	    .use(reboot_core_1.renderTitle(function () { return 'Counter'; }))
	    .use(reboot_core_1.render(function () {
	    return xstream_1.Stream.periodic(1000).startWith(0).map(function (t) { return React.createElement("span", null, t); });
	})); };
	//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY291bnRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvdW50ZXIudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQ0FBZ0M7QUFDaEMsNkJBQThCO0FBQzlCLDJDQUFpRDtBQUVqRCwrQkFBeUI7O0FBRXpCLGtCQUFlLGNBQU0sT0FBQSxjQUFJLEVBQUU7S0FDeEIsUUFBUSxDQUFDLFVBQVUsQ0FBQztLQUNwQixHQUFHLENBQUMseUJBQVcsQ0FBQyxjQUFNLE9BQUEsU0FBUyxFQUFULENBQVMsQ0FBQyxDQUFDO0tBQ2pDLEdBQUcsQ0FBQyxvQkFBTSxDQUFDO0lBQ1YsT0FBQSxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsa0NBQU8sQ0FBQyxDQUFRLEVBQWhCLENBQWdCLENBQUM7QUFBN0QsQ0FBNkQsQ0FDOUQsQ0FBQyxFQUxpQixDQUtqQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAneHN0cmVhbSdcbmltcG9ydCAqIGFzIFJlYWN0IGZyb20gJ3JlYWN0J1xuaW1wb3J0IHsgcmVuZGVyLCByZW5kZXJUaXRsZSB9IGZyb20gJ3JlYm9vdC1jb3JlJ1xuXG5pbXBvcnQgcm9vdCBmcm9tICcuL3Jvb3QnXG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHJvb3QoKVxuICAuc3Vicm91dGUoJy9jb3VudGVyJylcbiAgLnVzZShyZW5kZXJUaXRsZSgoKSA9PiAnQ291bnRlcicpKVxuICAudXNlKHJlbmRlcigoKSA9PlxuICAgIFN0cmVhbS5wZXJpb2RpYygxMDAwKS5zdGFydFdpdGgoMCkubWFwKHQgPT4gPHNwYW4+e3R9PC9zcGFuPilcbiAgKSlcbiJdfQ==

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var React = __webpack_require__(3);
	var reboot_core_1 = __webpack_require__(4);
	var counter_1 = __webpack_require__(1);
	__webpack_require__(6);
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = function () { return reboot_core_1.app()
	    .use(reboot_core_1.renderContainer(function () { return React.createElement(App, null); }))
	    .use(reboot_core_1.render(function () { return React.createElement(Home, null); })); };
	function App(props) {
	    return (React.createElement("div", null,
	        React.createElement("div", null,
	            React.createElement("h1", null, "@damplus/app"),
	            React.createElement(reboot_core_1.Link, { route: { handler: counter_1.default, params: {} } }, "Counter")),
	        props.children));
	}
	exports.App = App;
	function Home() {
	    return React.createElement("h1", null, "Home");
	}
	exports.Home = Home;
	//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJvb3QudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw2QkFBOEI7QUFDOUIsMkNBQXFGO0FBRXJGLHFDQUErQjtBQUUvQixPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7O0FBRXZCLGtCQUFlLGNBQTJCLE9BQUEsaUJBQUcsRUFBRTtLQUM1QyxHQUFHLENBQUMsNkJBQWUsQ0FBQyxjQUFNLE9BQUEsb0JBQUMsR0FBRyxPQUFHLEVBQVAsQ0FBTyxDQUFDLENBQUM7S0FDbkMsR0FBRyxDQUFDLG9CQUFNLENBQUMsY0FBTSxPQUFBLG9CQUFDLElBQUksT0FBRyxFQUFSLENBQVEsQ0FBQyxDQUFDLEVBRlksQ0FFWixDQUFBO0FBRTlCLGFBQW9CLEtBQXNDO0lBQ3hELE1BQU0sQ0FBQyxDQUNMO1FBQ0U7WUFDRSwrQ0FBcUI7WUFDckIsb0JBQUMsa0JBQUksSUFBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLGNBRXRDLENBQ0g7UUFDTCxLQUFLLENBQUMsUUFBUSxDQUNYLENBQ1AsQ0FBQTtBQUNILENBQUM7QUFaRCxrQkFZQztBQUVEO0lBQ0UsTUFBTSxDQUFDLHVDQUFhLENBQUE7QUFDdEIsQ0FBQztBQUZELG9CQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUmVhY3QgZnJvbSAncmVhY3QnXG5pbXBvcnQgeyBhcHAsIHJlbmRlciwgcmVuZGVyQ29udGFpbmVyLCBSb3V0ZSwgTGluaywgTW91bnRSZXF1ZXN0IH0gZnJvbSAncmVib290LWNvcmUnXG5cbmltcG9ydCBjb3VudGVyIGZyb20gJy4vY291bnRlcidcblxucmVxdWlyZSgnLi4vc3R5bGUuY3NzJylcblxuZXhwb3J0IGRlZmF1bHQgKCk6IFJvdXRlPE1vdW50UmVxdWVzdD4gPT4gYXBwKClcbiAgLnVzZShyZW5kZXJDb250YWluZXIoKCkgPT4gPEFwcCAvPikpXG4gIC51c2UocmVuZGVyKCgpID0+IDxIb21lIC8+KSlcblxuZXhwb3J0IGZ1bmN0aW9uIEFwcChwcm9wczogeyBjaGlsZHJlbj86IFJlYWN0LlJlYWN0Q2hpbGQgfSkge1xuICByZXR1cm4gKFxuICAgIDxkaXY+XG4gICAgICA8ZGl2PlxuICAgICAgICA8aDE+QGRhbXBsdXMvYXBwPC9oMT5cbiAgICAgICAgPExpbmsgcm91dGU9e3sgaGFuZGxlcjogY291bnRlciwgcGFyYW1zOiB7fSB9fT5cbiAgICAgICAgICBDb3VudGVyXG4gICAgICAgIDwvTGluaz5cbiAgICAgIDwvZGl2PlxuICAgICAge3Byb3BzLmNoaWxkcmVufVxuICAgIDwvZGl2PlxuICApXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBIb21lKCkge1xuICByZXR1cm4gPGgxPkhvbWU8L2gxPlxufVxuIl19

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = require("react");

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("reboot-core");

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./counter.tsx": 1,
		"./root.tsx": 2
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 5;


/***/ },
/* 6 */
/***/ function(module, exports) {

	// removed by extract-text-webpack-plugin

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	global.fetch = __webpack_require__(8);
	var routeContext = __webpack_require__(5);
	var routes = routeContext.keys()
	    .map(routeContext)
	    .map(function (x) { return x.default; });
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = routes;
	//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUlwQyxJQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7QUFDbkUsSUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRTtLQUMvQixHQUFHLENBQUMsWUFBWSxDQUFDO0tBQ2pCLEdBQUcsQ0FBQyxVQUFDLENBQU0sSUFBSyxPQUFBLENBQUMsQ0FBQyxPQUFPLEVBQVQsQ0FBUyxDQUFDLENBQUE7O0FBRTdCLGtCQUFlLE1BQU0sQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImRlY2xhcmUgbGV0IGdsb2JhbDogYW55XG5nbG9iYWwuZmV0Y2ggPSByZXF1aXJlKCdub2RlLWZldGNoJylcblxuZGVjbGFyZSBjb25zdCByZXF1aXJlOiBhbnlcblxuY29uc3Qgcm91dGVDb250ZXh0ID0gcmVxdWlyZS5jb250ZXh0KCcuLi9yb3V0ZXMnLCB0cnVlLCAvLipcXC50c3gkLylcbmNvbnN0IHJvdXRlcyA9IHJvdXRlQ29udGV4dC5rZXlzKClcbiAgLm1hcChyb3V0ZUNvbnRleHQpXG4gIC5tYXAoKHg6IGFueSkgPT4geC5kZWZhdWx0KVxuXG5leHBvcnQgZGVmYXVsdCByb3V0ZXNcbiJdfQ==

/***/ },
/* 8 */
/***/ function(module, exports) {

	module.exports = require("node-fetch");

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = require("xstream");

/***/ }
/******/ ]);