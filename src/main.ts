/*
 * Created with @iobroker/create-adapter v2.6.3
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here:
import KebaMiddleware from './lib/KebaMiddleware';
import globalUtils from './lib/globalUtils';

class Keenergy extends utils.Adapter {


    private _periodically: ReturnType<typeof this.setInterval> = null;
    private _kebaMiddleware: null|KebaMiddleware = null;
    private _stateIds: Array<string> = [];

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
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

    public get kebaMiddleware(): KebaMiddleware {
        if (!this._kebaMiddleware) {
            this._kebaMiddleware = new KebaMiddleware();
        }
        return this._kebaMiddleware;
    }

    setConnectionState(state: boolean): void {
        this.setState('info.connection', state, true);
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {

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

    private async createStates() {

        if (this.config.reloadAllStates) {
            const existingStateIds = await this.getExistingStateIds();
            for (const id in existingStateIds) {
                await this.delStateAsync(this.removeNamespaceFromStateId(id));
            }
        }

        const stateConfigurations = await this.kebaMiddleware.getStateConfigurations();
        for (const id in stateConfigurations) {
            const stateConfiguration = stateConfigurations[id] as ioBroker.SettableObject;
            // noinspection JSCheckFunctionSignatures
            await this.setObjectNotExistsAsync(id, stateConfiguration).then(() => {
                this._stateIds.push(id);
            });


            if (stateConfiguration.common && (stateConfiguration.common as ioBroker.StateCommon).write) {
                // In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
                this.subscribeStates(id);
                // You can also add a subscription for multiple states. The following line watches all states starting with "lights."
                // this.subscribeStates('lights.*');
                // Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
                // this.subscribeStates('*');
            }
        }
    }

    private registerPeriodicalCall() {
        const updateInterval = parseInt(this.config.updateInterval) * 1000;
        this._periodically = this.setInterval(this.onPeriodically.bind(this), updateInterval);
    }

    private async onPeriodically() {
        if (await this.kebaMiddleware.keba.checkConnection()) {

            const states = await this.kebaMiddleware.readStates(this._stateIds);
            const existingStateIds = await this.getExistingStateIds();

            for (const id in states) {
                const val = states[id];
                if (!existingStateIds.includes(id)) {
                    const stateConfiguration = await this.kebaMiddleware.getStateConfiguration(id) as ioBroker.SettableObject;
                    // noinspection JSCheckFunctionSignatures
                    await this.setObjectNotExistsAsync(id, stateConfiguration);
                }
                await this.setState(id, val, true);
            }

        }
    }

    async getExistingStateIds() {
        return Object.keys(await this.getStatesAsync('APPL.*')).map((id) => this.removeNamespaceFromStateId(id));
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            if (this._periodically) {
                this.clearInterval(this._periodically);
            }

            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateDeleted(id: string): Promise<void> {
        this.log.warn(`state ${id} deleted`);
        this.log.debug(`recreate state ${id} in order to avoid errors.`);
        const stateConfiguration = await this.kebaMiddleware.getStateConfiguration(id) as ioBroker.SettableObject;
        // noinspection JSCheckFunctionSignatures
        await this.setObjectNotExistsAsync(id, stateConfiguration);
        const val = await this.kebaMiddleware.readState(id);
        await this.setState(id, val, true );
    }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateChangeExternal(id: string, state: ioBroker.State): Promise<void> {
        try {
            if (null !== state.val) {
                const newVal = await this.kebaMiddleware.writeState(id, state.val);
                this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from})`);
                await this.setState(id, newVal, true);
            } else {
                this.log.warn(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because value must not be null.`);
            }
        } catch (e) {
            this.log.warn(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because var is not writable.`);
        }
    }

    protected removeNamespaceFromStateId(id: string): string {
        if (id.search(this.namespace) === 0) {
            id = id.substring(this.namespace.length + 1);
        }
        return id;
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    private async onStateChange(id: string, state: ioBroker.State|null|undefined): Promise<void> {
        id = this.removeNamespaceFromStateId(id);

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
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Keenergy(options);
} else {
    // otherwise start the instance directly
    new Keenergy();
}
