'use strict';

const globalUtils = require('./globalUtils');
const KebaClient = require('./KebaClient');
const MaskTreeParser = require('./MaskTreeParser');


class Keba {

    constructor() {
        this.kebaClient = new KebaClient()
    }

    async checkConnection() {
        const host = globalUtils.config.host;
        if (await this.kebaClient.getDateTime()) {
            globalUtils.log.debug(`Connection established to ${host}`);
            return true;
        }
        globalUtils.log.error(`Errors while trying to connect to ${host}`);
        return false;
    }

    async getLanguageCode() {
        if (!this._languageCode) {
            if (globalUtils.config.languageCode === 'auto') {
                this._languageCode = await this.kebaClient.getLanguageCode();
            } else {
                this._languageCode = globalUtils.config.languageCode;
            }
        }

        return this._languageCode;
    }

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

    async readAllUnits() {
        if (!this._readAllUnits) {
            const systemUnit = await this.getSystemUnit();

            const unitProperty = (systemUnit.toLowerCase() === 'imperial') ? 'textImperial' : 'textIso';

            const units = {};
            for (const unit of await this.kebaClient.readAllUnits(await this.getLanguageCode())) {
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
            for (const format of await this.kebaClient.readAllFormats(await this.getLanguageCode())) {
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
            this._readMaskTree = await this.kebaClient.readMaskTreeGetContent();
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

        return await this.kebaClient.readVars(await this.getLanguageCode(), postData);
    }

    async writeVar(id, value) {
        await this.writeVars({[id]: value});
    }

    async writeVars(values) {
        const data = [];
        for (const id in values) {
            data.push({'name': id, 'value': values[id]});
        }

        return this.kebaClient.writeVars(data);
    }

    async getReadWriteVars() {
        if (!this._readWriteVars) {
            const parser = new MaskTreeParser(this);
            this._readWriteVars = await parser.getVarsFromMaskTree();
        }

        return this._readWriteVars;
    }

}

module.exports = Keba;
