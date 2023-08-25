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
import { CreateSignedUploadLinkRequest } from '../model/createSignedUploadLinkRequest';
import { CreateSignedUploadLinkResponse } from '../model/createSignedUploadLinkResponse';
import { DeletePortalFileRequest } from '../model/deletePortalFileRequest';
import { DownloadPortalFileRequest } from '../model/downloadPortalFileRequest';
import { DownloadPortalFileResponse } from '../model/downloadPortalFileResponse';
import { GenericApiResponse } from '../model/genericApiResponse';
import { ListPortalFilesInFolderRequest } from '../model/listPortalFilesInFolderRequest';
import { ListPortalFilesInFolderResponse } from '../model/listPortalFilesInFolderResponse';
import { PortalInfoResponse } from '../model/portalInfoResponse';
import { RenamePortalFileRequest } from '../model/renamePortalFileRequest';

import { ObjectSerializer, Authentication, VoidAuth } from '../model/models';
import { HttpBasicAuth, ApiKeyAuth, OAuth } from '../model/models';

import { HttpError, RequestFile } from './apis';

let defaultBasePath = 'https://studio.edgeimpulse.com/v1';

// ===============================================
// This file is autogenerated - Please do not edit
// ===============================================

export enum UploadPortalApiApiKeys {
    ApiKeyAuthentication,
    JWTAuthentication,
    JWTHttpHeaderAuthentication,
}

type viewPortalFileQueryParams = {
    path: string,
};


export type UploadPortalApiOpts = {
    extraHeaders?: {
        [name: string]: string
    },
};

export class UploadPortalApi {
    protected _basePath = defaultBasePath;
    protected defaultHeaders : any = {};
    protected _useQuerystring : boolean = false;
    protected _opts : UploadPortalApiOpts = { };

    protected authentications = {
        'default': <Authentication>new VoidAuth(),
        'ApiKeyAuthentication': new ApiKeyAuth('header', 'x-api-key'),
        'JWTAuthentication': new ApiKeyAuth('cookie', 'jwt'),
        'JWTHttpHeaderAuthentication': new ApiKeyAuth('header', 'x-jwt-token'),
    }

    constructor(basePath?: string, opts?: UploadPortalApiOpts);
    constructor(basePathOrUsername: string, opts?: UploadPortalApiOpts, password?: string, basePath?: string) {
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

    set opts(opts: UploadPortalApiOpts) {
        this._opts = opts;
    }

    get opts() {
        return this._opts;
    }

    public setDefaultAuthentication(auth: Authentication) {
        this.authentications.default = auth;
    }

    public setApiKey(key: UploadPortalApiApiKeys, value: string | undefined) {
        (this.authentications as any)[UploadPortalApiApiKeys[key]].apiKey = value;
    }


    /**
     * Creates a signed link to securely upload data to s3 bucket directly from the client.
     * @summary Create pre-signed S3 upload link
     * @param portalId Portal ID
     * @param createSignedUploadLinkRequest 
     */
    public async createSignedUploadLink (portalId: number, createSignedUploadLinkRequest: CreateSignedUploadLinkRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<CreateSignedUploadLinkResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/upload-link'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling createSignedUploadLink.');
        }

        // verify required parameter 'createSignedUploadLinkRequest' is not null or undefined


