'use strict';

import KebaStateTransformer from './KebaStateTransformer';
import Keba from './Keba';

type VariableTypes = 'text' | 'numeric' | 'enum' | 'bool';
type StateValue = string | number | boolean;

interface StateCommon {
    name: string;
    type: 'number' | 'boolean' | 'string';
    role: string;
    read: boolean;
    write: boolean;
    unit?: string;
    states?: Record<number, string>;
    min?: number;
    max?: number;
}

interface StateNative {
    name: string;
    type: 'numeric' | 'bool' | 'enum' | 'text';
}

interface StateConfiguration {
    type: string;
    common: StateCommon;
    native: StateNative;
}

class KebaMiddleware {
    private _keba: Keba;
    private _stateConfigurations: Record<string, StateConfiguration> | null = null;
    private _idToName: Record<string, string> = {};
    private _nameToId: Record<string, string> = {};

    constructor() {
        this._keba = new Keba();
    }

    get keba(): Keba {
        return this._keba;
    }

    private normalizeStateValue(val: string, type: VariableTypes): StateValue {
        switch (type) {
            case 'numeric':
                return parseFloat(val);
            case 'bool':
                return val === 'true';
        }
        return val;
    }

    private denormalizeStateValue(val: string | number | boolean, type: VariableTypes): string {
        switch (type) {
            case 'numeric':
                return `${val}`;
            case 'bool':
                return val ? 'true' : 'false';
        }
        return `${val}`;
    }

    async readStates(ids: string[]): Promise<Record<string, StateValue>> {
        const states: Record<string, StateValue> = {};

        const names = ids.map((id) => this.getNameFromId(id));
        const data = await this._keba.readVars(names);

        for (const { name, value } of data) {
            const id = this.getIdFromName(name);
            const stateConfiguration = await this.getStateConfiguration(id);
            states[id] = this.normalizeStateValue(value, stateConfiguration.native.type);
        }

        return states;
    }

    async readState(id: string): Promise<StateValue> {
        const name = this.getNameFromId(id);
        const { value } = await this._keba.readVar(name);

        const stateConfiguration = await this.getStateConfiguration(id);
        return this.normalizeStateValue(value, stateConfiguration.native.type);
    }

    async writeState(id: string, value: StateValue): Promise<StateValue> {
        const stateConfiguration = await this.getStateConfiguration(id);
        if (!stateConfiguration.common.write) {
            throw new Error(`State ${id} is not writable.`);
        }
        await this._keba.writeVar(
            stateConfiguration.native.name,
            this.denormalizeStateValue(value, stateConfiguration.native.type)
        );
        return await this.readState(id);
    }

    async getStateConfigurations(): Promise<Record<string, StateConfiguration>> {
        if (!this._stateConfigurations) {
            this._stateConfigurations = {};

            const stateTransformer = new KebaStateTransformer();

            const readWriteVars = await this._keba.getReadWriteVars();
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

    /**
     * @param {string} id
     * @returns {Promise<StateConfiguration>}
     */
    async getStateConfiguration(id: string): Promise<StateConfiguration> {
        return (await this.getStateConfigurations())[id];
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    private getIdFromName(name: string): string {
        return this._nameToId[name];
    }

    /**
     * @param {string} id
     * @returns {string}
     */
    private getNameFromId(id: string): string {
        return this._idToName[id];
    }
}

export default KebaMiddleware;
