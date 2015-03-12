/// <reference path="framework.ts"/>

declare var require: (string) => any;
declare var module: any;
declare var process: any;

var fs = require('fs');
var Handlebars = require("handlebars");

/** Loads fresh test data */
function load () {

    // `require` caches modules. We need to clear that cache before
    // reloading to ensure we get fresh data
    Object.keys((<any> require).cache).forEach((key) => {
        if ( key.match(/test-data\.js$/) ) {
            delete (<any> require).cache[key];
        }
    });

    return require('./test-data.js')();
}

/** Attempts to read a file, throwing an error if it fails */
function readFile(
    res: any, path: string,
    fn: (content: string) => void
) {
    fs.readFile(path, (err, content) => {
        if (err) {
            res.sendStatus(500);
            res.send(err);
        }
        else {
            fn(content.toString());
        }
    });
}

/** Sends back a chunk of HTML */
function htmlTemplate(res: any, path: string, data: any) {
    readFile(res, path, (html) => {
        var template = Handlebars.compile(html);
        res.set('Content-Type', 'text/html');
        res.send( template(data) );
    });
}

/** Serves a javascript file */
function serveJS (path: string) {
    return (req, res) => {
        readFile(res, path, (data) => {
            res.set('Content-Type', 'application/javascript');
            res.send(data);
        });
    };
}

/** Serves a map of test suites */
function serveSuiteList ( res: any, suites: Test.SuiteSet ) {
    var data = Object.keys(suites).map(suite => {
        return {
            suite: suite,
            url: "/" + encodeURIComponent(suite),
            tests: Object.keys(suites[suite]).map(test => {
                return {
                    test: test,
                    url: "/" + encodeURIComponent(suite) +
                        "/" + encodeURIComponent(test)
                };
            })
        };
    });

    htmlTemplate(
        res,
        "./tests/framework/listing.handlebars",
        { suites: data }
    );
}

/** Starts a local server that serves up test code */
class Server {

    /** Start a new server */
    start(): void {

        var server = require('express')();

        // At the root level, list out all of the tests
        server.get('/', (req, res) => {
            serveSuiteList(res, load());
        });

        //Serve a single test suite
        server.get('/:suite', (req, res) => {
            var suites = load();

            if ( suites[req.params.suite] ) {
                var single: Test.SuiteSet = {};
                single[req.params.suite] = suites[req.params.suite];
                serveSuiteList(res, single);
            }
            else {
                res.sendStatus(404);
            }
        });

        // Serve up the required JS files
        server.get('/lib/gobo.js', serveJS('build/gobo.debug.js'));
        server.get('/lib/chai.js', serveJS('node_modules/chai/chai.js'));
        server.get('/lib/watch.js',
            serveJS('node_modules/watchjs/src/watch.js'));
        server.get('/lib/test-framework.js',
            serveJS('build/private/test-framework.js'));
        server.get('/lib/test-harness.js',
            serveJS('build/private/test-harness.js'));

        // Serve an HTML file with a specific test
        server.get('/:suite/:test', (req, res) => {
            var suites = load();

            var bundle = suites[req.params.suite] &&
                suites[req.params.suite][req.params.test];

            if ( bundle ) {
                htmlTemplate(res, "./tests/framework/test.handlebars", {
                    html: bundle.html,
                    logic: bundle.logic.toString()
                });
            }
            else {
                res.sendStatus(404);
            }
        });

        server.listen(8080, () => {
            console.log("Server started");
        });
    }
}

module.exports = function () {
    return new Server();
};
