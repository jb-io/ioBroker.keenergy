'use strict';

const checkCondition = require('./conditionChecker');
const select = require('xpath.js');
const {Node} = require('xmldom/lib/dom');
const Dom = require('xmldom').DOMParser;
const globalUtils = require('./globalUtils');
const KebaClient = require('./KebaClient');


class Keba {

    constructor() {
        this.readWriteVars = {};
        this.client = new KebaClient()
    }

    async checkConnection() {
        const host = globalUtils.config.host;
        if (await this.client.getDateTime()) {
            globalUtils.log.debug(`Connection established to ${host}`);
            return true;
        }
        globalUtils.log.error(`Errors while trying to connect to ${host}`);
        return false;
    }

    async getLanguageCode() {
        if (!this._languageCode) {
            if (globalUtils.config.languageCode === 'auto') {
                this._languageCode = await this.client.getLanguageCode();
            } else {
                this._languageCode = globalUtils.config.languageCode;
            }
        }

        return this._languageCode;
    }

    async getSystemUnit() {
        if (!this._systemUnit) {
            if (globalUtils.config.systemUnit === 'auto') {
                this._systemUnit = await this.client.getSystemUnit();
            } else {
                this._systemUnit = globalUtils.config.systemUnit;
            }
        }

        return this._systemUnit;
    }

    async readAllUnits() {
        if (!this._readAllUnits) {
            const systemUnit = await this.getSystemUnit();

            const unitProperty = (systemUnit.toLowerCase() === 'imperial') ? 'textImperial' : 'textIso';

            const units = {};
            for (const unit of await this.client.readAllUnits(await this.getLanguageCode())) {
                const identifierProperty = 'unitId';
                if (unit[identifierProperty] && unit[unitProperty]) {
                    units[unit[identifierProperty]] = unit[unitProperty];
                }
            }
            this._readAllUnits = units;
        }

        return this._readAllUnits;
    }

    async readAllFormats() {
        if (!this._readAllFormats) {
            const formats = {};
            for (const format of await this.client.readAllFormats(await this.getLanguageCode())) {
                const identifierProperty = 'formatId';
                const valueProperty = 'formatTexts';
                if (format[identifierProperty] && format[valueProperty]) {
                    formats[format[identifierProperty]] = format[valueProperty].split('|');
                }
            }

            this._readAllFormats = formats;
        }

        return this._readAllFormats;
    }
    async readMaskTreeGetContent() {
        if (!this._readMaskTree) {
            this._readMaskTree = await this.client.readMaskTreeGetContent();
        }
        return this._readMaskTree;
    }

    async readVar(id, withAttributes = false) {
        return (await this.readVars([id], withAttributes))[0];
    }

    async readVars(ids, withAttributes = false) {
        const postData = [];
        for (const id of ids) {
            const item = {'name': id};
            if (withAttributes) {
                item['attr'] = '1';
            }
            postData.push(item);
        }

        return await this.client.readVars(await this.getLanguageCode(), postData);
    }

    async writeVar(id, value) {
        await this.writeVars({[id]: value});
    }

    async writeVars(values) {
        const data = [];
        for (const id in values) {
            data.push({'name': id, 'value': values[id]});
        }

        return this.client.writeVars(data);
    }

