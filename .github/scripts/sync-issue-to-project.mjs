import fs from "node:fs";

const projectToken = process.env.GH_PROJECT_TOKEN;
const repoToken = process.env.GH_REPO_TOKEN;
const projectOwner = process.env.PROJECT_OWNER || "vivek2310sharma";
const projectTitle = process.env.PROJECT_TITLE || "FairSwap-Web";
const repository = process.env.REPOSITORY || "vivek2310sharma/FairSwap-Web";
const apiVersion = "2026-03-10";

if (!projectToken) throw new Error("GH_PROJECT_TOKEN is required.");
if (!repoToken) throw new Error("GH_REPO_TOKEN is required.");

const [repoOwner, repoName] = repository.split("/");

async function http(url, token, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": apiVersion,
      "User-Agent": "FairSwap-Web-issue-project-sync",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    throw new Error(`${method} ${url} failed (${response.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }
  return payload;
}

async function graphql(query, variables = {}) {
  const payload = await http("https://api.github.com/graphql", projectToken, {
    method: "POST",
    body: { query, variables },
  });
  if (payload.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

function parseMetadata(body = "") {
  const match = body.match(/<!--\s*fair-project\s*([\s\S]*?)-->/i);
  if (!match) return {};
  const metadata = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return metadata;
}

async function loadIssue() {
  let issueNumber = Number(process.env.ISSUE_NUMBER || 0);
  let eventIssue = null;
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    eventIssue = event.issue || null;
    if (!issueNumber && eventIssue?.number) issueNumber = eventIssue.number;
  }
  if (!issueNumber) throw new Error("ISSUE_NUMBER could not be resolved.");
  if (eventIssue?.number === issueNumber && eventIssue.node_id) return eventIssue;
  return http(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, repoToken);
}

async function loadProject() {
  const data = await graphql(`query($login: String!) {
    user(login: $login) {
      projectsV2(first: 100) {
        nodes {
          id number title
          fields(first: 100) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField {
                id name options { id name }
              }
            }
          }
        }
      }
    }
  }`, { login: projectOwner });
  const matches = data.user?.projectsV2?.nodes?.filter((p) => p.title === projectTitle) || [];
  if (matches.length !== 1) throw new Error(`Expected one project named ${projectTitle}; found ${matches.length}.`);
  return matches[0];
}

async function findOrAddItem(project, issueNodeId) {
  try {
    const data = await graphql(`mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`, { projectId: project.id, contentId: issueNodeId });
    return data.addProjectV2ItemById.item.id;
  } catch (error) {
    const message = String(error?.message || error);
    if (!/already exists|already been added|existing/i.test(message)) throw error;
  }

  const data = await graphql(`query($login: String!, $projectNumber: Int!, $issueNumber: Int!, $repoOwner: String!, $repoName: String!) {
    user(login: $login) {
      projectV2(number: $projectNumber) {
        items(first: 100) {
          nodes {
            id
            content {
              __typename
              ... on Issue { number repository { nameWithOwner } }
            }
          }
        }
      }
    }
  }`, {
    login: projectOwner,
    projectNumber: project.number,
    issueNumber: Number(process.env.ISSUE_NUMBER),
    repoOwner,
    repoName,
  });
  const item = data.user.projectV2.items.nodes.find((node) =>
    node.content?.__typename === "Issue" &&
    node.content.number === Number(process.env.ISSUE_NUMBER) &&
    node.content.repository?.nameWithOwner === repository
  );
  if (!item) throw new Error("Issue appears to be in the project but its project item could not be resolved in the first 100 items.");
  return item.id;
}

async function setSingleSelect(project, itemId, fieldName, optionName) {
  if (!optionName) return;
  const field = project.fields.nodes.find((node) => node?.__typename === "ProjectV2SingleSelectField" && node.name === fieldName);
  if (!field) throw new Error(`Project field not found: ${fieldName}`);
  const option = field.options.find((candidate) => candidate.name === optionName);
  if (!option) throw new Error(`Option ${optionName} not found in field ${fieldName}`);
  await graphql(`mutation($input: UpdateProjectV2ItemFieldValueInput!) {
    updateProjectV2ItemFieldValue(input: $input) { projectV2Item { id } }
  }`, {
    input: {
      projectId: project.id,
      itemId,
      fieldId: field.id,
      value: { singleSelectOptionId: option.id },
    },
  });
  console.log(`Set ${fieldName}: ${optionName}`);
}

async function main() {
  const issue = await loadIssue();
  process.env.ISSUE_NUMBER = String(issue.number);
  const metadata = parseMetadata(issue.body || "");
  if (!Object.keys(metadata).length) {
    console.log(`Issue #${issue.number} has no fair-project metadata; nothing to sync.`);
    return;
  }

  const project = await loadProject();
  const itemId = await findOrAddItem(project, issue.node_id);
  console.log(`Synced issue #${issue.number} to ${project.title}.`);

  for (const fieldName of ["Status", "Work Type", "Priority", "Area", "Environment", "Phase", "Severity"]) {
    await setSingleSelect(project, itemId, fieldName, metadata[fieldName]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
