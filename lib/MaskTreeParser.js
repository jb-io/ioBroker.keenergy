'use strict';

const checkCondition = require('./conditionChecker');
const xpath = require('xpath.js');
const {Node, Element} = require('xmldom/lib/dom');
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

    /**
     * @param {string} value
     * @returns {boolean}
     */
    #isNumeric(value) {
        return (parseInt(value) + "") === value;
    }

    /**
     * @param {string} value
     * @returns {string|number|boolean}
     */
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

    /**
     * @param {Array<string>} visibleVars
     * @returns {Promise<void>}
     */
    async #initCachedVars(visibleVars) {
        for (const {name, value} of await this.keba.readVars(visibleVars)) {
            this._varsCache[name] = this.#parseVar(value);
        }
    }

    /**
     * @param {string} variable
     * @returns {Promise<string|number|boolean>}
     */
    async #getCachedVar(variable) {
        if (typeof this._varsCache[variable] === 'undefined') {
            this._varsCache[variable] = this.#parseVar((await this.keba.readVar(variable)).value);
        }
        return this._varsCache[variable];
    }

    /**
     * @typedef Context
     * @type {Object}
     * @property {string} [placeHolder]
     */
    /**
     * @param node
     * @param {Context} context
     * @returns {Promise<boolean>}
     */
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

    /**
     * @param {string} visibleVar
     * @param {string|null} visibleValueExpression
     * @returns {Promise<boolean>}
     */
    async #checkVisibleVarCondition(visibleVar, visibleValueExpression) {
        const value = await this.#getCachedVar(visibleVar);

        return checkCondition(value, visibleValueExpression);
    }

    /**
     * @param {Element} node
     * @param {string} attribute
     * @param {string|null} defaultValue
     * @returns {string|*}
     */
    #getNodeAttribute(node, attribute, defaultValue = null) {
        return node.hasAttribute(attribute) ? node.getAttribute(attribute) : defaultValue;
    }

    /**
     * @param {Element} node
     * @returns {boolean}
     */
    #checkNodeDisplayLevel(node) {
        const displayLevel = this.#getNodeAttribute(node, 'displayLevel', '-1');

        return parseInt(displayLevel) <= this._maxDisplayLevel;
    }

    /**
     * @param {string} value
     * @param {Context} context
     * @returns {string}
     */
    #replacePlaceholder(value, context) {
        if (typeof context.placeHolder !== 'undefined' && value.match(/\[\?]/)) {
            return value.replace(/\[\?]/, `[${context.placeHolder}]`);
        }
        return value;
    }

    /**
     * @param {Element} node
     * @returns {boolean}
     */
    #isElementNode(node) {
        return node.nodeType === Node.ELEMENT_NODE;
    }

    /**
     * @param {Element} node
     * @param {Context} context
     * @returns {Promise<void>}
     */
    async #loopChildNodes(node, context) {
        const childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i];
            if (this.#isElementNode(childNode)) {
                await this.#handleNode(childNode, context);
            }
        }
    }

    /**
     * @param {string} name
     * @param {("text"|"numeric"|"enum"|"bool")} type
     * @param {boolean} writable
     * @param {boolean} observe
     */
    #addReadWriteVar(name, type, writable = false, observe= false) {
        this._readWriteVars[name] = {
            name: name,
            type: type,
            writable: writable,
            observe: observe
        };
    }

    /**
     * @param {Element} node
     * @param {Context} context
     * @returns {Promise<void>}
     */
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
                        subContext.placeHolder = `${placeHolder}`;

                        await this.#loopChildNodes(node, subContext);
                    }
                } else {
                    await this.#loopChildNodes(node, context);
                }
                break;
            case 'userMask':
                const maskId = node.getAttribute('maskId');
                if (maskId.match(/^usermasks\..*LinTab$/)) {
                    const prefix = this.#replacePlaceholder(node.getAttribute('visibleVar').split('.').slice(0, -1).join('.'), context);
                    const varName = prefix + '.linTab.fileName';

                    this.#addReadWriteVar(varName, 'text');
                    const curveName = await this.#getCachedVar(varName);

                    const linTabIds = Array.from({length: 30}, (_, i) => `APPL.CtrlAppl.sParam.linTabPool[${i}].name`);
                    const linTabMappings = {};
                    for (const {name, value} of (await this.keba.readVars(linTabIds))) {
                        if (value.length > 0) {
                            linTabMappings[value] = name.split('.').slice(0, -1).join('.');
                        }
                    }

                    const linTabPoolPrefix = linTabMappings[curveName];
                    const noOfPointsVarName = `${linTabPoolPrefix}.noOfPoints`;
                    const nameVarName = `${linTabPoolPrefix}.name`;
                    const noOfPoints = await this.#getCachedVar(noOfPointsVarName);

                    this.#addReadWriteVar(nameVarName, 'text');
                    this.#addReadWriteVar(noOfPointsVarName, 'numeric', true);

                    for (let i = 0; i < noOfPoints; i++) {
                        for (const suffix of ['x', 'y']) {
                            this.#addReadWriteVar(`${linTabPoolPrefix}.points[${i}].${suffix}`, 'numeric', true);
                        }
                    }
                }
                break;
            case 'weektimerMask':
                const varPath = this.#replacePlaceholder(node.getAttribute('varPath'), context);
                for (let day = 0; day <= 6; day++) {
                    for (let time = 0; time <= 2; time++) {
                        for (const mode of ['start', 'stop']) {
                            this.#addReadWriteVar(`${varPath}.day[${day}].enableTime[${time}].${mode}`, 'numeric', true);
                        }
                    }
                }

                break;
            case 'var':
                let varName = this.#replacePlaceholder(node.childNodes[0].nodeValue, context);
                this.#addReadWriteVar(
                    varName,
                    node.getAttribute('type'),
                    this.#getNodeAttribute(node, 'readOnly') === 'false' && parseInt(this.#getNodeAttribute(node, 'inputLevel', '-1')) <= this._maxInputLevel,
                    this.#getNodeAttribute(node, 'observeMsgId') === 'true'

                );
                break;
        }

    }

    /**
     * @returns {Promise<void>}
     */
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

    /**
     * @typedef ReadWriteVar
     * @type {Object}
     * @property {string} name
     * @property {("text"|"numeric"|"enum"|"bool")} type
     * @property {boolean} writable
     * @property {boolean} [observe]
     */
    /**
     * @returns {Promise<Object.<string, ReadWriteVar>>}
     */
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
