#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const JIRA_URL = process.env.JIRA_URL;
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const CONFLUENCE_URL = process.env.CONFLUENCE_URL;
const CONFLUENCE_TOKEN = process.env.CONFLUENCE_TOKEN;

// CC(Participant) 커스텀 필드 ID. Vuno Jira 기본값: customfield_10404 (multiuserpicker)
const JIRA_CC_FIELD = process.env.JIRA_CC_FIELD || "customfield_10404";

if (!JIRA_URL || !JIRA_TOKEN || !CONFLUENCE_URL || !CONFLUENCE_TOKEN) {
  console.error("❌ 에러: .env 파일에 필요한 환경 변수가 없습니다.");
  console.error("   필요: JIRA_URL, JIRA_TOKEN, CONFLUENCE_URL, CONFLUENCE_TOKEN");
  process.exit(1);
}

// [FIX 1] Basic auth(placeholder) → Bearer 토큰으로 변경
const jiraClient = axios.create({
  baseURL: JIRA_URL,
  headers: {
    "Authorization": `Bearer ${JIRA_TOKEN}`,
    "Content-Type": "application/json",
  },
});

const confluenceClient = axios.create({
  baseURL: CONFLUENCE_URL,
  headers: {
    "Authorization": `Bearer ${CONFLUENCE_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Initialize MCP Server
const server = new McpServer({
  name: "vuno-jira-confluence",
  version: "1.0.0",
});

// ==================== JIRA TOOLS ====================

// Tool: jira_get_projects
// [FIX 2] server.tool() → server.registerTool(), inputSchema를 ZodRawShape으로 변경
// [FIX 3] /rest/api/3/ → /rest/api/2/ (온프레미스 Data Center)
server.registerTool(
  "jira_get_projects",
  {
    description: "Jira의 모든 프로젝트 목록을 조회합니다.",
    inputSchema: {},
  },
  async () => {
    try {
      const response = await jiraClient.get("/rest/api/2/project");
      const projects = response.data.map((p) => ({
        key: p.key,
        name: p.name,
        type: p.projectTypeKey,
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: jira_search_issues
server.registerTool(
  "jira_search_issues",
  {
    description:
      "Jira에서 이슈를 검색합니다. JQL(Jira Query Language)을 사용하여 검색합니다.",
    inputSchema: {
      jql: z.string().describe("JQL 쿼리 (예: 'project = PROJ AND status = Open')"),
      maxResults: z.number().optional().describe("반환할 최대 이슈 개수 (기본값: 50)"),
    },
  },
  async (args) => {
    try {
      const response = await jiraClient.get("/rest/api/2/search", {
        params: {
          jql: args.jql,
          maxResults: args.maxResults || 50,
        },
      });
      const issues = response.data.issues.map((issue) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        assignee: issue.fields.assignee?.displayName,
      }));
      return {
        content: [
          {
            type: "text",
            text: `검색 결과: ${issues.length}개 이슈\n\n${JSON.stringify(
              issues,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: jira_get_issue
server.registerTool(
  "jira_get_issue",
  {
    description: "Jira 이슈의 상세 정보를 조회합니다.",
    inputSchema: {
      issueKey: z.string().describe("이슈 키 (예: 'PROJ-123')"),
    },
  },
  async (args) => {
    try {
      const response = await jiraClient.get(`/rest/api/2/issue/${args.issueKey}`);
      const issue = response.data;
      const f = issue.fields || {};
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                key: issue.key,
                summary: f.summary,
                description: f.description,
                issuetype: f.issuetype?.name,
                status: f.status?.name,
                assignee: f.assignee?.displayName,
                reporter: f.reporter?.displayName,
                priority: f.priority?.name,
                labels: f.labels,
                components: (f.components || []).map((c) => c.name),
                fixVersions: (f.fixVersions || []).map((v) => v.name),
                parent: f.parent ? { key: f.parent.key, summary: f.parent.fields?.summary } : null,
                subtasks: (f.subtasks || []).map((s) => ({
                  key: s.key,
                  summary: s.fields?.summary,
                  status: s.fields?.status?.name,
                })),
                issuelinks: (f.issuelinks || []).map((l) => ({
                  type: l.type?.name,
                  inward: l.inwardIssue?.key,
                  outward: l.outwardIssue?.key,
                })),
                cc: (f[JIRA_CC_FIELD] || []).map((u) => u.name),
                created: f.created,
                updated: f.updated,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Helper: build a Jira fields payload from common optional args.
// Only attaches keys when the caller provided a value — Jira DC rejects
// undefined/null for many fields with HTTP 400.
// 호출자가 description 에 실제 개행 대신 리터럴 "\n"/"\r\n"/"\r"/"\t" 두 글자를
// 보내는 경우를 대비한 안전망. 진짜 개행이면 그대로 통과.
function normalizeMultiline(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t");
}

function buildJiraFields(args) {
  const fields = {};
  if (args.summary !== undefined) fields.summary = args.summary;
  if (args.description !== undefined) fields.description = normalizeMultiline(args.description);
  if (args.parent) fields.parent = { key: args.parent };
  if (args.assignee) fields.assignee = { name: args.assignee };
  if (args.reporter) fields.reporter = { name: args.reporter };
  if (args.priority) fields.priority = { name: args.priority };
  if (args.labels) fields.labels = args.labels;
  if (args.components) fields.components = args.components.map((name) => ({ name }));
  if (args.fixVersions) fields.fixVersions = args.fixVersions.map((name) => ({ name }));
  if (args.dueDate) fields.duedate = args.dueDate;
  return fields;
}

function errorText(error) {
  const data = error.response?.data;
  const detail = data ? `\n${JSON.stringify(data)}` : "";
  return `에러: ${error.message}${detail}`;
}

// Tool: jira_create_issue
server.registerTool(
  "jira_create_issue",
  {
    description:
      "Jira에 새로운 이슈를 생성합니다. Sub-task의 경우 parent(부모 이슈 키)가 필수입니다.",
    inputSchema: {
      project: z.string().describe("프로젝트 키 (예: 'PROJ')"),
      issueType: z.string().describe("이슈 타입 (Bug, Task, Story, Sub-task 등)"),
      summary: z.string().describe("이슈 제목"),
      description: z.string().optional().describe("이슈 설명"),
      parent: z.string().optional().describe("부모 이슈 키 (Sub-task 생성 시 필수)"),
      assignee: z.string().optional().describe("담당자 username"),
      reporter: z.string().optional().describe("보고자 username"),
      priority: z.string().optional().describe("우선순위 이름 (예: High)"),
      labels: z.array(z.string()).optional().describe("라벨 목록"),
      components: z.array(z.string()).optional().describe("컴포넌트 이름 목록"),
      fixVersions: z.array(z.string()).optional().describe("수정 버전 이름 목록"),
      dueDate: z.string().optional().describe("마감일 YYYY-MM-DD"),
      cc: z.array(z.string()).optional().describe("CC(Participant)로 등록할 username 목록"),
    },
  },
  async (args) => {
    const isSubtask = /sub-?task/i.test(args.issueType);
    if (isSubtask && !args.parent) {
      return {
        content: [
          {
            type: "text",
            text: "에러: Sub-task 생성에는 parent(부모 이슈 키)가 필요합니다.",
          },
        ],
        isError: true,
      };
    }
    try {
      const fields = {
        project: { key: args.project },
        issuetype: { name: args.issueType },
        ...buildJiraFields(args),
      };
      if (fields.description === undefined) fields.description = "";
      if (Array.isArray(args.cc) && args.cc.length > 0) {
        fields[JIRA_CC_FIELD] = args.cc.map((name) => ({ name }));
      }
      const response = await jiraClient.post("/rest/api/2/issue", { fields });
      const issueKey = response.data.key;
      const ccText = args.cc?.length ? `\nCC: ${args.cc.join(", ")}` : "";
      return {
        content: [
          {
            type: "text",
            text: `✅ 이슈가 생성되었습니다: ${issueKey}${ccText}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_update_issue
server.registerTool(
  "jira_update_issue",
  {
    description: "기존 Jira 이슈의 필드를 업데이트합니다.",
    inputSchema: {
      issueKey: z.string().describe("이슈 키"),
      summary: z.string().optional(),
      description: z.string().optional(),
      parent: z.string().optional().describe("부모 이슈 키 (Sub-task 부모 변경)"),
      assignee: z.string().optional(),
      reporter: z.string().optional(),
      priority: z.string().optional(),
      labels: z.array(z.string()).optional(),
      components: z.array(z.string()).optional(),
      fixVersions: z.array(z.string()).optional(),
      dueDate: z.string().optional(),
    },
  },
  async (args) => {
    try {
      const fields = buildJiraFields(args);
      if (Object.keys(fields).length === 0) {
        return {
          content: [{ type: "text", text: "에러: 업데이트할 필드가 없습니다." }],
          isError: true,
        };
      }
      await jiraClient.put(`/rest/api/2/issue/${args.issueKey}`, { fields });
      return {
        content: [{ type: "text", text: `✅ ${args.issueKey} 업데이트 완료` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_transition_issue
server.registerTool(
  "jira_transition_issue",
  {
    description:
      "Jira 이슈의 상태를 전환합니다. transitionId 또는 transitionName 중 하나를 지정합니다.",
    inputSchema: {
      issueKey: z.string(),
      transitionId: z.string().optional(),
      transitionName: z.string().optional().describe("전환 이름 (예: 'Done')"),
      comment: z.string().optional(),
    },
  },
  async (args) => {
    try {
      let id = args.transitionId;
      if (!id) {
        if (!args.transitionName) {
          return {
            content: [
              {
                type: "text",
                text: "에러: transitionId 또는 transitionName 이 필요합니다.",
              },
            ],
            isError: true,
          };
        }
        const meta = await jiraClient.get(
          `/rest/api/2/issue/${args.issueKey}/transitions`
        );
        const match = (meta.data.transitions || []).find(
          (t) => t.name.toLowerCase() === args.transitionName.toLowerCase()
        );
        if (!match) {
          const names = (meta.data.transitions || []).map((t) => t.name).join(", ");
          return {
            content: [
              {
                type: "text",
                text: `에러: '${args.transitionName}' 전환을 찾을 수 없습니다. 가능: ${names}`,
              },
            ],
            isError: true,
          };
        }
        id = match.id;
      }
      const body = { transition: { id } };
      if (args.comment) {
        body.update = { comment: [{ add: { body: args.comment } }] };
      }
      await jiraClient.post(`/rest/api/2/issue/${args.issueKey}/transitions`, body);
      return {
        content: [{ type: "text", text: `✅ ${args.issueKey} 상태 전환 완료` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_add_comment
server.registerTool(
  "jira_add_comment",
  {
    description: "Jira 이슈에 코멘트를 추가합니다.",
    inputSchema: {
      issueKey: z.string(),
      body: z.string().describe("코멘트 본문"),
    },
  },
  async (args) => {
    try {
      const res = await jiraClient.post(
        `/rest/api/2/issue/${args.issueKey}/comment`,
        { body: args.body }
      );
      return {
        content: [
          {
            type: "text",
            text: `✅ 코멘트 추가 완료 (id=${res.data.id})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_link_issues
server.registerTool(
  "jira_link_issues",
  {
    description: "두 Jira 이슈 사이에 링크를 생성합니다.",
    inputSchema: {
      inwardIssue: z.string().describe("inward 이슈 키"),
      outwardIssue: z.string().describe("outward 이슈 키"),
      linkType: z.string().describe("링크 타입 이름 (예: Relates, Blocks, Duplicate)"),
    },
  },
  async (args) => {
    try {
      await jiraClient.post(`/rest/api/2/issueLink`, {
        type: { name: args.linkType },
        inwardIssue: { key: args.inwardIssue },
        outwardIssue: { key: args.outwardIssue },
      });
      return {
        content: [
          {
            type: "text",
            text: `✅ 링크 생성: ${args.inwardIssue} -[${args.linkType}]-> ${args.outwardIssue}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_add_watcher
server.registerTool(
  "jira_add_watcher",
  {
    description: "Jira 이슈에 워처(지켜보는 사람)를 추가합니다. CC(Participant)와는 다른 개념이며, CC 추가는 jira_add_participant 를 사용하세요.",
    inputSchema: {
      issueKey: z.string(),
      username: z.string().describe("추가할 사용자의 username"),
    },
  },
  async (args) => {
    try {
      // DC API 스펙: body 는 JSON 문자열(따옴표 포함된 username)
      await jiraClient.post(
        `/rest/api/2/issue/${args.issueKey}/watchers`,
        JSON.stringify(args.username),
        { headers: { "Content-Type": "application/json" } }
      );
      return {
        content: [
          {
            type: "text",
            text: `✅ ${args.issueKey} 워처 추가: ${args.username}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_add_participant
server.registerTool(
  "jira_add_participant",
  {
    description:
      "Jira 이슈에 CC(Participant) 를 추가합니다. 기존 CC 는 보존되며, 중복은 자동 제거됩니다. 워처 추가는 jira_add_watcher 를 사용하세요.",
    inputSchema: {
      issueKey: z.string(),
      usernames: z.array(z.string()).describe("CC 로 추가할 username 목록"),
    },
  },
  async (args) => {
    try {
      const cur = await jiraClient.get(
        `/rest/api/2/issue/${args.issueKey}?fields=${JIRA_CC_FIELD}`
      );
      const existing = (cur.data.fields?.[JIRA_CC_FIELD] || []).map((u) => u.name);
      const merged = Array.from(new Set([...existing, ...args.usernames]));
      await jiraClient.put(`/rest/api/2/issue/${args.issueKey}`, {
        fields: { [JIRA_CC_FIELD]: merged.map((name) => ({ name })) },
      });
      return {
        content: [
          {
            type: "text",
            text: `✅ ${args.issueKey} CC 추가: ${args.usernames.join(", ")}\n현재 CC: ${merged.join(", ")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// Tool: jira_get_create_meta
server.registerTool(
  "jira_get_create_meta",
  {
    description:
      "프로젝트/이슈타입의 생성 메타데이터(허용 필드, 컴포넌트, 우선순위 등)를 조회합니다.",
    inputSchema: {
      projectKey: z.string(),
      issueTypeName: z.string().optional(),
    },
  },
  async (args) => {
    try {
      const params = {
        projectKeys: args.projectKey,
        expand: "projects.issuetypes.fields",
      };
      if (args.issueTypeName) params.issuetypeNames = args.issueTypeName;
      const res = await jiraClient.get("/rest/api/2/issue/createmeta", { params });
      return {
        content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: errorText(error) }],
        isError: true,
      };
    }
  }
);

// ==================== CONFLUENCE TOOLS ====================

// Tool: confluence_search
// [FIX 4] /wiki/api/v2/search → /rest/api/content/search (온프레미스 Data Center)
server.registerTool(
  "confluence_search",
  {
    description: "Confluence에서 콘텐츠를 검색합니다.",
    inputSchema: {
      text: z.string().describe("검색어"),
      maxResults: z.number().optional().describe("반환할 최대 결과 개수 (기본값: 25)"),
    },
  },
  async (args) => {
    try {
      const response = await confluenceClient.get("/rest/api/content/search", {
        params: {
          cql: `text ~ "${args.text}"`,
          limit: args.maxResults || 25,
        },
      });
      const results = response.data.results.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        url: item._links?.webui,
      }));
      return {
        content: [
          {
            type: "text",
            text: `검색 결과: ${results.length}개\n\n${JSON.stringify(
              results,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: confluence_get_page
// [FIX 4] /wiki/api/v2/pages/{id} → /rest/api/content/{id}
server.registerTool(
  "confluence_get_page",
  {
    description: "Confluence 페이지의 상세 내용을 조회합니다.",
    inputSchema: {
      pageId: z.string().describe("페이지 ID"),
    },
  },
  async (args) => {
    try {
      const response = await confluenceClient.get(
        `/rest/api/content/${args.pageId}`,
        {
          params: {
            expand: "body.storage,version,space",
          },
        }
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: response.data.id,
                title: response.data.title,
                type: response.data.type,
                space: response.data.space?.name,
                version: response.data.version?.number,
                createdDate: response.data.history?.createdDate,
                lastUpdated: response.data.version?.when,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: confluence_get_spaces
// [FIX 4] /wiki/api/v2/spaces → /rest/api/space
server.registerTool(
  "confluence_get_spaces",
  {
    description: "Confluence의 모든 스페이스를 조회합니다.",
    inputSchema: {
      maxResults: z.number().optional().describe("반환할 최대 스페이스 개수 (기본값: 50)"),
    },
  },
  async (args) => {
    try {
      const response = await confluenceClient.get("/rest/api/space", {
        params: {
          limit: args.maxResults || 50,
        },
      });
      const spaces = response.data.results.map((space) => ({
        key: space.key,
        name: space.name,
        type: space.type,
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(spaces, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `에러: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ Jira/Confluence MCP server running on stdio");
}

main().catch((error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});