        if (createSignedUploadLinkRequest === null || createSignedUploadLinkRequest === undefined) {
            throw new Error('Required parameter createSignedUploadLinkRequest was null or undefined when calling createSignedUploadLink.');
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
            body: ObjectSerializer.serialize(createSignedUploadLinkRequest, "CreateSignedUploadLinkRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<CreateSignedUploadLinkResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "CreateSignedUploadLinkResponse");

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * Delete a file from an upload portal (requires JWT auth).
     * @summary Delete file from portal
     * @param portalId Portal ID
     * @param deletePortalFileRequest 
     */
    public async deletePortalFile (portalId: number, deletePortalFileRequest: DeletePortalFileRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/files/delete'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling deletePortalFile.');
        }

        // verify required parameter 'deletePortalFileRequest' is not null or undefined


        if (deletePortalFileRequest === null || deletePortalFileRequest === undefined) {
            throw new Error('Required parameter deletePortalFileRequest was null or undefined when calling deletePortalFile.');
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
            body: ObjectSerializer.serialize(deletePortalFileRequest, "DeletePortalFileRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

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

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * Download a file from an upload portal (requires JWT auth). Will return a signed URL to the bucket.
     * @summary Download file from portal
     * @param portalId Portal ID
     * @param downloadPortalFileRequest 
     */
    public async downloadPortalFile (portalId: number, downloadPortalFileRequest: DownloadPortalFileRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<DownloadPortalFileResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/files/download'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling downloadPortalFile.');
        }

        // verify required parameter 'downloadPortalFileRequest' is not null or undefined


        if (downloadPortalFileRequest === null || downloadPortalFileRequest === undefined) {
            throw new Error('Required parameter downloadPortalFileRequest was null or undefined when calling downloadPortalFile.');
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
            body: ObjectSerializer.serialize(downloadPortalFileRequest, "DownloadPortalFileRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<DownloadPortalFileResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "DownloadPortalFileResponse");

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * Get information about a portal
     * @summary Portal info
     * @param portalId Portal ID
     */
    public async getPortalInfo (portalId: number, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<PortalInfoResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling getPortalInfo.');
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

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<PortalInfoResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "PortalInfoResponse");

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * List all files and directories in specified prefix.
     * @summary List files in portal
     * @param portalId Portal ID
     * @param listPortalFilesInFolderRequest 
     */
    public async listPortalFilesInFolder (portalId: number, listPortalFilesInFolderRequest: ListPortalFilesInFolderRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<ListPortalFilesInFolderResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/files'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling listPortalFilesInFolder.');
        }

        // verify required parameter 'listPortalFilesInFolderRequest' is not null or undefined


        if (listPortalFilesInFolderRequest === null || listPortalFilesInFolderRequest === undefined) {
            throw new Error('Required parameter listPortalFilesInFolderRequest was null or undefined when calling listPortalFilesInFolder.');
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
            body: ObjectSerializer.serialize(listPortalFilesInFolderRequest, "ListPortalFilesInFolderRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<ListPortalFilesInFolderResponse>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "ListPortalFilesInFolderResponse");

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * Rename a file on an upload portal (requires JWT auth).
     * @summary Rename file from portal
     * @param portalId Portal ID
     * @param renamePortalFileRequest 
     */
    public async renamePortalFile (portalId: number, renamePortalFileRequest: RenamePortalFileRequest, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<GenericApiResponse> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/files/rename'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
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

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling renamePortalFile.');
        }

        // verify required parameter 'renamePortalFileRequest' is not null or undefined


        if (renamePortalFileRequest === null || renamePortalFileRequest === undefined) {
            throw new Error('Required parameter renamePortalFileRequest was null or undefined when calling renamePortalFile.');
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
            body: ObjectSerializer.serialize(renamePortalFileRequest, "RenamePortalFileRequest")
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

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

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }

    /**
     * View a file that\'s located in an upload portal (requires JWT auth).
     * @summary View file from portal
     * @param portalId Portal ID
     * @param path Path to file in portal
     */
    public async viewPortalFile (portalId: number, queryParams: viewPortalFileQueryParams, options: {headers: {[name: string]: string}} = {headers: {}}) : Promise<Buffer> {
        const localVarPath = this.basePath + '/api/portals/{portalId}/files/view'
            .replace('{' + 'portalId' + '}', encodeURIComponent(String(portalId)));
        let localVarQueryParameters: any = {};
        let localVarHeaderParams: any = (<any>Object).assign({
            'User-Agent': 'edgeimpulse-api nodejs'
        }, this.defaultHeaders);
        const produces = ['application/octet-stream'];
        // give precedence to 'application/json'
        if (produces.indexOf('application/json') >= 0) {
            localVarHeaderParams.Accept = 'application/json';
        } else {
            localVarHeaderParams.Accept = produces.join(',');
        }
        let localVarFormParams: any = {};

        // verify required parameter 'portalId' is not null or undefined


        if (portalId === null || portalId === undefined) {
            throw new Error('Required parameter portalId was null or undefined when calling viewPortalFile.');
        }

        // verify required parameter 'path' is not null or undefined

        if (queryParams.path === null || queryParams.path === undefined) {
            throw new Error('Required parameter queryParams.path was null or undefined when calling viewPortalFile.');
        }


        if (queryParams.path !== undefined) {
            localVarQueryParameters['path'] = ObjectSerializer.serialize(queryParams.path, "string");
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
            encoding: null,
        };

        let authenticationPromise = Promise.resolve();
        authenticationPromise = authenticationPromise.then(() => this.authentications.ApiKeyAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.JWTHttpHeaderAuthentication.applyToRequest(localVarRequestOptions));

        authenticationPromise = authenticationPromise.then(() => this.authentications.default.applyToRequest(localVarRequestOptions));
        return authenticationPromise.then(() => {
            if (Object.keys(localVarFormParams).length) {
                if (localVarUseFormData) {
                    (<any>localVarRequestOptions).formData = localVarFormParams;
                } else {
                    localVarRequestOptions.form = localVarFormParams;
                }
            }
            return new Promise<Buffer>((resolve, reject) => {
                localVarRequest(localVarRequestOptions, (error, response, body) => {
                    if (error) {
                        reject(error);
                    } else {
                        body = ObjectSerializer.deserialize(body, "Buffer");

                        const errString = `Failed to call "${localVarPath}", returned ${response.statusCode}: ` + response.body;

                        if (typeof body.success === 'boolean' && !body.success) {
                            reject(new Error(body.error || errString));
                        }
                        else if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                            resolve(body);
                        }
                        else {
                            reject(errString);
                        }
                    }
                });
            });
        });
    }
}
