import { JsonSchemaConstraint } from "../../json-parsing";

export const eiBBoxJsonSchema: JsonSchemaConstraint = {
    type: 'object',
    isMap: false,
    required: {
        version: {
            type: 'number',
            valid: [ 1 ],
        },
        type: {
            type: 'string',
            valid: [ 'bounding-box-labels' ],
        },
    },
    optional: {
        boundingBoxes: {
            type: 'object',
            isMap: true,
            values: {
                type: 'array',
                values: {
                    type: 'object',
                    isMap: false,
                    required: {
                        label: {
                            type: 'string',
                        },
                        width: {
                            type: 'number',
                        },
                        height: {
                            type: 'number',
                        },
                        x: {
                            type: 'number',
                        },
                        y: {
                            type: 'number',
                        }
                    }
                }
            }
        }
    }
};

export const cocoJsonSchema: JsonSchemaConstraint = {
    type: 'object',
    isMap: false,
    required: {
        images: {
            type: 'array',
            values: {
                type: 'object',
                isMap: false,
                required: {
                    file_name: {
                        type: 'string',
                    },
                    id: {
                        type: 'number',
                    },
                    height: {
                        type: 'number',
                    },
                    width: {
                        type: 'number',
                    }
                },
                allowAllKeys: true
            },
        },
        annotations: {
            type: 'array',
            values: {
                type: 'object',
                isMap: false,
                required: {
                    image_id: {
                        type: 'number',
                    },
                    bbox: {
                        type: 'either',
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
                    }
                },
                allowAllKeys: true
            },
        },
        categories: {
            type: 'array',
            values: {
                type: 'object',
                isMap: false,
                required: {
                    name: {
                        type: 'string',
                    },
                    id: {
                        type: 'number',
                    },
                },
                allowAllKeys: true
            },
        }
    },
    optional: {
        info: {
            type: 'object',
            isMap: false,
            optional: {
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
                isMap: false,
                optional: {
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
                isMap: false,
                optional: {
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
    }
};

export const remoSingleLabelSchema: JsonSchemaConstraint = {
    type: 'array',
    values: {
        type: 'object',
        isMap: false,
        required: {
            file_name: {
                type: 'string',
            },
            height: {
                type: 'number',
            },
            width: {
                type: 'number',
            },
            task: {
                type: 'string',
                valid: [ 'Image classification' ],
            },
            classes: {
                type: 'array',
                values: {
                    type: 'string'
                },
            }
        },
        optional: {
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
        isMap: false,
        required: {
            file_name: {
                type: 'string',
            },
            height: {
                type: 'number',
            },
            width: {
                type: 'number',
            },
            task: {
                type: 'string',
                valid: [ 'Object detection' ],
            },
            annotations: {
                type: 'array',
                values: {
                    type: 'object',
                    isMap: false,
                    required: {
                        classes: {
                            type: 'array',
                            values: {
                                type: 'string'
                            },
                        },
                        bbox: {
                            type: 'object',
                            isMap: false,
                            required: {
                                xmin: { type: 'number' },
                                ymin: { type: 'number' },
                                xmax: { type: 'number' },
                                ymax: { type: 'number' }
                            },
                        }
                    }
                }
            },
        },
        optional: {
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
    isMap: false,
    allowAllKeys: true,
    required: {
        annotation: {
            type: 'object',
            isMap: false,
            allowAllKeys: true,
            required: {
                filename: {
                    type: 'string',
                },
                object: {
                    type: 'either',
                    possibleTypes: [
                        // Single annotation
                        {
                            type: 'object',
                            isMap: false,
                            allowAllKeys: true,
                            required: {
                                name: {
                                    type: 'string',
                                },
                                bndbox: {
                                    type: 'object',
                                    isMap: false,
                                    required: {
                                        xmin: {
                                            type: 'string',
                                        },
                                        ymin: {
                                            type: 'string',
                                        },
                                        xmax: {
                                            type: 'string',
                                        },
                                        ymax: {
                                            type: 'string',
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
                                isMap: false,
                                allowAllKeys: true,
                                required: {
                                    name: {
                                        type: 'string',
                                    },
                                    bndbox: {
                                        type: 'object',
                                        isMap: false,
                                        required: {
                                            xmin: {
                                                type: 'string',
                                            },
                                            ymin: {
                                                type: 'string',
                                            },
                                            xmax: {
                                                type: 'string',
                                            },
                                            ymax: {
                                                type: 'string',
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    ],
                }
            },
            optional: {
                folder: {
                    type: 'string',
                },
            }
        }
    }
};
