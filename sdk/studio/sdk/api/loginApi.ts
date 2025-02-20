/**
 * Edge Impulse API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

// tslint:disable-next-line: variable-name, no-var-requires
const PATH = require('path');
// tslint:disable-next-line: no-unsafe-any
module.paths.push(PATH.join(process.cwd(), 'node_modules'));

import localVarRequest = require('request');
import http = require('http');

/* tslint:disable:no-unused-locals */
import { GetJWTRequest } from '../model/getJWTRequest';
import { GetJWTResponse } from '../model/getJWTResponse';

import { ObjectSerializer, Authentication, VoidAuth } from '../model/models';

import { HttpError, RequestFile } from './apis';

let defaultBasePath = 'https://studio.edgeimpulse.com/v1';

// ===============================================
// This file is autogenerated - Please do not edit
// ===============================================

export enum LoginApiApiKeys {
}


export type LoginApiOpts = {
    extraHeaders?: {
        [name: string]: string
    },
};

export class LoginApi {
    protected _basePath = defaultBasePath;
    protected defaultHeaders : any = {};
    protected _useQuerystring : boolean = false;
    protected _opts : LoginApiOpts = { };

    protected authentications = {
        'default': <Authentication>new VoidAuth(),
    }

    constructor(basePath?: string, opts?: LoginApiOpts);
    constructor(basePathOrUsername: string, opts?: LoginApiOpts, password?: string, basePath?: string) {
        if (password) {
            if (basePath) {
                this.basePath = basePath;
            }
        } else {
            if (basePathOrUsername) {
                this.basePath = basePathOrUsername
            }
        }

        this.opts = opts ?? { };
    }

    set useQuerystring(value: boolean) {
        this._useQuerystring = value;
    }

    set basePath(basePath: string) {
        this._basePath = basePath;
    }

    get basePath() {
        return this._basePath;
    }

    set opts(opts: LoginApiOpts) {
        this._opts = opts;
    }

    get opts() {
        return this._opts;
    }

    public setDefaultAuthentication(auth: Authentication) {
        this.authentications.default = auth;
    }

    public setApiKey(key: LoginApiApiKeys, value: string | undefined) {
        (this.authentications as any)[LoginApiApiKeys[key]].apiKey = value;
    }


    /**
     * Get a JWT token to authenticate with the API.
     * @summary Get JWT token
     * @param getJWTRequest 
     */
    public async login (getJWTRequest: GetJWTRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GetJWTResponse> {
        const localVarPath = this.basePath + '/api-login';
        let localVarQueryParameters: any = {};
        let localVarHeaderParams: any = (<any>Object).assign({
            'User-Agent': 'edgeimpulse-api nodejs'
        }, this.defaultHeaders);
        const produces = ['application/json'];
        // give precedence to 'application/json'
        if (produces.indexOf('application/json') >= 0) {
            localVarHeaderParams.Accept = 'application/json';
        } else {
            localVarHeaderParams.Accept = produces.join(',');
        }
        let localVarFormParams: any = {};

        // verify required parameter 'getJWTRequest' is not null or undefined


        if (getJWTRequest === null || getJWTRequest === undefined) {
            throw new Error('Required parameter getJWTRequest was null or undefined when calling login.');
        }

        (<any>Object).assign(localVarHeaderParams, options.headers);
        (<any>Object).assign(localVarHeaderParams, this.opts.extraHeaders);

        let localVarUseFormData = false;

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'POST',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            agentOptions: {keepAlive: false},
            json: true,
            body: ObjectSerializer.serialize(getJWTRequest, "GetJWTRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GetJWTResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GetJWTResponse");

                        if (typeof body.success === 'boolean' && !body.success) {
                            const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;
                            reject(errString);
                        }
                    }
                });
            });
        });
    }
}
