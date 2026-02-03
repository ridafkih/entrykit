import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image"; data: string; mimeType: "image/png" };
type Content = TextContent | ImageContent;

export interface ToolResult {
  [key: string]: unknown;
  isError?: boolean;
  content: Content[];
}

export interface CommandNode {
  description: string;
  children?: Record<string, CommandNode>;
  params?: z.ZodRawShape;
  handler?: (args: Record<string, unknown>, context: CommandContext) => Promise<ToolResult>;
}

export interface CommandContext {
  sessionId: string;
  generateCommandId: () => string;
  [key: string]: unknown;
}

export interface HierarchicalToolConfig {
  name: string;
  description: string;
  sessionParam?: string;
  tree: Record<string, CommandNode>;
  contextFactory?: (sessionId: string) => CommandContext;
}

interface ParsedCommand {
  path: string[];
  params: Record<string, string>;
}

/**
 * Parse a command string into path segments and named parameters.
 * Supports both key=value syntax and positional arguments.
 *
 * Examples:
 *   "element text selector=.title" -> { path: ["element", "text"], params: { selector: ".title" } }
 *   "interact click selector=.btn" -> { path: ["interact", "click"], params: { selector: ".btn" } }
 *   "nav goto url=https://example.com" -> { path: ["nav", "goto"], params: { url: "https://example.com" } }
 */
function parseCommand(input: string): ParsedCommand {
  const tokens = tokenize(input.trim());
  const path: string[] = [];
  const params: Record<string, string> = {};

  for (const token of tokens) {
    if (token.includes("=")) {
      const eqIndex = token.indexOf("=");
      const key = token.slice(0, eqIndex);
      const value = token.slice(eqIndex + 1);
      params[key] = value;
    } else if (Object.keys(params).length === 0) {
      // Only add to path if we haven't started collecting params
      path.push(token);
    }
  }

  return { path, params };
}

/**
 * Tokenize input, respecting quoted strings
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = "";
    } else if (char === " " && !inQuote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Format help text for a node's available subcommands
 */
function formatHelp(
  node: CommandNode | Record<string, CommandNode>,
  currentPath: string[],
): string {
  const children = "children" in node ? node.children : node;
  if (!children) return "";

  const pathStr = currentPath.length > 0 ? currentPath.join(" ") : "";
  const prefix = pathStr ? `${pathStr} ` : "";

  const lines: string[] = [];

  if (currentPath.length > 0) {
    lines.push(`**${pathStr}** commands:\n`);
  } else {
    lines.push("**Available categories:**\n");
  }

  for (const [name, child] of Object.entries(children)) {
    const hasChildren = child.children && Object.keys(child.children).length > 0;
    const hasHandler = !!child.handler;

    if (hasChildren && !hasHandler) {
      lines.push(`- \`${name}\`: ${child.description} (has subcommands)`);
    } else if (hasHandler && child.params) {
      const paramNames = Object.keys(child.params).join(" ");
      lines.push(`- \`${name} ${paramNames}\`: ${child.description}`);
    } else if (hasHandler) {
      lines.push(`- \`${name}\`: ${child.description}`);
    } else {
      lines.push(`- \`${name}\`: ${child.description}`);
    }
  }

  lines.push("");
  lines.push(`Use: \`${prefix}<command>\` to see more or execute`);

  return lines.join("\n");
}

function getChildren(
  node: CommandNode | Record<string, CommandNode>,
): Record<string, CommandNode> | undefined {
  // If it has a description, it's a CommandNode
  if ("description" in node) {
    return (node as CommandNode).children;
  }
  // Otherwise it's the root tree (Record<string, CommandNode>)
  return node as Record<string, CommandNode>;
}

/**
 * Navigate the command tree to find the target node
 */
