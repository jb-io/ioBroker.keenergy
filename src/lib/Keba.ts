'use strict';

import globalUtils from './globalUtils';
import KebaClient, {WriteVarsRequest} from './KebaClient';
import MaskTreeParser from './MaskTreeParser';

type ReadWriteVarsAttribute = {
    formatId: string;
    longText: string;
};

type ReadWriteVarsResponse = {
    name: string;
    value: string;
    attributes?: ReadWriteVarsAttribute;
};

type ReadWriteVar = {
    name: string;
    type: 'text' | 'numeric' | 'enum' | 'bool';
    writable: boolean;
    observe?: boolean;
};

type SystemUnit = "ISO" | "imperial";
type SystemLanguageCode = "de" | "en" | "fr";

class Keba {
    private kebaClient: KebaClient;
    private _languageCode?: SystemLanguageCode;
    private _systemUnit?: SystemUnit;
    private _readAllUnits?: Record<string, string>;
    private _readAllFormats?: Record<string, string[]>;
    private _readMaskTree?: string;
    private _readWriteVars?: Record<string, ReadWriteVar>;

    constructor() {
        this.kebaClient = new KebaClient();
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkConnection(): Promise<boolean> {
        const host = globalUtils.config.host;
        if (await this.kebaClient.getDateTime()) {
            globalUtils.log.debug(`Connection established to ${host}`);
            return true;
        }
        globalUtils.log.error(`Errors while trying to connect to ${host}`);
        return false;
    }

    /**
     * @returns {Promise<SystemLanguageCode>}
     */
    async getLanguageCode(): Promise<SystemLanguageCode> {
        if (!this._languageCode) {
            if (globalUtils.config.languageCode === 'auto') {
                this._languageCode = (await this.kebaClient.getLanguageCode()) || 'en';
            } else {
                this._languageCode = globalUtils.config.languageCode as SystemLanguageCode;
            }
        }
        return this._languageCode;
    }

    /**
     * @returns {Promise<SystemUnit>}
     */
    async getSystemUnit(): Promise<SystemUnit> {
        if (!this._systemUnit) {
            if (globalUtils.config.systemUnit === 'auto') {
                this._systemUnit = await this.kebaClient.getSystemUnit() as SystemUnit;
            } else {
                this._systemUnit = globalUtils.config.systemUnit as SystemUnit;
            }
        }
        return this._systemUnit;
    }

    async readAllUnits(): Promise<Record<string, string>> {
        if (!this._readAllUnits) {
            const systemUnit = await this.getSystemUnit();
            const unitProperty = systemUnit.toLowerCase() === 'imperial' ? 'textImperial' : 'textIso';

            this._readAllUnits = {};
            const units = await this.kebaClient.readAllUnits(await this.getLanguageCode());
            for (const unit of units) {
                const identifierProperty = 'unitId';
                if (unit[identifierProperty] && unit[unitProperty]) {
                    this._readAllUnits[unit[identifierProperty]] = unit[unitProperty];
                }
            }
        }
        return this._readAllUnits;
    }

    async readAllFormats(): Promise<Record<string, string[]>> {
        if (!this._readAllFormats) {
            this._readAllFormats = {};
            const formats = await this.kebaClient.readAllFormats(await this.getLanguageCode());
            for (const format of formats) {
                const identifierProperty = 'formatId';
                const valueProperty = 'formatTexts';
                if (format[identifierProperty] && format[valueProperty]) {
                    this._readAllFormats[format[identifierProperty]] = format[valueProperty].split('|');
                }
            }
        }
        return this._readAllFormats;
    }

    async readMaskTreeGetContent(): Promise<string> {
        if (!this._readMaskTree) {
            this._readMaskTree = await this.kebaClient.readMaskTreeGetContent();
        }
        return this._readMaskTree;
    }

    async readVar(id: string, withAttributes: boolean = false): Promise<ReadWriteVarsResponse> {
        return (await this.readVars([id], withAttributes))[0];
    }

    async readVars(ids: string[], withAttributes: boolean = false): Promise<ReadWriteVarsResponse[]> {
        const blockSize = 50;
        const postData: { name: string; attr?: '1' | '0' }[] = [];
        for (const id of ids) {
            const item: { name: string; attr?: '1' | '0' } = { name: id };
            if (withAttributes) {
                item.attr = '1';
            }
            postData.push(item);
        }
        const result: ReadWriteVarsResponse[] = [];
        const languageCode = await this.getLanguageCode();
        while (postData.length > 0) {
            const postDataSub = postData.splice(0, blockSize);
            result.push(...(await this.kebaClient.readVars(languageCode, postDataSub)));
        }
        return result;
    }

    async writeVar(id: string, value: string): Promise<boolean> {
        return await this.writeVars({ [id]: value });
    }

    async writeVars(values: Record<string, string>): Promise<boolean> {
        const data: WriteVarsRequest[] = [];
        for (const id in values) {
            data.push({ name: id, value: values[id] });
        }
        return await this.kebaClient.writeVars(data);
    }

    async getReadWriteVars(): Promise<Record<string, ReadWriteVar>> {
        if (!this._readWriteVars) {
            const parser = new MaskTreeParser(this);
            this._readWriteVars = await parser.getVarsFromMaskTree();
        }
        return this._readWriteVars;
    }
}

export default Keba;
