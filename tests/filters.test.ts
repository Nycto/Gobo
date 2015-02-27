/// <reference path="test-help.ts"/>

declare var require: (string) => any;
declare var describe: (string, any) => void;

var assert = require('chai').assert;
var Gobo = require("../gobo.debug.js").Gobo;
var watch = require("watchjs");

describe('Filters', function () {

    Test.should('convert to upper and lower case').using(
        `<div>
            <span id='upper' g-text='name | uppercase'></span>
            <span id='lower' g-text='name | lowercase'></span>
        </div>`
    ).in((done, $) => {
        new Gobo({ watch: watch }).bind($.body, { name: "Veal" });
        assert.equal( $.cleanup($.textById('upper')), "VEAL" );
        assert.equal( $.cleanup($.textById('lower')), "veal" );
        done();
    });

    Test.should('Invert a truthy value').using(
        `<div>
            <span id='not' g-if='active | not'>VISIBLE</span>
        </div>`
    ).in((done, $) => {
        var data = { active: false };
        new Gobo({ watch: watch }).bind($.body, data);

        assert.equal( $.cleanup($.textById('not')), "VISIBLE" );

        data.active = true;
        assert.isFalse( $.idExists('not') );

        done();
    });

    Test.should('Limit the values of an array').using(
        `<ul id='looped'>
            <li g-each-name='names | limit 2' g-text='name'></li>
        </li>`
    ).in((done, $) => {
        var data = { names: [ "Veal ", "Lug ", "Big " ] };
        new Gobo({ watch: watch }).bind($.body, data);

        assert.equal( $.cleanup($.textById('looped')), "Veal Lug" );

        done();
    });

});
