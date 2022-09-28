'use strict';

const checkCondition = require('./conditionChecker');
const xpath = require('xpath.js');
const {Node} = require('xmldom/lib/dom');
const Dom = require('xmldom').DOMParser;
const globalUtils = require('./globalUtils');
// noinspection JSUnusedLocalSymbols
const Keba = require('./Keba');


class MaskTreeParser {

    /**
     * @param keba {Keba}
     */
    constructor(keba) {
        this.keba = keba;
        this._readWriteVars = {};
        this._varsCache = {};

        this._maxInputLevel = globalUtils.config.maxInputLevel;
        this._maxDisplayLevel = globalUtils.config.maxDisplayLevel;
    }

    #isNumeric(value) {
        return (parseInt(value) + "") === value;
    }

    #parseVar(value) {
        const valueMap = {
            'true': true,
            'false': false,
        }
        if (valueMap[value] !== undefined) {
            return valueMap[value];
        }
        if (this.#isNumeric(value)) {
            return parseInt(value);
        }
        return value;
    }

    async #initCachedVars(visibleVars) {
        for (const {name, value} of await this.keba.readVars(visibleVars)) {
            this._varsCache[name] = this.#parseVar(value);
        }
    }

    async #getCachedVar(variable) {
        if (typeof this._varsCache[variable] === 'undefined') {
            this._varsCache[variable] = this.#parseVar((await this.keba.readVar(variable)).value);
        }
        return this._varsCache[variable];
    }

    async #checkNodeVisible(node, context) {
        if (!node.hasAttribute('visibleVar')) {
            return true;
        }
        const visibleValueExpression = node.hasAttribute('visibleValue') ? node.getAttribute('visibleValue') : null;
        const visibleVars = this.#replacePlaceholder(node.getAttribute('visibleVar'), context).split(';');
        for (const visibleVar of visibleVars) {
            if (!await this.#checkVisibleVarCondition(visibleVar, visibleValueExpression)) {
                return false;
            }
        }
        return true;
    }

    async #checkVisibleVarCondition(visibleVar, visibleValueExpression) {
        const value = await this.#getCachedVar(visibleVar);

        return checkCondition(value, visibleValueExpression);
    }

    /**
     * @param node
     * @param attribute {string}
     * @param defaultValue {string|null}
     * @returns {string|*}
     */
    #getNodeAttribute(node, attribute, defaultValue = null) {
        return node.hasAttribute(attribute) ? node.getAttribute(attribute) : defaultValue;
    }

    #checkNodeDisplayLevel(node) {
        const displayLevel = this.#getNodeAttribute(node, 'displayLevel', '-1');

        return parseInt(displayLevel) <= this._maxDisplayLevel;
    }

    #replacePlaceholder(value, context) {
        if (typeof context.placeHolder !== 'undefined' && value.match(/\[\?]/)) {
            return value.replace(/\[\?]/, `[${context.placeHolder}]`);
        }
        return value;
    }

    #isElementNode(node) {
        return node.nodeType === Node.ELEMENT_NODE;
    }

    async #loopChildNodes(node, context) {
        const childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i];
            if (this.#isElementNode(childNode)) {
                await this.#handleNode(childNode, context);
            }
        }
    }

    async #handleNode(node, context) {
        if (!this.#isElementNode(node)) {
            return;
        }
        if (!this.#checkNodeDisplayLevel(node) || !await this.#checkNodeVisible(node, context)) {
            return;
        }

        switch (node.nodeName) {
            case 'genericMask':
                if (node.hasAttribute('placeHolderVar')) {
                    const maxPlaceHolder = await this.#getCachedVar(node.getAttribute('placeHolderVar'));
                    for (let placeHolder = 0; placeHolder < maxPlaceHolder; placeHolder++) {
                        const subContext = Object.assign({}, context);
                        subContext.placeHolder = placeHolder;

                        await this.#loopChildNodes(node, subContext);
                    }
                } else {
                    await this.#loopChildNodes(node, context);
                }
                break;
            // TODO implement heatcurveLinTab
            case 'weektimerMask':
                // TODO implement weektimerMask
                // const varPath = node.getAttribute('varPath');

                break;
            case 'var':
                let varName = this.#replacePlaceholder(node.childNodes[0].nodeValue, context);
                this._readWriteVars[varName] = {
                    name: varName,
                    type: node.getAttribute('type'),
                    writable: this.#getNodeAttribute(node, 'readOnly') === 'false' && parseInt(this.#getNodeAttribute(node, 'inputLevel', '-1')) <= this._maxInputLevel,
                    observe: this.#getNodeAttribute(node, 'observeMsgId') === 'true',
                };
                break;
        }

    }

    async #enrichWithAttributes() {
        const readWriteVars = await this.keba.readVars(Object.keys(this._readWriteVars), true);
        const units = await this.keba.readAllUnits();
        const formats = await this.keba.readAllFormats();
        for (const {name, attributes} of readWriteVars) {
            const readWriteVar = this._readWriteVars[name];
            readWriteVar.attributes = attributes;

            if (readWriteVar.attributes['unitId'] && units[readWriteVar.attributes['unitId']]) {
                readWriteVar.unit = units[readWriteVar.attributes['unitId']];
            }
            if (readWriteVar.attributes['formatId'] && formats[readWriteVar.attributes['formatId']]) {
                readWriteVar.formats = formats[readWriteVar.attributes['formatId']];
            }
        }
    }

    async getVarsFromMaskTree() {

        this._readWriteVars = {};
        this._varsCache = {};

        const maskTreeContent = await this.keba.readMaskTreeGetContent();
        const doc = new Dom().parseFromString(maskTreeContent);

        const visibleVars = xpath(doc, '/*/genericMask[@visibleVar]/@visibleVar').map(node => node.nodeValue);
        await this.#initCachedVars(visibleVars);

        const nodes = xpath(doc, '/*/genericMask[@visibleVar]');
        for (const node of nodes) {
            await this.#handleNode(node, {});
        }

        await this.#enrichWithAttributes();

        return this._readWriteVars;
    }

}

module.exports = MaskTreeParser;
