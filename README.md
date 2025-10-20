# Sentry API MCP Server 👋

A speedy and straightforward TypeScript MCP server 🚀 designed to provide a clean interface to the official Sentry REST API (https://docs.sentry.io/api/). This project serves as a lightweight, foundational alternative that complements the official sentry-mcp project (https://github.com/getsentry/sentry-mcp).

## Installation & Usage 🛠️

Let's get you set up!

### Getting Started

First things first, you'll need your Sentry credentials. You can set them up in two ways:

1.  **Environment Variables (Recommended)**:
    ```sh
    export SENTRY_HOST="https://your-sentry-host.com"
    export SENTRY_ACCESS_TOKEN="your-sentry-token"
    ```

2.  **Command-Line Arguments**: Pass the credentials directly using the `--host` and `--access-token` flags when you register the server.

🔑 Grab your access token from Sentry: `User Settings` > `API`.


### Configure MCP ⚙️

```json
{
  "mcpServers": {
    "sentry-api-mcp": {
      "command": "npx",
      "args": [
        "sentry-api-mcp"
      ],
      "env": {
        "SENTRY_HOST": "https://your-sentry-host.com",
        "SENTRY_ACCESS_TOKEN": "your-sentry-token"
      }
    }
  }
}
```

#### Add via CLI 💻

```bash
claude mcp add --transport stdio sentry-api-mcp npx sentry-api-mcp
```

```bash
claude mcp add --transport stdio sentry-api-mcp npx sentry-api-mcp -- --host "https://your-sentry-host.com" --access-token "your-sentry-token"
```

---

## Tools 🧰

Right now, we have a select set of tools ready for you:

- **listOrganizations**: See all the organizations you have access to.
- **listProjectIssues**: List the issues for a specific Sentry project.
- **getProjectEvent**: Get all the juicy details of a single event, stack trace included.


### Feature

All tools support a `fields` parameter for field-picking and have sensible default fields. This reduces the response payload and saves tokens. ✨


## Developer Guide 👩‍💻

Want to contribute or tinker with the code? Here’s how.

### 1. Setup

Clone the repository and install dependencies:
```bash
npm install
```

### 2. Running and Testing Locally 🚀

Fire it up for local testing:
```bash
claude mcp add --transport stdio sentry-api-mcp npm start -- --prefix "$(pwd)"
```

And see your local server in the list:
```bash
claude mcp list
```
