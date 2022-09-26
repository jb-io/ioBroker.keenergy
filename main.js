'use strict';

/*
 * Created with @iobroker/create-adapter v2.2.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here:
const Keba = require('./lib/Keba');
const AdapterUtils = require('./lib/AdapterUtils');
const globalUtils = require('./lib/globalUtils');


class Keenergy extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'keenergy',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this._keba = null;
    }

    init() {
        // Initialize your adapter here
        globalUtils.adapter = this;

        const config = this.config;

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        // this.log.debug('config host: ' + config.host);
        // this.log.debug('config updateInterval: ' + config.updateInterval);
    }

    /**
     * @returns {Keba}
     */
    get keba() {
        if (!this._keba) {
            this._keba = new Keba();
        }
        return this._keba;
    }

    /**
     * @returns {AdapterUtils}
     */
    get utils() {
        if (!this._utils) {
            this._utils = new AdapterUtils();
        }
        return this._utils;
    }

    /**
     * @param state {boolean}
     */
    setConnectionState(state) {
        this.setState('info.connection', state, true);
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {

        // Reset the connection indicator during startup
        this.setConnectionState(false);

        this.init();

        const keba = this.keba;
        if (await keba.checkConnection()) {
            this.setConnectionState(true);

            await keba.collectReadWriteVars();

            for (const name in keba.readWriteVars) {
                await this.createKebaState(name);
            }

            this.registerPeriodicalCall();
        }

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */

        // for (const name in readWriteVars) {
        //     await this.createKebaState(name);
        // }
    }

    async createKebaState(name) {

        const item = this.keba.readWriteVars[name];
        const id = this.utils.transformVariablePath(name);

        const typeMapping = {
            'numeric': 'number',
            'bool': 'boolean',
            'enum': 'string',
            'text': 'string',
        }

        let descriptiveName = item.name;
        if (item.attributes && item.attributes['longText']) {
            descriptiveName = item.attributes['longText'];
        }
        const common = {
            name: descriptiveName,
            type: typeMapping[item.type],
            role: 'value',
            read: true,
            write: item.writable,
        };
        if (item.unit) {
            common.unit = item.unit;
        }
        if (item.formats) {
            common.states = {};
            for (let i = 0; i < item.formats.length; i++) {
                common.states[i] = item.formats[i] || `UNDEFINED (${i})`;
            }
        }
        if (item.attributes) {
            if (item.attributes['upperLimit']) {
                common.max = parseInt(item.attributes['upperLimit']);
            }
            if (item.attributes['lowerLimit']) {
                common.min = parseInt(item.attributes['lowerLimit']);
            }
        }
        await this.setObjectNotExistsAsync(id, {
            type: 'state',
            common,
            native: {},
        });

        if (item.writable) {
            // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
            this.subscribeStates(id);
            // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
            // this.subscribeStates('lights.*');
            // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
            // this.subscribeStates('*');
        }
    }

    registerPeriodicalCall() {
        const updateInterval = parseInt(this.config.updateInterval) * 1000;
        this.periodically = this.setInterval(this.onPeriodically.bind(this), updateInterval);
    }

    async onPeriodically() {
        if (await this.keba.checkConnection()) {

            const ids = Object.keys(this.keba.readWriteVars);
            const data = await this.keba.readVars(ids);

            const promises = [];

            for (const item of data) {
                const itemDefinition = this.keba.readWriteVars[item.name];
                const val = this.normalizeStateValue(item.value, itemDefinition.type);
                promises.push(this.setStateAsync(this.utils.transformVariablePath(item.name), { val, ack: true }));
            }

            await Promise.all(promises);
        }
    }

    /**
     *
     * @param {string} val
     * @param {string | null} type
     * @returns {any}
     */
    normalizeStateValue(val, type = null) {
        switch (type) {
            case 'numeric':
            case 'number':
                return parseFloat(val);
            case 'boolean':
            case 'bool':
                return val === 'true';

        }
        return val;
    }

    /**
     *
     * @param {any} val
     * @param {string | null} type
     * @returns {string}
     */
    denormalizeStateValue(val, type = null) {
        type = type || typeof val;
        switch (type) {
            case 'number': {
                return `${val}`;
            }
            case 'boolean': {
                return val ? 'true' : 'false';
            }
        }
        return val;
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            if (this.periodically) {
                this.clearInterval(this.periodically);
            }

            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     */
    async onStateDeleted(id) {
        const name = this.utils.reverseTransformVariablePath(id);

        this.log.warn(`state ${id} deleted`);
        this.log.debug(`recreate state ${id} in order to avoid errors.`);
        await this.createKebaState(name);
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State} state
     */
    async onStateChangeExternal(id, state) {
        const name = this.utils.reverseTransformVariablePath(id);
        const itemDefinition = this.keba.readWriteVars[name];
        if (!(itemDefinition && itemDefinition.writable)) {
            this.log.info(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because var is not writable.`);
            return;
        }
        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from})`);
        await this.keba.writeVar(name, this.denormalizeStateValue(state.val, itemDefinition.type));
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (id.search(this.namespace) === 0) {
            id = id.substring(this.namespace.length + 1);
        }

        if (!state) {
            // The state was deleted
            await this.onStateDeleted(id);
            return;
        }
        if (!state.ack) {
            // The state was changed externally
            await this.onStateChangeExternal(id, state);
        }
    }



}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Keenergy(options);
} else {
    // otherwise start the instance directly
    new Keenergy();
}
