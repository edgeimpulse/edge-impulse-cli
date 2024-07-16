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


export class CreateUserRequest {
    /**
    * Your name
    */
    'name': string;
    /**
    * Username, minimum 4 and maximum 30 characters. May contain alphanumeric characters, hyphens, underscores and dots. Validated according to `^(?=.{4,30}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._-]+(?<![_.])$`.
    */
    'username': string;
    /**
    * E-mail address. Will need to be validated before the account will become active.
    */
    'email': string;
    /**
    * Password, minimum length 8 characters.
    */
    'password'?: string;
    /**
    * A project will automatically be created. Sets the name of the first project. If not set, this will be derived from the username.
    */
    'projectName'?: string;
    /**
    * Whether the user accepted the privacy policy
    */
    'privacyPolicy': boolean;
    /**
    * Activation token for users created via SSO
    */
    'activationToken'?: string;
    /**
    * Unique identifier of the identity provider asserting the identity of this user
    */
    'identityProvider'?: string;
    /**
    * Job title of the user. Optional field
    */
    'jobTitle'?: string;
    /**
    * Session ID. Optional field
    */
    'sessionId'?: string;
    /**
    * ACME Inc.
    */
    'companyName'?: string;
    /**
    * List of UTM parameters.
    */
    'utmParams'?: Array<any>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "name",
            "baseName": "name",
            "type": "string"
        },
        {
            "name": "username",
            "baseName": "username",
            "type": "string"
        },
        {
            "name": "email",
            "baseName": "email",
            "type": "string"
        },
        {
            "name": "password",
            "baseName": "password",
            "type": "string"
        },
        {
            "name": "projectName",
            "baseName": "projectName",
            "type": "string"
        },
        {
            "name": "privacyPolicy",
            "baseName": "privacyPolicy",
            "type": "boolean"
        },
        {
            "name": "activationToken",
            "baseName": "activationToken",
            "type": "string"
        },
        {
            "name": "identityProvider",
            "baseName": "identityProvider",
            "type": "string"
        },
        {
            "name": "jobTitle",
            "baseName": "jobTitle",
            "type": "string"
        },
        {
            "name": "sessionId",
            "baseName": "sessionId",
            "type": "string"
        },
        {
            "name": "companyName",
            "baseName": "companyName",
            "type": "string"
        },
        {
            "name": "utmParams",
            "baseName": "utmParams",
            "type": "Array<any>"
        }    ];

    static getAttributeTypeMap() {
        return CreateUserRequest.attributeTypeMap;
    }
}

