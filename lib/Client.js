'use strict';

const axios = require('axios');

class Client {

    /**
     * @param baseuri {string}
     * @param timeout {number}
     */
    constructor(baseuri, timeout) {
        this._baseuri = baseuri;
        this._timeout = timeout;
    }

    post(uri, data = {}) {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            axios({
                method: 'POST',
                url: `${this._baseuri}${uri}`,
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
