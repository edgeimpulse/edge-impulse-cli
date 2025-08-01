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
import { GenericApiResponse } from '../model/genericApiResponse';
import { GetThemeResponse } from '../model/getThemeResponse';
import { GetThemesResponse } from '../model/getThemesResponse';
import { UpdateThemeColorsRequest } from '../model/updateThemeColorsRequest';
import { UpdateThemeLogosRequest } from '../model/updateThemeLogosRequest';

import { ObjectSerializer, Authentication, VoidAuth } from '../model/models';
import { HttpBasicAuth, ApiKeyAuth, OAuth } from '../model/models';

import { HttpError, RequestFile } from './apis';

let defaultBasePath = 'https://studio.edgeimpulse.com/v1';

// ===============================================
// This file is autogenerated - Please do not edit
// ===============================================

export enum ThemesApiApiKeys {
    ApiKeyAuthentication,
    JWTAuthentication,
    JWTHttpHeaderAuthentication,
}

export type updateThemeFaviconFormParams = {
    image: RequestFile,
};


export type ThemesApiOpts = {
    extraHeaders?: {
        [name: string]: string
    },
};

export class ThemesApi {
    protected _basePath = defaultBasePath;
    protected defaultHeaders : any = {};
    protected _useQuerystring : boolean = false;
    protected _opts : ThemesApiOpts = { };

    protected authentications = {
        'default': <Authentication>new VoidAuth(),
        'ApiKeyAuthentication': new ApiKeyAuth('header', 'x-api-key'),
        'OAuth2': new OAuth(),
        'JWTAuthentication': new ApiKeyAuth('cookie', 'jwt'),
        'JWTHttpHeaderAuthentication': new ApiKeyAuth('header', 'x-jwt-token'),
    }

