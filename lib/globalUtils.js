// @ts-nocheck
'use strict';

class GlobalUtils {

    constructor() {
        this._adapter = null;
    }

    /**
     * @param adapter {Keenergy|Adapter}
     */
    set adapter(adapter) {
        this._adapter = adapter;
    }

    /**
     * @returns {Keenergy|Adapter}
     */
    get adapter() {
        return this._adapter;
    }

    /**
     *
     * @returns {Logger}
     */
    get log() {
        return this.adapter.log;
    }

    /**
     *
     * @returns {AdapterConfig}
     */
    get config() {
        return this.adapter.config;
    }

}

const globalUtils = new GlobalUtils();

module.exports = globalUtils;
