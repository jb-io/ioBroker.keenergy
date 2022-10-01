'use strict';

const axios = require('axios');
const globalUtils = require('./globalUtils');

class Client {

    /**
     * @param baseUri {string}
     * @param timeout {number}
     */
    constructor(baseUri, timeout) {
        this._baseUri = baseUri;
        this._timeout = timeout;
    }

    post(uri, data = {}) {
        return new Promise((resolve, reject) => {
            globalUtils.log.silly(`POST ${this._baseUri}${uri}` + '\n' + '=> ' + JSON.stringify(data));
            // @ts-ignore
            axios({
                method: 'POST',
                url: `${this._baseUri}${uri}`,
                timeout: this._timeout,
                responseType: 'json',
                data,
            })
                .then((response) => {
                    globalUtils.log.silly('<= ' + JSON.stringify(response.data));
                    if (response.status === 200) {
                        resolve(response.data);
                    } else {
                        globalUtils.log.error(`POST ${this._baseUri}${uri} (${response.status}) ${response.statusText}`);
                        reject(response.statusText);
                    }
                })
                .catch(error => {
                    globalUtils.log.error(`POST ${this._baseUri}${uri} (error) ${error.message}`);
                    reject(error);
                })
            ;
        })
    }

}

module.exports = Client;
