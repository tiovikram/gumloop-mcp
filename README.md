# Gumloop MCP Server

MCP Server for Gumloop's API, enabling AI models to manage and execute automations through a standardized interface.

## Features

- **Flow Management**: Start automations and monitor their execution status
- **Workspace Discovery**: List available workbooks and saved automation flows
- **Input Schema Retrieval**: Get detailed information about required inputs for flows
- **File Operations**: Upload and download files used in automations
- **Context-Aware Execution**: Run automations with input parameters specific to user needs

## Tools

### `startAutomation`

Initiates a new flow run for a specific saved automation.

**Inputs:**
- `user_id` (string): The ID for the user initiating the flow
- `saved_item_id` (string): The ID for the saved flow
- `project_id` (string, optional): The ID of the project within which the flow is executed
- `pipeline_inputs` (array, optional): List of inputs for the flow
  - `input_name` (string): The 'input_name' parameter from your Input node
  - `value` (string): The value to be passed to the Input node

**Returns:** Response with run details including run_id, saved_item_id, workbook_id and URL

### `retrieveRunDetails`

Retrieves details about a specific flow run.

**Inputs:**
- `run_id` (string): ID of the flow run to retrieve
- `user_id` (string, optional): The ID for the user initiating the flow
- `project_id` (string, optional): The ID of the project within which the flow is executed

**Returns:** Response with run details including state, outputs, timestamps, and logs

### `listSavedFlows`

Retrieves a list of all saved flows for a user or project.

**Inputs:**
- `user_id` (string, optional): The user ID for which to list items
- `project_id` (string, optional): The project ID for which to list items

**Returns:** Response with list of saved flows and their metadata

### `listWorkbooks`

Retrieves a list of all workbooks and their associated saved flows.

**Inputs:**
- `user_id` (string, optional): The user ID for which to list workbooks
- `project_id` (string, optional): The project ID for which to list workbooks

**Returns:** Response with list of workbooks and their associated saved flows

### `retrieveInputSchema`

Retrieves the input schema for a specific saved flow.

**Inputs:**
- `saved_item_id` (string): The ID of the saved item for which to retrieve input schemas
- `user_id` (string, optional): User ID that created the flow
- `project_id` (string, optional): Project ID that the flow is under

**Returns:** Response with list of input parameters for the flow

### `uploadFile`

Uploads a single file to the Gumloop platform.

**Inputs:**
- `file_name` (string): The name of the file to be uploaded
- `file_content` (string): Base64 encoded content of the file
- `user_id` (string, optional): The user ID associated with the file
- `project_id` (string, optional): The project ID associated with the file

**Returns:** Response with success status and file name

### `uploadMultipleFiles`

Uploads multiple files to the Gumloop platform in a single request.

**Inputs:**
- `files` (array): Array of file objects to upload
  - `file_name` (string): The name of the file to be uploaded
  - `file_content` (string): Base64 encoded content of the file
- `user_id` (string, optional): The user ID associated with the files
- `project_id` (string, optional): The project ID associated with the files

**Returns:** Response with success status and list of uploaded file names

### `downloadFile`

Downloads a specific file from the Gumloop platform.

**Inputs:**
- `file_name` (string): The name of the file to download
- `run_id` (string): The ID of the flow run associated with the file
- `saved_item_id` (string): The saved item ID associated with the file
- `user_id` (string, optional): The user ID associated with the flow run
- `project_id` (string, optional): The project ID associated with the flow run

**Returns:** The requested file content

### `downloadMultipleFiles`

Downloads multiple files from the Gumloop platform as a zip archive.

**Inputs:**
- `file_names` (array): An array of file names to download
- `run_id` (string): The ID of the flow run associated with the files
- `user_id` (string, optional): The user ID associated with the files
- `project_id` (string, optional): The project ID associated with the files
- `saved_item_id` (string, optional): The saved item ID associated with the files

**Returns:** Zip file containing the requested files

## Setup

### API Key

Create a Gumloop API key with access to the required features:

1. Go to [Gumloop Workspace Settings](https://www.gumloop.com/profile#Credentials)
2. Generate a new API key
3. Copy the generated key

### Usage with Claude Desktop

To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

#### Using NPX

```json
{
  "mcpServers": {
    "gumloop": {
      "command": "npx",
      "args": [
        "-y",
        "gumloop-mcp-server"
      ],
      "env": {
        "GUMLOOP_API_KEY": "<YOUR_GUMLOOP_API_KEY>"
      }
    }
  }
}
```

#### Using Docker

```json
{
  "mcpServers": {
    "gumloop": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GUMLOOP_API_KEY",
        "gumloop-mcp-server"
      ],
      "env": {
        "GUMLOOP_API_KEY": "<YOUR_GUMLOOP_API_KEY>"
      }
    }
  }
}
```

## Examples

### Starting an Automation

```javascript
// Start a saved automation flow
const result = await agent.callTool("startAutomation", {
  user_id: "user123",
  saved_item_id: "flow456",
  pipeline_inputs: [
    {
      input_name: "search_query",
      value: "AI automation trends 2025"
    }
  ]
});
```

### Checking Run Status

```javascript
// Check the status of a running automation
const result = await agent.callTool("retrieveRunDetails", {
  run_id: "run789",
  user_id: "user123"
});
```

### Listing Available Flows

```javascript
// Get all saved flows for a user
const result = await agent.callTool("listSavedFlows", {
  user_id: "user123"
});
```

### Working with Files

```javascript
// Upload a file to be used in an automation
const result = await agent.callTool("uploadFile", {
  user_id: "user123",
  file_name: "data.csv",
  file_content: "base64EncodedFileContent..."
});
```

## Response Format

The server returns Gumloop API responses in JSON format. Here's an example for retrieving run details:

```json
{
  "user_id": "user123",
  "state": "RUNNING",
  "outputs": {},
  "created_ts": "2023-11-07T05:31:56Z",
  "finished_ts": null,
  "log": [
    "Starting automation flow...",
    "Processing input parameters...",
    "Executing node 1: Web Scraper..."
  ]
}
```

## Limitations

- API calls are subject to Gumloop's rate limits and usage quotas
- File uploads are limited to the maximum size allowed by Gumloop's API
- Some features may require specific subscription tiers
- The server requires a valid Gumloop API key with appropriate permissions

## Build

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Start the server
pnpm start
```

## License

This MCP server is licensed under the MIT License.
