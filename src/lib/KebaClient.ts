'use strict';

import globalUtils from './globalUtils';
import Client from './Client';

type ResponseDateTime = {
    hours: number;
    seconds: number;
    month: number;
    year: number;
    minutes: number;
    day: number;
};

type UnitObject = {
    textImperial: string;
    divisor: string;
    textIso: string;
    multiplier: string;
    unitId: string;
};

type FormatObject = {
    formatTexts: string;
    formatId: string;
    postComma: string;
};

type ReadWriteVarsAttribute = {
    formatId: string;
    longText: string;
};

type ReadWriteVarsResponse = {
    name: string;
    value: string;
    attributes?: ReadWriteVarsAttribute;
};

type ReadVarsRequest = {
    name: string;
    attr?: '1' | '0';
};

export type WriteVarsRequest = {
    name: string;
    value: string;
};

class KebaClient {
    private client: Client;

    constructor() {
        // noinspection HttpUrlsUsage
        this.client = new Client(`http://${globalUtils.config.host}`, 3000);
    }

    /**
     * @returns {Promise<ResponseDateTime | null>}
     */
    async getDateTime(): Promise<ResponseDateTime | null> {
        return new Promise((resolve) => {
            this.client
                .post('/dateTime?action=getDateTime')
                .then((data) => {
                    resolve(data as ResponseDateTime);
                })
                .catch(() => {
                    globalUtils.log.error('Failed to get DateTime from host.');
                    resolve(null);
                });
        });
    }

    /**
     * @returns {Promise<"de" | "en" | "fr" | null>}
     */
    async getLanguageCode(): Promise<"de" | "en" | "fr" | null> {
        return new Promise((resolve) => {
            this.client
                .post('/var/readWriteVars?action=read', { name: 'APPL.CtrlAppl.sParam.hmiRetainData.systemLanguage' })
                .then((data) => {
                    resolve(data.value as "de" | "en" | "fr");
                })
                .catch(() => {
                    globalUtils.log.error('Failed to get LanguageCode from host.');
                    resolve(null);
                });
        });
    }

    /**
     * @returns {Promise<"ISO" | "imperial" | null>}
     */
    async getSystemUnit(): Promise<"ISO" | "imperial" | null> {
        return new Promise((resolve) => {
            this.client
                .post('/var/readWriteVars?action=read', { name: 'APPL.CtrlAppl.sParam.hmiRetainData.systemUnit' })
                .then((data) => {
                    resolve(data.value as "ISO" | "imperial");
                })
                .catch(() => {
                    globalUtils.log.error('Failed to get SystemUnit from host.');
                    resolve(null);
                });
        });
    }

    /**
     * @param {string} languageCode
     * @returns {Promise<Array<UnitObject>>}
     */
    async readAllUnits(languageCode: string): Promise<UnitObject[]> {
        return new Promise((resolve) => {
            this.client
                .post(`/var/readAllUnits?action=getUnits&languageCode=${languageCode}`)
                .then((data) => {
                    resolve(data.units as UnitObject[]);
                })
                .catch(() => {
                    globalUtils.log.error('Failed to get all Units from host.');
                    resolve([]);
                });
        });
    }

    /**
     * @param {string} languageCode
     * @returns {Promise<Array<FormatObject>>}
     */
    async readAllFormats(languageCode: string): Promise<FormatObject[]> {
        return new Promise((resolve) => {
            this.client
                .post(`/var/readAllFormats?action=getFormats&languageCode=${languageCode}`)
                .then((data) => {
                    resolve(data.formats as FormatObject[]);
                })
                .catch(() => {
                    globalUtils.log.error('Failed to get all Formats from host.');
                    resolve([]);
                });
        });
    }

    /**
     * @returns {Promise<string>}
     */
    async readMaskTreeGetContent(): Promise<string> {
        return new Promise((resolve) => {
            this.client
                .post('/readMaskTree?action=getcontent', { filename: 'DetailMask.xml' })
                .then(({ content: xmlContent }) => {
                    resolve(xmlContent);
                })
                .catch(() => {
                    globalUtils.log.error('Failed to read mask tree from host.');
                    resolve('');
                });
        });
    }

    /**
     * @param {string} languageCode
     * @param {Array<ReadVarsRequest>} data
     * @returns {Promise<Array<ReadWriteVarsResponse>>}
     */
    async readVars(languageCode: string, data: ReadVarsRequest[]): Promise<ReadWriteVarsResponse[]> {
        return new Promise((resolve) => {
            this.client
                .post(`/var/readWriteVars?languageCode=${languageCode}`, data)
                .then((responseData) => {
                    resolve(responseData as ReadWriteVarsResponse[]);
                })
                .catch(() => {
                    const nameList = data.map(({ name }) => name);
                    globalUtils.log.error(
                        `Failed reading vars (${nameList.length}): \n"` + JSON.stringify(nameList)
                    );
                    resolve([]);
                });
        });
    }

    /**
     * @param {Array<WriteVarsRequest>} data
     * @returns {Promise<boolean>}
     */
    async writeVars(data: WriteVarsRequest[]): Promise<boolean> {
        return new Promise((resolve) => {
            this.client
                .post('/var/readWriteVars?action=set', data)
                .then(() => {
                    resolve(true);
                })
                .catch(() => {
                    const nameList = data.map(({ name }) => name);
                    globalUtils.log.error(
                        `Failed writing vars (${nameList.length}): \n"` + JSON.stringify(nameList)
                    );
                    resolve(false);
                });
        });
    }
}

export default KebaClient;