    constructor(basePath?: string, opts?: ThemesApiOpts);
    constructor(basePathOrUsername: string, opts?: ThemesApiOpts, password?: string, basePath?: string) {
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

    set opts(opts: ThemesApiOpts) {
        this._opts = opts;
    }

    get opts() {
        return this._opts;
    }

    public setDefaultAuthentication(auth: Authentication) {
        this.authentications.default = auth;
    }

    public setApiKey(key: ThemesApiApiKeys, value: string | undefined) {
        (this.authentications as any)[ThemesApiApiKeys[key]].apiKey = value;
    }

    set accessToken(token: string) {
        this.authentications.OAuth2.accessToken = token;
    }


    /**
     * Delete a theme given its unique identifier.
     * @summary Delete theme by ID
     * @param themeId Theme ID
     */
    public async deleteTheme (themeId: number, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/themes/{themeId}'
            .replace('{' + 'themeId' + '}', encodeURIComponent(String(themeId)));
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

        // verify required parameter 'themeId' is not null or undefined


        if (themeId === null || themeId === undefined) {
            throw new Error('Required parameter themeId was null or undefined when calling deleteTheme.');
        }

        (<any>Object).assign(localVarHeaderParams, options.headers);
        (<any>Object).assign(localVarHeaderParams, this.opts.extraHeaders);

        let localVarUseFormData = false;

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'DELETE',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            agentOptions: {keepAlive: false},
            json: true,
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GenericApiResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GenericApiResponse");

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

    /**
     * Get a theme given its unique identifier.
     * @summary Get theme by ID
     * @param themeId Theme ID
     */
    public async getTheme (themeId: number, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GetThemeResponse> {
        const localVarPath = this.basePath + '/api/themes/{themeId}'
            .replace('{' + 'themeId' + '}', encodeURIComponent(String(themeId)));
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

        // verify required parameter 'themeId' is not null or undefined


        if (themeId === null || themeId === undefined) {
            throw new Error('Required parameter themeId was null or undefined when calling getTheme.');
        }

        (<any>Object).assign(localVarHeaderParams, options.headers);
        (<any>Object).assign(localVarHeaderParams, this.opts.extraHeaders);

        let localVarUseFormData = false;

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'GET',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            agentOptions: {keepAlive: false},
            json: true,
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GetThemeResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GetThemeResponse");

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

    /**
     * Get all available Studio themes.
     * @summary Get themes
     */
    public async getThemes (options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GetThemesResponse> {
        const localVarPath = this.basePath + '/api/themes';
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

        (<any>Object).assign(localVarHeaderParams, options.headers);
        (<any>Object).assign(localVarHeaderParams, this.opts.extraHeaders);

        let localVarUseFormData = false;

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'GET',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            agentOptions: {keepAlive: false},
            json: true,
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GetThemesResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GetThemesResponse");

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

    /**
     * Update some or all theme colors.
     * @summary Update theme colors
     * @param themeId Theme ID
     * @param updateThemeColorsRequest 
     */
    public async updateThemeColors (themeId: number, updateThemeColorsRequest: UpdateThemeColorsRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/themes/{themeId}/colors'
            .replace('{' + 'themeId' + '}', encodeURIComponent(String(themeId)));
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

        // verify required parameter 'themeId' is not null or undefined


        if (themeId === null || themeId === undefined) {
            throw new Error('Required parameter themeId was null or undefined when calling updateThemeColors.');
        }

        // verify required parameter 'updateThemeColorsRequest' is not null or undefined


        if (updateThemeColorsRequest === null || updateThemeColorsRequest === undefined) {
            throw new Error('Required parameter updateThemeColorsRequest was null or undefined when calling updateThemeColors.');
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
            body: ObjectSerializer.serialize(updateThemeColorsRequest, "UpdateThemeColorsRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GenericApiResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GenericApiResponse");

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

    /**
     * Update the theme favicon
     * @summary Update theme favicon
     * @param themeId Theme ID
     * @param image 
     */
    public async updateThemeFavicon (themeId: number, params: updateThemeFaviconFormParams, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/themes/{themeId}/favicon'
            .replace('{' + 'themeId' + '}', encodeURIComponent(String(themeId)));
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

        // verify required parameter 'themeId' is not null or undefined


        if (themeId === null || themeId === undefined) {
            throw new Error('Required parameter themeId was null or undefined when calling updateThemeFavicon.');
        }

        // verify required parameter 'image' is not null or undefined
        if (params.image === null || params.image === undefined) {
            throw new Error('Required parameter params.image was null or undefined when calling updateThemeFavicon.');
        }



        (<any>Object).assign(localVarHeaderParams, options.headers);
        (<any>Object).assign(localVarHeaderParams, this.opts.extraHeaders);

        let localVarUseFormData = false;

        if (params.image !== undefined) {
            localVarFormParams['image'] = params.image;
        }
        localVarUseFormData = true;

        let localVarRequestOptions: localVarRequest.Options = {
            method: 'POST',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            agentOptions: {keepAlive: false},
            json: true,
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GenericApiResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GenericApiResponse");

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

    /**
     * Update some or all theme logos.
     * @summary Update theme logos
     * @param themeId Theme ID
     * @param updateThemeLogosRequest 
     */
    public async updateThemeLogos (themeId: number, updateThemeLogosRequest: UpdateThemeLogosRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/themes/{themeId}/logos'
            .replace('{' + 'themeId' + '}', encodeURIComponent(String(themeId)));
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

        // verify required parameter 'themeId' is not null or undefined


        if (themeId === null || themeId === undefined) {
            throw new Error('Required parameter themeId was null or undefined when calling updateThemeLogos.');
        }

        // verify required parameter 'updateThemeLogosRequest' is not null or undefined


        if (updateThemeLogosRequest === null || updateThemeLogosRequest === undefined) {
            throw new Error('Required parameter updateThemeLogosRequest was null or undefined when calling updateThemeLogos.');
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
            body: ObjectSerializer.serialize(updateThemeLogosRequest, "UpdateThemeLogosRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.OAuth2.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<GenericApiResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "GenericApiResponse");

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
