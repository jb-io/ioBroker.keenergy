import * as utils from '@iobroker/adapter-core';

class GlobalUtils {

    private _adapter: null|utils.AdapterInstance = null;

    constructor() {
        this._adapter = null;
    }

    public set adapter(adapter: utils.AdapterInstance) {
        this._adapter = adapter;
    }

    public get adapter(): utils.AdapterInstance {
        return this._adapter as utils.AdapterInstance;
    }

    get log(): ioBroker.Logger {
        return this.adapter.log;
    }

    get config(): ioBroker.AdapterConfig {
        return this.adapter.config;
    }

}

const globalUtils = new GlobalUtils();

export default globalUtils;
