# Ideas

This document contains ideas that may become part of ProbeX in the future.

Ideas in this document are intentionally not commitments.
They may change, be redesigned, or be discarded.

---

## CLI

### Problem

Setting up ProbeX on a server and connecting it to applications requires manual work.

### Idea

Provide a CLI as the main entry point for installing and operating ProbeX.

The CLI installs the ProbeX server on a host. The server connects to applications through SDK connectors and provides the interface users work with.

Possible capabilities:

- install and upgrade the ProbeX server
- connect applications through SDK connectors
- check connection status of applications
- open the web UI

## MCP Server

### Problem

AI agents cannot inspect a live application's runtime state. They can only reason about source code, logs, and whatever the user pastes into the conversation.

### Idea

Expose ProbeX through an MCP server, so local AI agents (Claude Code, Codex, etc.) can connect to running applications, set breakpoints, and get runtime data back to analyze.

Possible capabilities:

- list connected applications
- set and remove breakpoints
- list active breakpoints
- capture snapshots of variables and stack traces
- return captured data to the agent for analysis
