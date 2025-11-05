#!/usr/bin/env node
/**
 * Multi-Agent MCP Server
 * Model Context Protocol server for 42-body Multi-Agent System integration
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// 環境変数から Multi-Agent ベースパスを取得
const MULTI_AGENT_BASE = process.env.MULTI_AGENT_BASE ||
  '/Users/matsumototoshihiko/div/VSLMIYABI/VSLmeker/Multi-Agent';

/**
 * コマンド実行ヘルパー
 */
async function runCommand(command, cwd = MULTI_AGENT_BASE) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: { ...process.env, MULTI_AGENT_BASE }
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * ファイル読み込みヘルパー
 */
async function readFile(relativePath) {
  try {
    const fullPath = path.join(MULTI_AGENT_BASE, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * MCP Server 初期化
 */
const server = new Server(
  {
    name: 'multi-agent-integration',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * ツール一覧を返す
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'multi_agent_start',
        description: 'Start the Multi-Agent system with a given task',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Task description for the multi-agent system',
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'multi_agent_evaluate',
        description: 'Run the Evaluator to score multiple implementations',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'gwt_init',
        description: 'Initialize git worktrees for parallel execution',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of worktrees to create (default: 3)',
              default: 3,
            },
          },
        },
      },
      {
        name: 'gwt_run',
        description: 'Run tasks in parallel across worktrees using tmux',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target to run: "all" or specific worktree ID',
              default: 'all',
            },
          },
        },
      },
      {
        name: 'gwt_status',
        description: 'Get status of worktrees and tmux sessions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'gwt_merge',
        description: 'Merge the winner implementation to main branch',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Worktree ID to merge (auto-detect from winner.txt if not provided)',
            },
          },
        },
      },
      {
        name: 'gwt_cleanup',
        description: 'Clean up tmux sessions and worktrees',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'blackboard_read',
        description: 'Read Blackboard state, logs, or events',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['state', 'log', 'events', 'scoreboard', 'winner'],
              description: 'Type of data to read from Blackboard',
            },
          },
          required: ['type'],
        },
      },
    ],
  };
});

/**
 * ツール実行ハンドラー
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'multi_agent_start': {
        const result = await runCommand('python3 main_graph.py');
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `✅ Multi-Agent System Started\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'multi_agent_evaluate': {
        const result = await runCommand('python3 core/evaluator/main.py');

        // 評価結果を読み込む
        const scoreboardResult = await readFile('deliverable/reporting/scoreboard.json');
        const winnerResult = await readFile('deliverable/reporting/winner.txt');

        let output = result.success
          ? `✅ Evaluation Completed\n\n${result.stdout}\n\n`
          : `❌ Error: ${result.error}\n${result.stderr}\n\n`;

        if (scoreboardResult.success) {
          output += `📊 Scoreboard:\n${scoreboardResult.content}\n\n`;
        }

        if (winnerResult.success) {
          output += `🏆 Winner: ${winnerResult.content}`;
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'gwt_init': {
        const count = args.count || 3;
        const result = await runCommand(`./tools/gwt init ${count}`);
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `✅ Initialized ${count} worktrees\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'gwt_run': {
        const target = args.target || 'all';
        const result = await runCommand(`./tools/gwt run ${target}`);
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `✅ Started parallel execution on ${target}\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'gwt_status': {
        const result = await runCommand('./tools/gwt status');
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `📊 Status:\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'gwt_merge': {
        const id = args.id || '';
        const result = await runCommand(`./tools/gwt merge ${id}`);
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `✅ Merged successfully\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'gwt_cleanup': {
        const result = await runCommand('./tools/gwt cleanup');
        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `✅ Cleanup completed\n\n${result.stdout}`
                : `❌ Error: ${result.error}\n${result.stderr}`,
            },
          ],
        };
      }

      case 'blackboard_read': {
        const typeMap = {
          state: 'deliverable/reporting/blackboard_state.json',
          log: 'deliverable/reporting/blackboard_log.md',
          events: 'deliverable/reporting/blackboard_events.jsonl',
          scoreboard: 'deliverable/reporting/scoreboard.json',
          winner: 'deliverable/reporting/winner.txt',
        };

        const filePath = typeMap[args.type];
        const result = await readFile(filePath);

        return {
          content: [
            {
              type: 'text',
              text: result.success
                ? `📋 ${args.type}:\n\n${result.content}`
                : `❌ Error reading ${args.type}: ${result.error}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * サーバー起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Multi-Agent MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
