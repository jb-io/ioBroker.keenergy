'use strict';

const globalUtils = require('./globalUtils');
const KebaClient = require('./KebaClient');
const MaskTreeParser = require('./MaskTreeParser');


class Keba {

    constructor() {
        this.kebaClient = new KebaClient()
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkConnection() {
        const host = globalUtils.config.host;
        if (await this.kebaClient.getDateTime()) {
            globalUtils.log.debug(`Connection established to ${host}`);
            return true;
        }
        globalUtils.log.error(`Errors while trying to connect to ${host}`);
        return false;
    }

    /**
     * @returns {Promise<("de"|"en"|"fr")>}
     */
    async getLanguageCode() {
        if (!this._languageCode) {
            if (globalUtils.config.languageCode === 'auto') {
                this._languageCode = (await this.kebaClient.getLanguageCode()) || 'en';
            } else {
                this._languageCode = globalUtils.config.languageCode;
            }
        }

        return this._languageCode;
    }

    /**
     * @returns {Promise<("ISO"|"imperial")>}
     */
    async getSystemUnit() {
        if (!this._systemUnit) {
            if (globalUtils.config.systemUnit === 'auto') {
                this._systemUnit = await this.kebaClient.getSystemUnit();
            } else {
                this._systemUnit = globalUtils.config.systemUnit;
            }
        }

        return this._systemUnit;
    }

    /**
     * @returns {Promise<Object.<string, string>>}
     */
    async readAllUnits() {
        if (!this._readAllUnits) {
            const systemUnit = await this.getSystemUnit();

            const unitProperty = (systemUnit.toLowerCase() === 'imperial') ? 'textImperial' : 'textIso';

            this._readAllUnits = {};
            for (const unit of await this.kebaClient.readAllUnits(await this.getLanguageCode())) {
                const identifierProperty = 'unitId';
                if (unit[identifierProperty] && unit[unitProperty]) {
                    this._readAllUnits[unit[identifierProperty]] = unit[unitProperty];
                }
            }
        }

        return this._readAllUnits;
    }

    /**
     * @returns {Promise<Object.<string, string[]>>}
     */
    async readAllFormats() {
        if (!this._readAllFormats) {
            this._readAllFormats = {};
            for (const format of await this.kebaClient.readAllFormats(await this.getLanguageCode())) {
                const identifierProperty = 'formatId';
                const valueProperty = 'formatTexts';
                if (format[identifierProperty] && format[valueProperty]) {
                    this._readAllFormats[format[identifierProperty]] = format[valueProperty].split('|');
                }
            }
        }

        return this._readAllFormats;
    }

    /**
     * @returns {Promise<string>}
     */
    async readMaskTreeGetContent() {
        if (!this._readMaskTree) {
            this._readMaskTree = await this.kebaClient.readMaskTreeGetContent();
        }
        return this._readMaskTree;
    }

    /**
     * @param {string} id
     * @param {boolean} withAttributes
     * @returns {Promise<ReadWriteVarsResponse>}
     */
    async readVar(id, withAttributes = false) {
        return (await this.readVars([id], withAttributes))[0];
    }

    /**
     * @typedef ReadWriteVarsAttribute
     * @type {Object}
     * @property {string} formatId
     * @property {string} longText
     */
    /**
     * @typedef ReadWriteVarsResponse
     * @type {Object}
     * @property {string} name
     * @property {string} value
     * @property {ReadWriteVarsAttribute} [attributes]
     */
    /**
     *
     * @param {Array<string>} ids
     * @param {boolean} withAttributes
     * @returns {Promise<ReadWriteVarsResponse[]>}
     */
    async readVars(ids, withAttributes = false) {
        const blockSize = 50;
        const postData = [];
        for (const id of ids) {
            const item = {'name': id};
            if (withAttributes) {
                item['attr'] = '1';
            }
            postData.push(item);
        }
        const result = [];
        const languageCode = await this.getLanguageCode();
        while (postData.length > 0) {
            const postDataSub = postData.splice(0, blockSize);
            result.push(...await this.kebaClient.readVars(languageCode, postDataSub));
        }

        return result;
    }

    /**
     * @param {string} id
     * @param {string} value
     * @returns {Promise<boolean>}
     */
    async writeVar(id, value) {
        return await this.writeVars({[id]: value});
    }

    /**
     *
     * @param {Object.<string, string>} values
     * @returns {Promise<boolean>}
     */
    async writeVars(values) {
        const data = [];
        for (const id in values) {
            data.push({'name': id, 'value': values[id]});
        }

        return await this.kebaClient.writeVars(data);
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
    async getReadWriteVars() {
        if (!this._readWriteVars) {
            const parser = new MaskTreeParser(this);
            this._readWriteVars = await parser.getVarsFromMaskTree();
        }

        return this._readWriteVars;
    }

}

module.exports = Keba;
