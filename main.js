'use strict';

/*
 * Created with @iobroker/create-adapter v2.2.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here:
const KebaMiddleware = require('./lib/KebaMiddleware');
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

        this._periodically = null;
        this._kebaMiddleware = null;
        this._stateIds = [];
    }

    init() {
        // Initialize your adapter here
        globalUtils.adapter = this;

        // const config = this.config;
        //
        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        // this.log.debug('config host: ' + config.host);
        // this.log.debug('config updateInterval: ' + config.updateInterval);
    }

    /**
     * @returns {KebaMiddleware}
     */
    get kebaMiddleware() {
        if (!this._kebaMiddleware) {
            this._kebaMiddleware = new KebaMiddleware();
        }
        return this._kebaMiddleware;
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

        if (await this.kebaMiddleware.keba.checkConnection()) {
            this.setConnectionState(true);

            await this.createStates();

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

    async createStates() {
        const states = await this.kebaMiddleware.getStateConfigurations();

        for (const id in states) {
            const obj = states[id];
            await this.setObjectNotExistsAsync(id, obj);
            this._stateIds.push(id);

            if (obj.common.writable) {
                // TODO: Subscribe also readOnly states in order to recreate deleted states
                // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
                this.subscribeStates(id);
                // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
                // this.subscribeStates('lights.*');
                // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
                // this.subscribeStates('*');
            }
        }
    }

    registerPeriodicalCall() {
        const updateInterval = parseInt(this.config.updateInterval) * 1000;
        this._periodically = this.setInterval(this.onPeriodically.bind(this), updateInterval);
    }

    async onPeriodically() {
        if (await this.kebaMiddleware.keba.checkConnection()) {

            const states = await this.kebaMiddleware.readStates(this._stateIds);

            for (const id in states) {
                const val = states[id];
                await this.setStateAsync(id, { val, ack: true });
            }

        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            if (this._periodically) {
                this.clearInterval(this._periodically);
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
        this.log.warn(`state ${id} deleted`);
        this.log.debug(`recreate state ${id} in order to avoid errors.`);
        await this.setObjectNotExistsAsync(id, await this.kebaMiddleware.getStateConfiguration(id));
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State} state
     */
    async onStateChangeExternal(id, state) {
        try {
            await this.kebaMiddleware.writeState(id, state.val);
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from})`);
        } catch (e) {
            this.log.warn(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because var is not writable.`);
        }
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
