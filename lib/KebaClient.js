'use strict';

const globalUtils = require('./globalUtils');
const Client = require('./Client');

// TODO: Improve error messages
class KebaClient {

    constructor() {
        // noinspection HttpUrlsUsage
        this.client = new Client(`http://${globalUtils.config.host}`, 3000)
    }

    /**
     * @typedef ResponseDateTime
     * @type {Object}
     * @property {number} hours
     * @property {number} seconds
     * @property {number} month
     * @property {number} year
     * @property {number} minutes
     * @property {number} day
     */
    /**
     * @returns {Promise<ResponseDateTime|null>}
     */
    async getDateTime() {
        // curl -X POST "http://${host}/dateTime?action=getDateTime"
        return new Promise((resolve) => {
            this.client.post('/dateTime?action=getDateTime')
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to resolve languageCode: ${error}`);
                    resolve(null);
                })
            ;
        });
    }

    /**
     * @returns {Promise<("de" | "en" | "fr")>}
     */
    async getLanguageCode() {
        // curl -X POST "http://${host}/var/readWriteVars?action=read" --data-raw '{"name":"APPL.CtrlAppl.sParam.hmiRetainData.systemLanguage"}'
        return new Promise((resolve) => {
            this.client.post('/var/readWriteVars?action=read', {name: "APPL.CtrlAppl.sParam.hmiRetainData.systemLanguage"})
                .then((data) => {
                    resolve(data.value);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to resolve languageCode: ${error}`);
                    resolve('');
                })
            ;
        });
    }

    /**
     * @returns {Promise<("ISO"|"imperial")>}
     */
    async getSystemUnit() {
        // curl -X POST "http://${host}/var/readWriteVars?action=read" --data-raw '{"name":"APPL.CtrlAppl.sParam.hmiRetainData.systemUnit"}'
        return new Promise((resolve) => {
            this.client.post('/var/readWriteVars?action=read', {name: "APPL.CtrlAppl.sParam.hmiRetainData.systemUnit"})
                .then((data) => {
                    resolve(data.value);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to resolve systemUnit: ${error}`);
                    resolve('');
                })
            ;
        });
    }


    /**
     * @typedef UnitObject
     * @type {Object}
     * @property {string} textImperial "°F"
     * @property {string} divisor "1.0"
     * @property {string} textIso "°C"
     * @property {string} multiplier "1.0"
     * @property {string} unitId "Temp"
     */
    /**
     * @param {string} languageCode
     * @returns {Promise<Array<UnitObject>>}
     */
    async readAllUnits(languageCode) {
        // curl -X POST "http://${host}/var/readAllUnits?action=getUnits&languageCode=${languageCode}"
        return new Promise((resolve) => {
            this.client.post(`/var/readAllUnits?action=getUnits&languageCode=${languageCode}`)
                .then((data) => {
                    resolve(data['units']);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to read all units: ${error}`);
                    resolve([]);
                })
            ;
        });
    }

    /**
     * @typedef FormatObject
     * @type {Object}
     * @property {string} formatTexts String of values separated by |
     * @property {string} formatId Identifier of format
     * @property {string} postComma
     */
    /**
     * @param languageCode
     * @returns {Promise<Array<FormatObject>>}
     */
    async readAllFormats(languageCode) {
        // curl -X POST "http://${host}/var/readAllFormats?action=getFormats&languageCode=${languageCode}"
        return new Promise((resolve) => {
            this.client.post(`/var/readAllFormats?action=getFormats&languageCode=${languageCode}`)
                .then((data) => {
                    resolve(data['formats']);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to read all units: ${error}`);
                    resolve([]);
                })
            ;
        });
    }

    /**
     * @returns {Promise<string>}
     */
    async readMaskTreeGetContent() {
        // curl -X POST "http://${host}/readMaskTree?action=getcontent" --data-raw '{"filename":"DetailMask.xml"}'
        return new Promise((resolve) => {
            this.client.post('/readMaskTree?action=getcontent', {filename:'DetailMask.xml'})
                .then(({content: xmlContent}) => {
                    resolve(xmlContent);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed to read mask tree: ${error}`);
                    resolve('');
                })
            ;
        });
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
     * @typedef ReadVarsRequest
     * @type {Object}
     * @property {string} name
     * @property {("1"|"0")} [attr]
     */
    /**
     *
     * @param {string} languageCode
     * @param {Array<ReadVarsRequest>} data
     * @returns {Promise<Array<ReadWriteVarsResponse>>}
     */
    async readVars(languageCode, data) {
        // curl -X POST "http://${host}/var/readWriteVars?languageCode=${languageCode}" --data-raw '[{"name":"APPL.CtrlAppl.sParam.param.systemSerialNumber", "attr": "1"}]'
        return new Promise((resolve) => {
            this.client.post(`/var/readWriteVars?languageCode=${languageCode}`, data)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed reading vars: "${error}":` + '\n' + JSON.stringify(data));
                    resolve([]);
                })
            ;
        });
    }


    /**
     * @typedef WriteVarsRequest
     * @type {Object}
     * @property {string} name
     * @property {string} value
     */
    /**
     * @param {Array<WriteVarsRequest>} data
     * @returns {Promise<boolean>}
     */
    async writeVars(data) {
        // curl -X POST "http://${host}/var/readWriteVars?action=set" --data-raw '[{"name":"APPL.CtrlAppl.sParam.param.systemSerialNumber", "value": "TEST"}]'
        return new Promise((resolve) => {
            this.client.post(`/var/readWriteVars?action=set`, data)
                .then(() => {
                    resolve(true);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed writing vars: "${error}"`);
                    resolve(false);
                })
            ;
        });
    }
}

module.exports = KebaClient;
