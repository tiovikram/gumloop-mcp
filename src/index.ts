#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define the version
const VERSION = "1.0.0";

// Validation schemas for the API endpoints

// Start Automation
const StartAutomationSchema = z.object({
  user_id: z.string().describe("The ID for the user initiating the flow"),
  saved_item_id: z.string().describe("The ID for the saved flow"),
  project_id: z
    .string()
    .optional()
    .describe("The ID of the project within which the flow is executed"),
  pipeline_inputs: z
    .array(
      z.object({
        input_name: z
          .string()
          .describe("The 'input_name' parameter from your Input node"),
        value: z
          .string()
          .describe("The value to be passed in to the Input node"),
      }),
    )
    .optional()
    .describe("A list of inputs for the flow, containing key-value pairs"),
});

// Retrieve Run Details
const RetrieveRunDetailsSchema = z
  .object({
    run_id: z.string().describe("ID of the flow run to retrieve"),
    user_id: z
      .string()
      .optional()
      .describe(
        "The ID for the user initiating the flow. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The ID of the project within which the flow is executed. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// List Saved Flows
const ListSavedFlowsSchema = z
  .object({
    user_id: z
      .string()
      .optional()
      .describe(
        "The user ID for which to list items. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The project ID for which to list items. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// List Workbooks and Their Saved Flows
const ListWorkbooksSchema = z
  .object({
    user_id: z
      .string()
      .optional()
      .describe(
        "The user ID for which to list workbooks. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The project ID for which to list workbooks. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// Retrieve Input Schema
const RetrieveInputSchemaSchema = z
  .object({
    saved_item_id: z
      .string()
      .describe("The ID of the saved item for which to retrieve input schemas"),
    user_id: z
      .string()
      .optional()
      .describe(
        "User ID that created the flow. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "Project ID that the flow is under. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// Upload File
const UploadFileSchema = z
  .object({
    file_name: z.string().describe("The name of the file to be uploaded"),
    file_content: z.string().describe("Base64 encoded content of the file"),
    user_id: z
      .string()
      .optional()
      .describe(
        "The user ID associated with the file. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The project ID associated with the file. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// Upload Multiple Files
const UploadMultipleFilesSchema = z
  .object({
    files: z
      .array(
        z.object({
          file_name: z.string().describe("The name of the file to be uploaded"),
          file_content: z
            .string()
            .describe("Base64 encoded content of the file"),
        }),
      )
      .describe("Array of file objects to upload"),
    user_id: z
      .string()
      .optional()
      .describe(
        "The user ID associated with the files. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The project ID associated with the files. Required if user_id is not provided",
      ),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// Download File
const DownloadFileSchema = z.object({
  file_name: z.string().describe("The name of the file to download"),
  run_id: z
    .string()
    .describe("The ID of the flow run associated with the file"),
  saved_item_id: z
    .string()
    .describe("The saved item ID associated with the file"),
  user_id: z
    .string()
    .optional()
    .describe("The user ID associated with the flow run"),
  project_id: z
    .string()
    .optional()
    .describe("The project ID associated with the flow run"),
});

// Download Multiple Files
const DownloadMultipleFilesSchema = z
  .object({
    file_names: z
      .array(z.string())
      .describe("An array of file names to download"),
    run_id: z
      .string()
      .describe("The ID of the flow run associated with the files"),
    user_id: z
      .string()
      .optional()
      .describe(
        "The user ID associated with the files. Required if project_id is not provided",
      ),
    project_id: z
      .string()
      .optional()
      .describe(
        "The project ID associated with the files. Required if user_id is not provided",
      ),
    saved_item_id: z
      .string()
      .optional()
      .describe("The saved item ID associated with the files"),
  })
  .refine((data) => data.user_id || data.project_id, {
    message: "Either user_id or project_id is required",
  });

// API client class to handle requests
class GumloopAPI {
  private baseUrl = "https://api.gumloop.com/api/v1";
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GUMLOOP_API_KEY;
    if (!apiKey) {
      throw new Error("GUMLOOP_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST",
    data?: unknown,
  ) {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    let url = this.baseUrl + endpoint;

    if (method === "GET" && data) {
      // For GET requests, append query parameters
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(data as Record<string, any>)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += "?" + queryString;
      }
    } else if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `Gumloop API request failed: ${response.status} - ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      return response.arrayBuffer(); // For file downloads
    }
  }

  // Start Automation
  async startAutomation(params: z.infer<typeof StartAutomationSchema>) {
    return this.makeRequest("/start_pipeline", "POST", params);
  }

  // Retrieve Run Details
  async retrieveRunDetails(params: z.infer<typeof RetrieveRunDetailsSchema>) {
    return this.makeRequest("/get_pl_run", "GET", params);
  }

  // List Saved Flows
  async listSavedFlows(params: z.infer<typeof ListSavedFlowsSchema>) {
    return this.makeRequest("/list_saved_items", "GET", params);
  }

  // List Workbooks and Their Saved Flows
  async listWorkbooks(params: z.infer<typeof ListWorkbooksSchema>) {
    return this.makeRequest("/list_workbooks", "GET", params);
  }

  // Retrieve Input Schema
  async retrieveInputSchema(params: z.infer<typeof RetrieveInputSchemaSchema>) {
    return this.makeRequest("/get_inputs", "GET", params);
  }

  // Upload File
  async uploadFile(params: z.infer<typeof UploadFileSchema>) {
    return this.makeRequest("/upload_file", "POST", params);
  }

  // Upload Multiple Files
  async uploadMultipleFiles(params: z.infer<typeof UploadMultipleFilesSchema>) {
    return this.makeRequest("/upload_files", "POST", params);
  }

  // Download File
  async downloadFile(params: z.infer<typeof DownloadFileSchema>) {
    return this.makeRequest("/download_file", "POST", params);
  }

  // Download Multiple Files
  async downloadMultipleFiles(
    params: z.infer<typeof DownloadMultipleFilesSchema>,
  ) {
    return this.makeRequest("/download_files", "POST", params);
  }
}

// Define tools
const TOOLS: Record<string, Tool> = {
  startAutomation: {
    name: "startAutomation",
    description: "Initiates a new flow run for a specific saved automation",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "The ID for the user initiating the flow",
        },
        saved_item_id: {
          type: "string",
          description: "The ID for the saved flow",
        },
        project_id: {
          type: "string",
          description:
            "The ID of the project within which the flow is executed",
        },
        pipeline_inputs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              input_name: {
                type: "string",
                description: "The 'input_name' parameter from your Input node",
              },
              value: {
                type: "string",
                description: "The value to be passed in to the Input node",
              },
            },
            required: ["input_name", "value"],
          },
          description:
            "A list of inputs for the flow, containing key-value pairs",
        },
      },
      required: ["user_id", "saved_item_id"],
    },
  },
  retrieveRunDetails: {
    name: "retrieveRunDetails",
    description: "Retrieves details about a specific flow run",
    inputSchema: {
      type: "object",
      properties: {
        run_id: {
          type: "string",
          description: "ID of the flow run to retrieve",
        },
        user_id: {
          type: "string",
          description: "The ID for the user initiating the flow",
        },
        project_id: {
          type: "string",
          description:
            "The ID of the project within which the flow is executed",
        },
      },
      required: ["run_id"],
    },
  },
  listSavedFlows: {
    name: "listSavedFlows",
    description: "Retrieves a list of all saved flows for a user or project",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "The user ID to for which to list items",
        },
        project_id: {
          type: "string",
          description: "The project ID for which to list items",
        },
      },
    },
  },
  listWorkbooks: {
    name: "listWorkbooks",
    description:
      "Retrieves a list of all workbooks and their associated saved flows for a user or project",
    inputSchema: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "The user ID for which to list workbooks",
        },
        project_id: {
          type: "string",
          description: "The project ID for which to list workbooks",
        },
      },
    },
  },
  retrieveInputSchema: {
    name: "retrieveInputSchema",
    description: "Retrieves the input schema for a specific saved flow",
    inputSchema: {
      type: "object",
      properties: {
        saved_item_id: {
          type: "string",
          description:
            "The ID of the saved item for which to retrieve input schemas",
        },
        user_id: {
          type: "string",
          description: "User ID that created the flow",
        },
        project_id: {
          type: "string",
          description: "Project ID that the flow is under",
        },
      },
      required: ["saved_item_id"],
    },
  },
  uploadFile: {
    name: "uploadFile",
    description: "Uploads a single file to the Gumloop platform",
    inputSchema: {
      type: "object",
      properties: {
        file_name: {
          type: "string",
          description: "The name of the file to be uploaded",
        },
        file_content: {
          type: "string",
          description: "Base64 encoded content of the file",
        },
        user_id: {
          type: "string",
          description: "The user ID associated with the file",
        },
        project_id: {
          type: "string",
          description: "The project ID associated with the file",
        },
      },
      required: ["file_name", "file_content"],
    },
  },
  uploadMultipleFiles: {
    name: "uploadMultipleFiles",
    description:
      "Uploads multiple files to the Gumloop platform in a single request",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              file_name: {
                type: "string",
                description: "The name of the file to be uploaded",
              },
              file_content: {
                type: "string",
                description: "Base64 encoded content of the file",
              },
            },
            required: ["file_name", "file_content"],
          },
          description: "Array of file objects to upload",
        },
        user_id: {
          type: "string",
          description: "The user ID associated with the files",
        },
        project_id: {
          type: "string",
          description: "The project ID associated with the files",
        },
      },
      required: ["files"],
    },
  },
  downloadFile: {
    name: "downloadFile",
    description: "Downloads a specific file from the Gumloop platform",
    inputSchema: {
      type: "object",
      properties: {
        file_name: {
          type: "string",
          description: "The name of the file to download",
        },
        run_id: {
          type: "string",
          description: "The ID of the flow run associated with the file",
        },
        saved_item_id: {
          type: "string",
          description: "The saved item ID associated with the file",
        },
        user_id: {
          type: "string",
          description: "The user ID associated with the flow run",
        },
        project_id: {
          type: "string",
          description: "The project ID associated with the flow run",
        },
      },
      required: ["file_name", "run_id", "saved_item_id"],
    },
  },
  downloadMultipleFiles: {
    name: "downloadMultipleFiles",
    description:
      "Downloads multiple files from the Gumloop platform as a zip archive",
    inputSchema: {
      type: "object",
      properties: {
        file_names: {
          type: "array",
          items: { type: "string" },
          description: "An array of file names to download",
        },
        run_id: {
          type: "string",
          description: "The ID of the flow run associated with the files",
        },
        user_id: {
          type: "string",
          description: "The user ID associated with the files",
        },
        project_id: {
          type: "string",
          description: "The project ID associated with the files",
        },
        saved_item_id: {
          type: "string",
          description: "The saved item ID associated with the files",
        },
      },
      required: ["file_names", "run_id"],
    },
  },
};

// Create and configure the MCP server
async function main() {
  const api = new GumloopAPI();

  const server = new Server(
    {
      name: "gumloop-mcp-server",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(TOOLS),
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const args = request.params.arguments as Record<string, unknown>;

      switch (request.params.name) {
        case "startAutomation": {
          const validatedArgs = StartAutomationSchema.parse(args);
          const result = await api.startAutomation(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "retrieveRunDetails": {
          const validatedArgs = RetrieveRunDetailsSchema.parse(args);
          const result = await api.retrieveRunDetails(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "listSavedFlows": {
          const validatedArgs = ListSavedFlowsSchema.parse(args);
          const result = await api.listSavedFlows(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "listWorkbooks": {
          const validatedArgs = ListWorkbooksSchema.parse(args);
          const result = await api.listWorkbooks(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "retrieveInputSchema": {
          const validatedArgs = RetrieveInputSchemaSchema.parse(args);
          const result = await api.retrieveInputSchema(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "uploadFile": {
          const validatedArgs = UploadFileSchema.parse(args);
          const result = await api.uploadFile(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "uploadMultipleFiles": {
          const validatedArgs = UploadMultipleFilesSchema.parse(args);
          const result = await api.uploadMultipleFiles(validatedArgs);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "downloadFile": {
          const validatedArgs = DownloadFileSchema.parse(args);
          const result = await api.downloadFile(validatedArgs);
          // For file downloads, we need to handle binary data differently
          // In a real implementation, you might want to encode this as base64 or handle it another way
          return {
            content: [
              {
                type: "text",
                text: "File downloaded successfully. Binary data is available but not displayed here.",
              },
            ],
          };
        }
        case "downloadMultipleFiles": {
          const validatedArgs = DownloadMultipleFilesSchema.parse(args);
          const result = await api.downloadMultipleFiles(validatedArgs);
          // For file downloads, we need to handle binary data differently
          return {
            content: [
              {
                type: "text",
                text: "Files downloaded successfully as a zip archive. Binary data is available but not displayed here.",
              },
            ],
          };
        }
        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${request.params.name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `API error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to start server:", error.message);
    } else {
      console.error("Failed to start server with unknown error");
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