    async collectReadWriteVars() {
        // TODO: Extract this to own parser class
        const readMaskTree = await this.readMaskTreeGetContent();

        const doc = new Dom().parseFromString(readMaskTree);

        const cachedVarsCache = {};
        const parseCachedVar = (value) => {
            if (value === 'true') {
                return true;
            }
            if (value === 'false') {
                return false;
            }
            if (parseInt(value) + "" === value) {
                return parseInt(value);
            }
            return value;
        }
        const initCachedVars = async (cachedVarsCache) => {
            const visibleVars = select(doc, '/*/genericMask[@visibleVar]/@visibleVar').map(node => node.nodeValue);

            for (const {name, value} of await this.readVars(visibleVars)) {
                cachedVarsCache[name] = parseCachedVar(value);
            }
        }
        const getCachedVar = async (cachedVar) => {
            if (typeof cachedVarsCache[cachedVar] === 'undefined') {
                cachedVarsCache[cachedVar] = parseCachedVar((await this.readVar(cachedVar)).value);
            }
            return cachedVarsCache[cachedVar];
        }
        await initCachedVars(cachedVarsCache)

        const checkNodeVisible = async (node, context) => {
            if (!node.hasAttribute('visibleVar')) {
                return true;
            }
            const visibleValueExpression = node.hasAttribute('visibleValue') ? node.getAttribute('visibleValue') : null;
            const visibleVar = replacePlaceholder(node.getAttribute('visibleVar'), context);
            if (visibleVar.includes(';')) {
                globalUtils.log.warn(`rejected check for ${visibleVar}`); // TODO
                return false;
            }
            const value = await getCachedVar(visibleVar);

            return checkCondition(value, visibleValueExpression);
        }

        const checkNodeDisplayLevel = (node) => {
            if (!node.hasAttribute('displayLevel')) {
                return true;
            }
            const displayLevel = parseInt(node.getAttribute('displayLevel'));

            return displayLevel <= globalUtils.config.maxDisplayLevel;
        }
        const replacePlaceholder = (value, context) => {
            if (typeof context.placeHolder !== 'undefined' && value.match(/\[\?\]/)) {
                return value.replace(/\[\?\]/, `[${context.placeHolder}]`);
            }
            return value;
        }

        const handleNode = async (node, context) => {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }
            if (!checkNodeDisplayLevel(node)) {
                return;
            }
            if (!await checkNodeVisible(node, context)) {
                return;
            }
            const loopChildNodes = async (node, context) => {
                const childNodes = node.childNodes;
                for (let i = 0; i < childNodes.length; i++) {
                    const childNode = childNodes[i];
                    if (childNode.nodeType === Node.ELEMENT_NODE) {
                        await handleNode(childNode, context);
                    }
                }
            }
            switch (node.nodeName) {
                case 'genericMask':
                    if (node.hasAttribute('placeHolderVar')) {
                        const maxPlaceHolder = await getCachedVar(node.getAttribute('placeHolderVar'));
                        for (let placeHolder = 0; placeHolder < maxPlaceHolder; placeHolder++) {
                            const subContext = Object.assign({}, context);
                            subContext.placeHolder = placeHolder;

                            await loopChildNodes(node, subContext);
                        }
                    } else {
                        await loopChildNodes(node, context);
                    }
                    break;
                    // TODO implement heatcurveLinTab
                case 'weektimerMask':
                    // TODO implement weektimerMask
                    const varPath = node.getAttribute('varPath');

                    break;
                case 'var':
                    let varName = replacePlaceholder(node.childNodes[0].nodeValue, context);
                    this.readWriteVars[varName] = {
                        name: varName,
                        type: node.getAttribute('type'),
                        writable: node.hasAttribute('readOnly') && node.getAttribute('readOnly') === 'false' && (!node.hasAttribute('inputLevel') || parseInt(node.getAttribute('inputLevel')) <= globalUtils.config.maxInputLevel),
                        observe: node.hasAttribute('observeMsgId') && node.getAttribute('observeMsgId') === 'true',
                    };
                    break;
            }

        }


        const nodes = select(doc, '/*/genericMask[@visibleVar]');
        for (const node of nodes) {
            await handleNode(node, {});
        }

        const enrichWithAttributes = async () => {
            const readWriteVars = await this.readVars(Object.keys(this.readWriteVars), true);
            const units = await this.readAllUnits();
            const formats = await this.readAllFormats();
            for (const {name, attributes} of readWriteVars) {
                const readWriteVar = this.readWriteVars[name];
                readWriteVar.attributes = attributes;

                if (readWriteVar.attributes['unitId'] && units[readWriteVar.attributes['unitId']]) {
                    readWriteVar.unit = units[readWriteVar.attributes['unitId']];
                }
                if (readWriteVar.attributes['formatId'] && formats[readWriteVar.attributes['formatId']]) {
                    readWriteVar.formats = formats[readWriteVar.attributes['formatId']];
                }
            }
        };
        await enrichWithAttributes();
    }

}

module.exports = Keba;