function navigateTree(
  tree: Record<string, CommandNode>,
  path: string[],
): {
  node: CommandNode | Record<string, CommandNode>;
  remainingPath: string[];
  traversedPath: string[];
} {
  let current: CommandNode | Record<string, CommandNode> = tree;
  const traversedPath: string[] = [];

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!;
    const children = getChildren(current);

    if (!children || !(segment in children)) {
      return { node: current, remainingPath: path.slice(i), traversedPath };
    }

    current = children[segment]!;
    traversedPath.push(segment);
  }

  return { node: current, remainingPath: [], traversedPath };
}

/**
 * Validate parameters against a Zod schema
 */
function validateParams(
  params: Record<string, string>,
  schema: z.ZodRawShape,
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  const zodSchema = z.object(schema);

  // Convert string values to appropriate types based on schema
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const fieldSchema = schema[key];
    if (!fieldSchema) {
      converted[key] = value;
      continue;
    }

    // Try to infer type from schema and convert
    converted[key] = convertValue(value, fieldSchema);
  }

  const result = zodSchema.safeParse(converted);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }

  const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
  return { success: false, error: `Invalid parameters: ${issues}` };
}

/**
 * Convert a string value to the appropriate type based on schema
 */
function convertValue(value: string, schema: z.ZodRawShape[string]): unknown {
  // Access the internal Zod type info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zodDef = (schema as any)?._zod?.def;
  const schemaType = zodDef?.type as string | undefined;

  // Handle optional/nullable wrappers
  if (schemaType === "optional" || schemaType === "nullable") {
    const innerSchema = zodDef?.innerType;
    if (innerSchema) {
      return convertValue(value, innerSchema);
    }
  }

  if (schemaType === "number") {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  if (schemaType === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }

  if (schemaType === "array") {
    // Try to parse as JSON array, otherwise split by comma
    try {
      return JSON.parse(value);
    } catch {
      return value.split(",").map((v) => v.trim());
    }
  }

  if (schemaType === "object") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

function generateCommandId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create and register a hierarchical tool with the MCP server
 */
export function createHierarchicalTool(server: McpServer, config: HierarchicalToolConfig): void {
  const { name, description, tree, contextFactory } = config;

  server.registerTool(
    name,
    {
      description: `${description}. Run with no command to see available categories.`,
      inputSchema: {
        sessionId: z.string().describe("The session ID"),
        command: z
          .string()
          .optional()
          .describe("Command path and params, e.g., 'element text selector=.title'"),
      },
    },
    async (args) => {
      const { sessionId, command } = args as { sessionId: string; command?: string };

      // Create context for handlers
      const context: CommandContext = contextFactory
        ? contextFactory(sessionId)
        : { sessionId, generateCommandId };

      // If no command, show top-level categories
      if (!command || command.trim() === "") {
        return {
          content: [{ type: "text", text: formatHelp(tree, []) }],
        };
      }

      const parsed = parseCommand(command);
      const { node, remainingPath, traversedPath } = navigateTree(tree, parsed.path);

      // If we have remaining path segments, the command path is invalid
      if (remainingPath.length > 0) {
        const available = "children" in node ? Object.keys(node.children || {}) : Object.keys(node);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Unknown command: '${remainingPath[0]}' at path '${traversedPath.join(" ")}'\nAvailable: ${available.join(", ")}`,
            },
          ],
        };
      }

      // Check if this is a CommandNode with a handler
      if ("handler" in node && node.handler) {
        // This is an executable command
        const commandNode = node as CommandNode;
        const handler = commandNode.handler!;

        // Validate params if schema exists
        if (commandNode.params) {
          const validation = validateParams(parsed.params, commandNode.params);
          if (!validation.success) {
            return {
              isError: true,
              content: [{ type: "text", text: validation.error }],
            };
          }
          return handler(validation.data, context);
        }

        return handler(parsed.params, context);
      }

      // Node has children but no handler - show available subcommands
      if ("children" in node && node.children) {
        return {
          content: [{ type: "text", text: formatHelp(node, traversedPath) }],
        };
      }

      // This is the tree root level
      return {
        content: [{ type: "text", text: formatHelp(node, traversedPath) }],
      };
    },
  );
}

export { parseCommand, formatHelp, navigateTree, validateParams };
