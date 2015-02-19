declare var it: (string, any) => void;
declare var exports: any;

export module Tester {

    var jsdom = require("jsdom");

    /** A helper class for interacting with a jsdom document */
    class DocReader {
        /** The document body */
        public body: Element;

        constructor( public document: Document ) {
            this.body = document.body;
        }

        /** Returns a node by ID */
        public byId( id: string ): HTMLElement {
            var elem = this.document.getElementById(id);
            if ( !elem ) {
                throw new Error("Could not find #" + id);
            }
            return elem;
        }

        /** Returns whether an ID exists in the document */
        public idExists( id: string ): boolean {
            return this.document.getElementById(id) ? true : false;
        }

        /** Returns text content of a node by id */
        public textById( id: string ): string {
            return this.byId(id).textContent;
        }

        /** Removes dirty whitespace from a string */
        public cleanup( str: string ): string {
            return str.trim().replace(/\s\s+/, " ");
        }

        /** Returns whether an element has a class */
        public hasClass( elem: HTMLElement, klass: string ): boolean {
            return elem.className.split(" ").indexOf(klass) !== -1;
        }
    }

    /** Executes a test on a thunk of HTML */
    function testHtml(
        testName: string,
        html: string,
        callback: (done: () => void, $: DocReader) => void
    ): void {
        it(testName, (done) => {
            jsdom.env( html, [], function (errors, window) {
                if ( !errors || errors.length === 0 ) {
                    callback( done, new DocReader(window.document) );
                }
                else {
                    done( errors[0] );
                }
            });
        });
    }

    /** Initializes a test */
    export function should ( name: string ) {
        return {
            using: function ( html: string ) {
                return {
                    in: function callback (
                        callback: (done: () => void, $: DocReader) => void
                    ): void {
                        testHtml( "should " + name, html, callback );
                    }
                };
            }
        };
    }
}

