/// <reference path="definition.ts"/>
/// <reference path="../data.ts"/>

module Directives {

    /** A value that can be used in an 'each' directive */
    export type Eachable = { forEach( callback: (value: any) => void ): void };

    /** Swaps the position of two DOM nodes */
    function domSwap(one: Node, two: Node): void {
        var placeholder = one.ownerDocument.createComment("");
        two.parentNode.replaceChild(placeholder, two);
        one.parentNode.replaceChild(two, one);
        placeholder.parentNode.replaceChild(one, placeholder);
    }

    /** Swaps the values of two array indexs */
    function indexSwap<T>(values: T[], one: number, two: number): void {
        var temp = values[one];
        values[one] = values[two];
        values[two] = temp;
    }

    /** Loops over a value */
    export class EachStatement implements Directive {

        /** @inheritDoc DirectiveBuilder#priority */
        public static priority = 300;

        /**
         * Marks the final position of the list so new elements can quickly
         * be appended using 'insertBefore'
         */
        private end: Node;

        /** The section to clone for each sub-element */
        private template: Parse.Cloneable;

        /** Creates a scoped data object */
        private scope: (value: any) => Data.Data;

        /** The list of currently active subsections */
        private sections: Array<Parse.Section> = [];

        /**
         * The values current represented in the DOM. This is tracked to
         * reduce the churn and recycle as many sections as possible
         */
        private values: Array<any> = [];

        /** @inheritDoc Connect#connected */
        public connected = true;

        /**
         * @constructor
         * @inheritDoc Directive#constructor
         */
        constructor( elem: Node, details: Details ) {
            this.end = elem.ownerDocument.createTextNode("");
            this.template = details.cloneable();

            this.template.root.parentNode.replaceChild(
                this.end, this.template.root );

            this.scope = (value) => {
                return details.data.scope(details.param, value);
            };
        }

        /** Creates a new section at the given index */
        private createSectionAt (i: number, data: Data.Data): Parse.Section {

            if ( this.sections[i] ) {
                // If there is already a section at this index,
                // then replacce it
                var newSection = this.template.cloneReplace(
                    this.sections[i], data);
                this.sections[i].disconnect();
                return newSection;
            }
            else {
                // Otherwise, add it to the end of the list
                return this.template.cloneBefore(this.end, data);
            }
        }

        /** @inheritDoc Directive#execute */
        execute ( value: any ): void {
            var i = 0;
            (value && value.forEach ? value : []).forEach((value: any) => {

                var found = this.values.indexOf(value, i);

                // If this value exists in the list of values, we should
                // repurpose the existing section rather than creating a new one
                if ( found > i ) {
                    domSwap(this.sections[i].root, this.sections[found].root);
                    indexSwap(this.sections, i, found);
                    indexSwap(this.values, i, found);
                }

                // Only recreate this section if the value has changed
                else if ( found !== i ) {
                    var newSection = this.createSectionAt(i, this.scope(value));

                    this.sections[i] = newSection;
                    this.values[i] = value;

                    newSection.connect();
                }

                i++;
            });

            // Remove any extra sections
            for ( ; this.sections.length > i; i++ ) {
                this.values.pop();
                this.sections.pop().destroy();
            }
        }

        /** @inheritDoc Connect#connect */
        connect(): void {
            this.sections.forEach((section) => { section.connect(); });
        }

        /** @inheritDoc Connect#disconnect */
        disconnect(): void {
            this.sections.forEach((section) => { section.disconnect(); });
        }
    }
}
