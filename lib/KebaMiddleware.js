'use strict';

const KebaStateTransformer = require('./KebaStateTransformer');
const Keba = require('./Keba');


class KebaMiddleware {

    constructor() {
        this.keba = new Keba();
        this._stateConfigurations = null;
        this._idToName = {};
        this._nameToId = {};
    }

    /**
     *
     * @param {string} val
     * @param {string} type
     * @returns {any}
     */
    #normalizeStateValue(val, type) {
        switch (type) {
            case 'numeric':
                return parseFloat(val);
            case 'bool':
                return val === 'true';

        }
        return val;
    }

    /**
     *
     * @param {any} val
     * @param {string} type
     * @returns {string}
     */
    #denormalizeStateValue(val, type) {
        switch (type) {
            case 'numeric':
                return `${val}`;
            case 'bool':
                return val ? 'true' : 'false';
        }
        return val;
    }

    async readStates(ids) {
        const states = {};

        const names = ids.map((id) => this.#getNameFromId(id));
        const data = await this.keba.readVars(names);

        for (const {name, value} of data) {
            const id = this.#getIdFromName(name);
            const stateConfiguration = await this.getStateConfiguration(id);
            states[id] = this.#normalizeStateValue(value, stateConfiguration.native.type);
        }

        return states;
    }

    async readState(id) {
        const name = this.#getNameFromId(id);
        const {value} = await this.keba.readVar(name);

        const stateConfiguration = await this.getStateConfiguration(id);
        return  this.#normalizeStateValue(value, stateConfiguration.native.type);
    }

    async writeState(id, value) {
        const stateConfiguration = await this.getStateConfiguration(id);
        if (!stateConfiguration.common.write) {
            throw new Error(`State ${id} is not writable.`);
        }
        await this.keba.writeVar(stateConfiguration.native.name, this.#denormalizeStateValue(value, stateConfiguration.native.type));
        return await this.readState(id);
    }

    async getStateConfigurations() {
        if (!this._stateConfigurations) {
            this._stateConfigurations = {};

            const stateTransformer = new KebaStateTransformer();

            const readWriteVars = await this.keba.getReadWriteVars();
            for (const name in readWriteVars) {
                const stateConfiguration = stateTransformer.transformVarToSate(name, readWriteVars[name]);
                const id = stateTransformer.transformNameToId(name);

                this._nameToId[name] = id;
                this._idToName[id] = name;
                this._stateConfigurations[id] = stateConfiguration;
            }
        }

        return this._stateConfigurations;
    }

    async getStateConfiguration(id) {
        return (await this.getStateConfigurations())[id];
    }

    #getIdFromName(name) {
        return this._nameToId[name];
    }

    #getNameFromId(id) {
        return this._idToName[id];
    }

}

module.exports = KebaMiddleware;
