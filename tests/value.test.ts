/// <reference path="test-help.ts"/>

declare var require: (string) => any;
declare var describe: (string, any) => void;

var assert = require('chai').assert;
var Gobo = require("../gobo.debug.js").Gobo;
var watch = require("watchjs");

describe('Value directives', function () {

    Test.should('Set the value of an input field').using(
        `<input id='field' g-value='name'>`
    ).in((done, $) => {
        var data = { name: "Veal Steakface" };
        new Gobo({ watch: watch }).bind($.body, data);
        assert.equal( $.fieldById('field').value, "Veal Steakface" );

        data.name = "Lug ThickNeck";
        assert.equal( $.fieldById('field').value, "Lug ThickNeck" );

        done();
    });

    Test.should('Update the data when the value changes').using(
        `<input id='field' g-value='name'>`
    ).in((done, $) => {
        var data = { name: "Veal Steakface" };
        new Gobo({ watch: watch }).bind($.body, data);
        $.typeInto('field', "Lug ThickNeck");
        assert.equal( data.name, "Lug ThickNeck" );
        done();
    });

    Test.should('Update a keypath when the value changes').using(
        `<input id='field' g-value='person.details.name'>`
    ).in((done, $) => {
        var data = { person: { details: { name: "Veal Steakface" } } };
        new Gobo({ watch: watch }).bind($.body, data);

        $.typeInto('field', "Lug ThickNeck");
        assert.equal( data.person.details.name, "Lug ThickNeck" );

        $.typeInto('field', "Big McLargeHuge");
        assert.equal( data.person.details.name, "Big McLargeHuge" );

        done();
    });

    Test.should('Set the value of a select field').using(
        `<select id='field' g-value='name'>
            <option>Lug</option>
            <option>Veal</option>
            <option>Big</option>
        </select>`
    ).in((done, $) => {
        new Gobo({ watch: watch }).bind($.body, { name: "Veal" });
        assert.equal( $.fieldById('field').value, "Veal" );
        done();
    });

    Test.should('Call functions when publishing values').using(
        `<input id='field' g-value='name'>`
    ).in((done, $) => {

        new Gobo({ watch: watch }).bind($.body, {
            name: function () {
                if ( arguments.length === 0 ) {
                    return "Veal Steakface";
                }
                else {
                    assert.equal( arguments[0], "Lug ThickNeck" );
                    done();
                }
            }
        });

        assert.equal( $.fieldById('field').value, "Veal Steakface" );

        $.typeInto('field', "Lug ThickNeck");
    });
});

