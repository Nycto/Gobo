/// <reference path="framework/framework.ts"/>
/// <reference path="../src/gobo.ts"/>

declare var require: (string) => any;

var assert = require('chai').assert;
var WatchJS = require("watchjs");

Test.test('Each blocks', (should) => {

    should('iterate over values').using(
        `<ul id='names'>
            <li g-each-name='names'>
                <span g-text="name"></span>
            </li>
        </ul>`
    ).in((done, $) => {
        var data = {
            names: [ "Veal Steakface", "Lug ThickNeck", "Big McLargeHuge" ]
        };

        new Gobo({ watch: WatchJS }).bind($.body, data);
        assert.equal(
            $.cleanup($.textById('names')),
            "Veal Steakface Lug ThickNeck Big McLargeHuge"
        );

        done();
    });

    should('Allow directives directly on a looped node').using(
        `<ul id='names'>
            <li g-each-name='names' g-text="name"></li>
        </ul>`
    ).in((done, $) => {
        var data = {
            names: [ "Veal Steakface ", "Lug ThickNeck ", "Big McLargeHuge " ]
        };

        new Gobo({ watch: WatchJS }).bind($.body, data);
        assert.equal(
            $.cleanup($.textById('names')),
            "Veal Steakface Lug ThickNeck Big McLargeHuge"
        );

        done();
    });

    should('Respond when a value is added or removed').using(
        `<ul id='names'>
            <li g-each-name='names'>
                <span g-text="name"></span>
            </li>
        </ul>`
    ).in((done, $) => {
        var data = {
            names: [ "Veal Steakface", "Lug ThickNeck", "Big McLargeHuge" ]
        };

        new Gobo({ watch: WatchJS }).bind($.body, data);
        assert.equal( $.cleanup($.textById('names')), data.names.join(" ") );

        data.names.push("Blast ThickNeck");
        assert.equal( $.cleanup($.textById('names')), data.names.join(" ") );

        data.names.reverse();
        assert.equal( $.cleanup($.textById('names')), data.names.join(" ") );

        data.names.pop();
        assert.equal( $.cleanup($.textById('names')), data.names.join(" ") );

        data.names.shift();
        assert.equal( $.cleanup($.textById('names')), data.names.join(" ") );

        done();
    });

    should('Reuse nodes when possible').using(
        `<ul id='names'>
            <li g-each-person='people'>
                <span g-text="person.name" g-counter="person"></span>
            </li>
        </ul>`
    ).in((done, $) => {
        var data = {
            people: [ { name: "Veal" }, { name: "Lug" }, { name: "Big" } ]
        };

        var gobo = new Gobo({ watch: WatchJS })

        var calls = 0;
        gobo.directives.counter = Gobo.directive((elem, value) => {
            calls++;
            assert.isBelow(calls, 4, "Counter called too many times");
        });

        gobo.bind($.body, data);

        assert.equal( $.cleanup($.textById('names')), "Veal Lug Big" );

        data.people.reverse();

        assert.equal( $.cleanup($.textById('names')), "Big Lug Veal" );

        done();
    });

    should('Disable subsections when disabled').using(
        `<div id='names'>
            <ul g-if="active">
                <li g-each-person='people'>
                    <span g-text="person.name" g-check="person.name"></span>
                </li>
            </ul>
        </div>`
    ).in((done, $) => {
        var data = {
            active: true,
            people: [ { name: "Veal" }, { name: "Lug" }, { name: "Big" } ]
        };

        var gobo = new Gobo({ watch: WatchJS });
        gobo.directives.check = Gobo.directive((elem, value) => {
            assert.isTrue(data.active);
        });

        gobo.bind($.body, data);
        assert.equal( $.cleanup($.textById('names')), "Veal Lug Big" );

        data.active = false;
        data.people[0].name = 'Wrench';
        data.people.reverse();

        data.active = true;
        assert.equal( $.cleanup($.textById('names')), "Big Lug Wrench" );

        done();
    });

    should('ignore non-iterable values').using(
        `<ul id='values'>
            <li g-each-value='undef'>undef</li>
            <li g-each-value='explicitUndef'>explicit undef</li>
            <li g-each-value='t'>true</li>
            <li g-each-value='f'>false</li>
            <li g-each-value='zero'>zero</li>
            <li g-each-value='number'>number</li>
            <li g-each-value='str'>string</li>
            <li g-each-value='obj'>object</li>
        </ul>`
    ).in((done, $) => {
        new Gobo().bind($.body, {
            explicitUndef: undefined,
            nil: null,
            t: true,
            f: false,
            zero: 0,
            number: 3.1415,
            str: "String",
            obj: {}
        });
        assert.equal( $.cleanup($.textById('values')), "" );

        done();
    });

});



