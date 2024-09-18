import axios from "axios";
import globalUtils from "./globalUtils";

export default class Client {

    private readonly _baseUri: string;
    private readonly _timeout: number;

    public constructor(baseUri: string, timeout: number) {
        this._baseUri = baseUri;
        this._timeout = timeout;
    }

    public post(uri: string, data: object = {}): Promise<any> {
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
