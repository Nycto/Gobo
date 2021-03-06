/// <reference path="config.ts"/>

module Traverse {

    /** Grab the next sibling of a Node that is an HTMLElement */
    function nextElementSibling( elem: Node ): HTMLElement {
        do {
            elem = elem.nextSibling;
            if ( elem && elem.nodeType === 1 ) {
                return <HTMLElement> elem;
            }
        } while ( elem );
    }

    /** Iterates over DOM nodes */
    interface DOMIterator {

        /** Whether there is another element to visit */
        hasNext(): boolean;

        /** Returns the next element */
        next(): HTMLElement;
    }

    /** Iterates over every value beneath a node, including that node */
    class DeepDOMIterator implements DOMIterator {

        /** The next element, if any */
        private nextElem: HTMLElement;

        /** @constructor */
        constructor (private root: HTMLElement) {
            this.nextElem = root;
        }

        /** Searches for the next element to visit */
        private findNextElem( elem: HTMLElement ): HTMLElement {

            // Traverse through all the children of this node
            if ( elem.children[0] ) {
                return <HTMLElement> elem.children[0];
            }

            var nextSibling: HTMLElement;

            // Otherwise, move on to the siblings of this node. Or the siblings
            // of the parent of this node
            while ( elem && !(nextSibling = nextElementSibling(elem)) ) {

                // If this node doesn't have a next sibling, check it's parent.
                // And keep moving up the tree until you find a next sibling
                elem = <HTMLElement> (<any> elem).parentNode;

                // any time we move up a parent, confirm that we are still
                // within the bounds for the constrained root
                if ( !elem || !this.root.contains(elem) ) {
                    return undefined;
                }
            }

            return nextSibling;
        }

        /** @inheritDoc DOMIterator#hasNext */
        public hasNext(): boolean {
            return !!this.nextElem;
        }

        /** @inheritDoc DOMIterator#next */
        public next(): HTMLElement {
            var current = this.nextElem;
            this.nextElem = this.findNextElem(current);
            return current;
        }
    }

    /** Iterates over a single node */
    class ShallowDOMIterator implements DOMIterator {

        /** @constructor */
        constructor (private root: HTMLElement) {}

        /** @inheritDoc DOMIterator#hasNext */
        public hasNext(): boolean {
            return !!this.root;
        }

        /** @inheritDoc DOMIterator#next */
        public next(): HTMLElement {
            var current = this.root;
            this.root = undefined;
            return current;
        }
    }

    /** Returns the attributes for a specific element */
    function getAttrs( elem: HTMLElement, config: Config.Config ): Attr[] {
        return [].slice.call(elem.attributes)
            .filter((attr) => {
                return config.isPrefixed(attr.name);
            })
            .sort((a, b) => {
                return config.getPriority(b) - config.getPriority(a);
            });
    }

    /** The different types various hooks */
    enum HookType { Directive, Component };

    /** A point of interest that needs to be hooked up */
    interface Hook {

        /** The type of hook */
        type: HookType;

        /** The element of the component or directive */
        elem: HTMLElement;

        /** For directives, this is the specific directive attr */
        attr?: Attr;

        /** For components, a list of all the directives attached to it */
        attrs?: Attr[];
    }

    /** Scans the DOM for points that need to be hooked up */
    class HookIterator {

        /** The next element being iterated over */
        private nextElem: HTMLElement;

        /**
         * Upcoming attributes. This takes on a bit of a 'special' value, since
         * hooks are bimodal. When null, it means the current element is a
         * component. When an array, it means we're parsing attributes on the
         * current element. Not great, but it's localized to this class. If any
         * other hook types need to be added, this will need to change.
         */
        private nextAttrs: Attr[];

        /** @constructor */
        constructor (
            private config: Config.Config,
            private elements: DOMIterator,
            rootAttrs: Attr[]
        ) {
            this.nextElem = elements.next();

            // Make a copy so we don't change someone else's array
            this.nextAttrs = rootAttrs.slice();
        }

        /** Whether there is another attribute */
        public hasNext(): boolean {
            if ( this.nextAttrs === null || this.nextAttrs.length > 0 ) {
                return true;
            }

            do {
                if ( !this.elements.hasNext() ) {
                    return false;
                }
                this.nextElem = this.elements.next();

                if ( this.config.isPrefixed(this.nextElem.localName) ) {
                    this.nextAttrs = null;
                }
                else {
                    this.nextAttrs = getAttrs(this.nextElem, this.config);
                }
            } while ( this.nextAttrs !== null && this.nextAttrs.length === 0 );

            return this.nextAttrs === null || this.nextAttrs.length > 0;
        }

        /** Return the element */
        public current(): Hook {
            if ( this.nextAttrs === null ) {
                return {
                    type: HookType.Component,
                    elem: this.nextElem,
                    attrs: getAttrs(this.nextElem, this.config)
                };
            }
            else {
                return {
                    type: HookType.Directive,
                    elem: this.nextElem,
                    attr: this.nextAttrs[0]
                };
            }
        }

        /** Increments to the next element */
        public next(): void {
            if ( this.nextAttrs === null ) {
                this.nextAttrs = [];
            }
            else {
                this.nextAttrs.shift();
            }
        }
    }

    /** Reads elements from the DOM with matching attributes */
    export class Reader {

        /** @constructor */
        constructor (private iter: HookIterator, public root: HTMLElement) {}

        /**
         * Creates a new instance, using the specificied attributes for the
         * root elem. Any other attributes attached to the root element will
         * be ignored
         */
        static createSetRootAttrs(
            config: Config.Config, root: HTMLElement, rootAttrs: Attr[]
        ): Reader {
            return new Reader(
                new HookIterator(config, new DeepDOMIterator(root), rootAttrs),
                root
            );
        }

        /** Creates a new instance */
        static create(config: Config.Config, root: HTMLElement): Reader {
            return Reader.createSetRootAttrs(
                config, root, getAttrs(root, config)
            );
        }

        /**
         * Creates a new instance, parsing the given dom node with the given
         * attributes and nothing else.
         */
        static createExactly(
            config: Config.Config, root: HTMLElement, rootAttrs: Attr[]
        ): Reader {
            return new Reader(
                new HookIterator(
                    config, new ShallowDOMIterator(root), rootAttrs
                ),
                root
            );
        }

        /** Executes a callback for each hook found in the DOM */
        each(
            directive: (elem: HTMLElement, attr: Attr) => void,
            component?: (elem: HTMLElement, attrs: Attr[]) => void
        ): void {
            while ( this.iter.hasNext() ) {

                var hook = this.iter.current();
                if (this.root !== hook.elem && !this.root.contains(hook.elem)) {
                    return;
                }

                this.iter.next();

                if ( hook.type === HookType.Directive ) {
                    directive(hook.elem, hook.attr);
                }
                else if ( component ) {
                    component(hook.elem, hook.attrs);
                }
            }
        }

        /** Returns an iterator for elements within a node */
        nested( elem: HTMLElement ): Reader {
            return new Reader(this.iter, elem);
        }
    }
}

