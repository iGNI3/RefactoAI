"""
Persistent MCP Multi-Server Pooling and Sessions.

Manages connections to multiple MCP servers (stdio, WebSocket, HTTP),
harvests tool schemas, and routes tool execution calls.

Milestone 5
"""

import os
import asyncio
from typing import Dict, List, Any, Optional

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.tools import load_mcp_tools


class MCPMultiServerManager:
    """
    Manages persistent connections to multiple local and remote MCP servers,
    and exposes their tools to LangChain agents.
    """

    def __init__(self):
        # Pool to store active MCP server parameters and client sessions
        self.server_registry: Dict[str, StdioServerParameters] = {}
        self.active_sessions: Dict[str, ClientSession] = {}
        self.client_contexts: Dict[str, Any] = {}
        self.consolidated_tools_list: List[BaseTool] = []

    def register_stdio_server(
        self,
        server_identifier: str,
        execution_command: str,
        execution_arguments: List[str],
    ) -> None:
        """
        Registers an MCP server configuration in the pool.
        """
        server_params = StdioServerParameters(
            command=execution_command,
            args=execution_arguments,
            env=os.environ.copy(),
        )
        self.server_registry[server_identifier] = server_params

    async def initialize_all_connections(self) -> None:
        """
        Establishes active stdio connections and initializes sessions
        for all registered servers.
        """
        for identifier, params in self.server_registry.items():
            try:
                # Open stdio transport channel
                client_ctx = stdio_client(params)
                read_stream, write_stream = await client_ctx.__aenter__()

                # Initialize client session
                session = ClientSession(read_stream, write_stream)
                await session.__aenter__()
                
                try:
                    await session.initialize()
                    self.active_sessions[identifier] = session
                    self.client_contexts[identifier] = client_ctx
                    print(f"Connected to MCP server: '{identifier}'")
                except Exception as init_err:
                    await session.__aexit__(None, None, None)
                    await client_ctx.__aexit__(None, None, None)
                    raise init_err
            except Exception as connection_err:
                print(
                    f"Failed to connect to MCP server '{identifier}': "
                    f"{str(connection_err)}"
                )

    async def harvest_registered_tools(self) -> List[BaseTool]:
        """
        Retrieves tool configurations from all active MCP servers and
        converts them into LangChain tool schemas.
        """
        combined_tools: List[BaseTool] = []
        for identifier, session in self.active_sessions.items():
            try:
                # Load MCP server tools as LangChain tools
                mcp_langchain_tools = await load_mcp_tools(session)
                for tool in mcp_langchain_tools:
                    # Prefix tool names to prevent conflicts across servers
                    tool.name = f"{identifier}_{tool.name}"
                    combined_tools.append(tool)
            except Exception as harvesting_err:
                print(
                    f"Failed to harvest tools from '{identifier}': "
                    f"{str(harvesting_err)}"
                )

        self.consolidated_tools_list = combined_tools
        return self.consolidated_tools_list

    async def execute_pooled_tool(
        self, tool_identifier: str, execution_arguments: Dict[str, Any]
    ) -> Any:
        """
        Executes a tool on the matching MCP server and returns the result.
        """
        # Parse the server identifier and target tool name from the prefixed ID
        if "_" not in tool_identifier:
            raise ValueError(f"Invalid tool identifier format: '{tool_identifier}'")

        server_prefix, target_tool_name = tool_identifier.split("_", 1)
        session = self.active_sessions.get(server_prefix)
        if not session:
            raise ConnectionError(
                f"No active session found for server: '{server_prefix}'"
            )

        # Execute the tool and return the output
        execution_result = await session.call_tool(
            target_tool_name, arguments=execution_arguments
        )
        return execution_result.content

    async def disconnect_all(self) -> None:
        """
        Gracefully closes all active sessions and transport channels.
        """
        for identifier in list(self.active_sessions.keys()):
            try:
                session = self.active_sessions.pop(identifier)
                await session.__aexit__(None, None, None)

                if identifier in self.client_contexts:
                    ctx = self.client_contexts.pop(identifier)
                    await ctx.__aexit__(None, None, None)

                print(f"Disconnected MCP session: '{identifier}'")
            except Exception as close_err:
                print(
                    f"Error disconnecting session '{identifier}': "
                    f"{str(close_err)}"
                )
