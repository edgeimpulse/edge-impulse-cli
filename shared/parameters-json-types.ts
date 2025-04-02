export type DSPInfoNamedAxis = {
    name: string,
    description: string,
    optional?: boolean,
};

export type DSPInfo = {
    type: string;
    title: string;
    author: string;
    description: string;
    name: string;
    preferConvolution: boolean;
    convolutionColumns?: 'axes' | string;
    convolutionKernelSize?: number;
    cppType: string;
    visualization: 'dimensionalityReduction' | undefined;
    experimental: boolean;
    hasTfliteImplementation: boolean; // whether we can fetch TFLite file for this DSP block
    latestImplementationVersion: number;
    hasImplementationVersion: boolean; // whether implementation version should be passed in (for custom blocks)
    hasFeatureImportance: boolean;
    hasAutoTune?: boolean;
    minimumVersionForAutotune?: number;
    usesState?: boolean; // Does the DSP block use feedback, do you need to keep the state object and pass it back in
    // Optional: named axes
    axes: DSPInfoNamedAxis[] | undefined;
    port?: number;
    // List of targets that support this DSP block. If undefined, we assume this block works on all targets.
    supportedTargets?: string[];
};

export type DSPParameters = {
    group: string;
    items: DSPParameterItem[];
}[];

export type DSPParameterItemType = 'string' | 'int' | 'float' | 'select' | 'boolean' | 'bucket' | 'dataset' | 'flag' | 'secret';

// If you change this, also update https://docs.edgeimpulse.com/docs/tips-and-tricks/adding-parameters-to-custom-blocks
export type DSPParameterItem = {
    // Rendered as the label
    name: string;
    // Default value
    value: string | number | boolean;
    // Type of UI element to render
    type: DSPParameterItemType;
    // Optional help text (rendered as a help icon, text is shown on hover)
    help?: string;
    // Parameter that maps back to your block (no spaces allowed)
    param: string;
    // When type is "select" lists all options for the dropdown menu
    // you can either pass in an array of strings, or a list of objects
    // (if you want to customize the label)
    valid?: (string |
        {
            label: string,
            value: string,
            priority?: number,
            needsOps?: LearnBlockProfileOp[],
            needsFeatures?: LearnBlockProfileFeature[],
            romEstimate?: number,
        })[];
    // If this is set, the field is rendered as readonly with the text "Click to set"
    // when clicked the UI changes to a normal text box.
    optional?: boolean;
    // Whether the field should be rendered as readonly.
    // These fields are shown, but cannot be changed.
    readonly?: boolean;
    // If set, this item is only shown if the implementation version of the block matches
    // (only for DSP blocks)
    showForImplementationVersion: number[] | undefined;
    // Show/hide the item depending on another parameter
    showIf: ({
        parameter: string,
        operator: 'eq' | 'neq',
        value: string,
    }) | undefined;
    // DSP only. If set, a macro is created like:
    // #define EI_DSP_PARAMS_BLOCKCPPTYPE_PARAM     VALUE
    createMacro?: boolean;
    // When type is "select" the value passed into your block will be a string,
    // you can use configType to override the type (used during deployment only)
    configType?: string;
    // (Optional) UX section to show parameter in.
    section?: 'advanced' | 'modelProfiling';
    // Only valid for type "string". If set to true, renders a multi-line text area.
    multiline?: boolean;
    // If set, shows a hint about the input format below the input. Use this
    // sparingly, as it clutters the UI.
    hint?: string;
    // Sets the placeholder text on the input element (for types "string", "int", "float" and "secret")
    placeholder?: string;
    // Disables empty checking, only valid for type: string
    allowEmpty?: boolean;
};

export type DSPParameterResponse = {
    info: DSPInfo;
    parameters: DSPParameters;
    version?: number;
};

export type CLIBlockType = 'machine-learning' | 'transform' | 'synthetic-data' | 'ai-action' | 'deploy' | 'dsp';

export type BlockConfigItemV2 = {
    organizationId: number;
    id?: number;
};

export type BlockConfigV2 = {
    version: 2,
    config: {
        [host: string]: BlockConfigItemV2,
    }
};

// This type should list out ops we track support of across NPUs, etc.
// Just one for now, add more with OR (|)
export type LearnBlockProfileOp = 'bilinear_upsample';

// Placeholder for features that aren't ops.  None as of yet
export type LearnBlockProfileFeature = 'dummy';