'use strict';

const globalUtils = require('./globalUtils');
const Client = require('./Client');

// TODO: Improve error messages
// TODO: Add return statement JSDoc
class KebaClient {

    constructor() {
        // noinspection HttpUrlsUsage
        this.client = new Client(`http://${globalUtils.config.host}`, 3000)
    }

    async getDateTime() {
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

    async getLanguageCode() {
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

    async getSystemUnit() {
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

    async readAllUnits(languageCode) {
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

    async readAllFormats(languageCode) {
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

    async readMaskTreeGetContent() {
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

    async readVars(languageCode, data) {
        return new Promise((resolve) => {
            this.client.post(`/var/readWriteVars?languageCode=${languageCode}`, data)
                .then((data) => {
                    resolve(data);
                })
                .catch((error) => {
                    globalUtils.log.error(`Failed reading vars: "${error}":` + '\n' + JSON.stringify(data));
                    resolve(null);
                })
            ;
        });
    }

    async writeVars(data) {
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
