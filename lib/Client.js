'use strict';

const axios = require('axios');

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
            // @ts-ignore
            axios({
                method: 'POST',
                url: `${this._baseUri}${uri}`,
                timeout: this._timeout,
                responseType: 'json',
                data,
            })
                .then((response) => {
                    if (response.status === 200) {
                        resolve(response.data);
                    } else {
                        reject(response.statusText);
                    }
                })
                .catch(error => {
                    reject(error);
                })
            ;
        })
    }

}

module.exports = Client;
