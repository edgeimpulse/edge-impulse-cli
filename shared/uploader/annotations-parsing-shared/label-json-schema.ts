import { JsonSchemaConstraint } from "./parse-label-json";

export const eiBBoxJsonSchema: JsonSchemaConstraint = {
    type: 'object',
    value: {
        version: {
            type: 'number',
            valid: [1],
            required: true
        },
        type: {
            type: 'string',
            valid: ['bounding-box-labels'],
            required: true
        },
        boundingBoxes: {
            type: 'object',
            isMap: true,
            values: {
                type: 'array',
                values: {
                    type: 'object',
                    value: {
                        label: {
                            type: 'string',
                            required: true
                        },
                        width: {
                            type: 'number',
                            required: true
                        },
                        height: {
                            type: 'number',
                            required: true
                        },
                        x: {
                            type: 'number',
                            required: true
                        },
                        y: {
                            type: 'number',
                            required: true
                        }
                    }
                }
            }
        }
    }
};

export const cocoJsonSchema: JsonSchemaConstraint = {
    type: 'object',
    value: {
        info: {
            type: 'object',
            value: {
                description: { type: 'string' },
                url: { type: 'string' },
                version: { type: 'string' },
                year: {
                    type: 'either',
                    possibleTypes: [
                        { type: 'string' },
                        { type: 'number' },
                    ]
                },
                contributor: { type: 'string' },
                date_created: { type: 'string' }
            }
        },
        licences: {
            type: 'array',
            values: {
                type: 'object',
                value: {
                    url: { type: 'string' },
                    id: { type: 'string' },
                    name: { type: 'string' }
                }
            }
        },
        licenses: {
            type: 'array',
            values: {
                type: 'object',
                value: {
                    url: { type: 'string' },
                    id: {
                        type: 'either',
                        possibleTypes: [
                            { type: 'string' },
                            { type: 'number' },
                        ]
                    },
                    name: { type: 'string' }
                }
            }
        },
        type: {
            type: 'string'
        },
        images: {
            type: 'array',
            values: {
                type: 'object',
                value: {
                    file_name: {
                        type: 'string',
                        required: true
                    },
                    id: {
                        type: 'number',
                        required: true
                    },
                    height: {
                        type: 'number',
                        required: true
                    },
                    width: {
                        type: 'number',
                        required: true
                    }
                },
                allowAllKeys: true
            },
            required: true
        },
        annotations: {
            type: 'array',
            values: {
                type: 'object',
                value: {
                    image_id: {
                        type: 'number',
                        required: true
                    },
                    bbox: {
                        type: 'either',
                        required: true,
                        possibleTypes: [ // May or may not be nested
                            {
                                type: 'array',
                                values: {
                                    type: 'array',
                                    values: { type: 'number' },
                                    minLength: 4,
                                    maxLength: 4
                                }
                            },
                            {
                                type: 'array',
                                values: { type: 'number' },
                                minLength: 4,
                                maxLength: 4
                            }
                        ]
                    },
                    category_id: {
                        type: 'number',
                        required: true
                    }
                },
                allowAllKeys: true
            },
            required: true
        },
        categories: {
            type: 'array',
            values: {
                type: 'object',
                value: {
                    name: {
                        type: 'string',
                        required: true
                    },
                    id: {
                        type: 'number',
                        required: true
                    },
                },
                allowAllKeys: true
            },
            required: true
        }
    }
};

export const remoSingleLabelSchema: JsonSchemaConstraint = {
    type: 'array',
    values: {
        type: 'object',
        value: {
            file_name: {
                type: 'string',
                required: true
            },
            height: {
                type: 'number',
                required: true
            },
            width: {
                type: 'number',
                required: true
            },
            task: {
                type: 'string',
                valid: ['Image classification'],
                required: true
            },
            classes: {
                type: 'array',
                values: {
                    type: 'string'
                },
                required: true
            },
            tags: {
                type: 'array',
                values: {
                    type: 'string'
                }
            }
        }
    }
};

export const remoObjectDetectionSchema: JsonSchemaConstraint = {
    type: 'array',
    values: {
        type: 'object',
        value: {
            file_name: {
                type: 'string',
                required: true
            },
            height: {
                type: 'number',
                required: true
            },
            width: {
                type: 'number',
                required: true
            },
            task: {
                type: 'string',
                valid: ['Object detection'],
                required: true
            },
            annotations: {
                type: 'array',
                required: true,
                values: {
                    type: 'object',
                    value: {
                        classes: {
                            type: 'array',
                            values: {
                                type: 'string'
                            },
                            required: true
                        },
                        bbox: {
                            type: 'object',
                            value: {
                                xmin: { type: 'number', required: true },
                                ymin: { type: 'number', required: true },
                                xmax: { type: 'number', required: true },
                                ymax: { type: 'number', required: true }
                            },
                            required: true
                        }
                    }
                }
            },
            tags: {
                type: 'array',
                values: {
                    type: 'string'
                }
            }
        }
    }
};

export const pascalVocSchema: JsonSchemaConstraint = {
    type: 'object',
    allowAllKeys: true,
    value: {
        annotation: {
            type: 'object',
            required: true,
            allowAllKeys: true,
            value: {
                folder: {
                    type: 'string',
                },
                filename: {
                    type: 'string',
                    required: true,
                },
                object: {
                    type: 'either',
                    required: true,
                    possibleTypes: [
                        // Single annotation
                        {
                            type: 'object',
                            allowAllKeys: true,
                            value: {
                                name: {
                                    type: 'string',
                                    required: true,
                                },
                                bndbox: {
                                    type: 'object',
                                    required: true,
                                    value: {
                                        xmin: {
                                            type: 'string',
                                            required: true,
                                        },
                                        ymin: {
                                            type: 'string',
                                            required: true,
                                        },
                                        xmax: {
                                            type: 'string',
                                            required: true,
                                        },
                                        ymax: {
                                            type: 'string',
                                            required: true,
                                        }
                                    }
                                }
                            }
                        },
                        // Multiple annotations
                        {
                            type: 'array',
                            values: {
                                type: 'object',
                                allowAllKeys: true,
                                value: {
                                    name: {
                                        type: 'string',
                                        required: true,
                                    },
                                    bndbox: {
                                        type: 'object',
                                        required: true,
                                        value: {
                                            xmin: {
                                                type: 'string',
                                                required: true,
                                            },
                                            ymin: {
                                                type: 'string',
                                                required: true,
                                            },
                                            xmax: {
                                                type: 'string',
                                                required: true,
                                            },
                                            ymax: {
                                                type: 'string',
                                                required: true,
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    ],
                }
            }
        }
    }
};
