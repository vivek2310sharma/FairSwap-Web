const token = process.env.GH_PROJECT_TOKEN;
const owner = process.env.PROJECT_OWNER || "vivek2310sharma";
const projectTitle = process.env.PROJECT_TITLE || "FairSwap-Web";
const apiVersion = "2026-03-10";

if (!token) throw new Error("GH_PROJECT_TOKEN is required. Configure FAIRSWAP_PROJECT_TOKEN.");

const fieldsWanted = [
  ["Status", [
    ["Inbox", "GRAY", "New work that has not yet been triaged."],
    ["Triage", "YELLOW", "Needs review, clarification, or prioritization."],
    ["Ready", "BLUE", "Ready to be picked up."],
    ["In Progress", "PURPLE", "Actively being worked on."],
    ["Testing", "PINK", "Implementation is complete and awaiting verification."],
    ["Blocked", "RED", "Cannot proceed until a dependency or issue is resolved."],
    ["Done", "GREEN", "Completed and verified."],
  ]],
  ["Work Type", [
    ["Bug", "RED", "A defect in existing behavior."],
    ["Feature", "BLUE", "New user or product capability."],
    ["Enhancement", "GREEN", "Improvement to existing behavior."],
    ["UX", "PURPLE", "User experience or usability work."],
    ["Security", "ORANGE", "Security, abuse prevention, or access-control work."],
    ["Infrastructure", "GRAY", "Hosting, CI/CD, database, DNS, or platform work."],
    ["Admin", "PINK", "Administrator or moderation tooling work."],
    ["Content", "YELLOW", "Copy, policy, SEO content, or documentation."],
  ]],
  ["Priority", [
    ["P0", "RED", "Critical: immediate action required."],
    ["P1", "ORANGE", "High: address before the next release gate."],
    ["P2", "YELLOW", "Medium: important but not currently blocking."],
    ["P3", "GRAY", "Low: useful improvement or future work."],
  ]],
  ["Area", [
    ["Auth", "BLUE", "Sign-in, sign-up, MFA, sessions, and authorization."],
    ["Profile", "PURPLE", "User profiles and account settings."],
    ["Listings", "GREEN", "Listing creation, editing, lifecycle, and detail pages."],
    ["Search", "YELLOW", "Search, discovery, filters, and result quality."],
    ["Images", "PINK", "Image upload, storage, processing, and display."],
    ["Moderation", "ORANGE", "Review, reports, appeals, and trust-and-safety workflows."],
    ["Admin", "RED", "Admin routes, permissions, dashboards, and tools."],
    ["Email", "BLUE", "Transactional email and email delivery."],
    ["Infrastructure", "GRAY", "Vercel, Supabase, DNS, CI/CD, secrets, and environments."],
    ["SEO", "GREEN", "Search-engine visibility and metadata."],
    ["Analytics", "PURPLE", "Product analytics, funnels, and telemetry."],
  ]],
  ["Environment", [
    ["Production", "RED", "Live production environment."],
    ["Preview", "YELLOW", "Vercel preview or shared test environment."],
    ["Local", "GRAY", "Local development environment."],
  ]],
  ["Phase", [
    ["First Prod", "BLUE", "Initial production provisioning and first production deployment."],
    ["Controlled Pilot", "PURPLE", "Family-and-friends production testing and stabilization."],
    ["Public Beta", "YELLOW", "Broader public beta testing."],
    ["v1.0", "GREEN", "Public launch baseline."],
    ["Later", "GRAY", "Future work outside the current release horizon."],
  ]],
  ["Severity", [
    ["Critical", "RED", "Service, security, or core-flow failure requiring urgent attention."],
    ["Major", "ORANGE", "Significant functional problem with meaningful user impact."],
    ["Minor", "YELLOW", "Limited-impact issue with a workaround or narrow scope."],
    ["Cosmetic", "GRAY", "Visual, wording, or polish issue with no functional impact."],
  ]],
].map(([name, options]) => ({
  name,
  options: options.map(([optionName, color, description]) => ({ name: optionName, color, description })),
}));

async function request(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": apiVersion,
      "User-Agent": "FairSwap-Web-project-configurator",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) throw new Error(`${method} ${url} failed (${response.status}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  return payload;
}

async function graphql(query, variables = {}) {
  const payload = await request("https://api.github.com/graphql", { method: "POST", body: { query, variables } });
  if (payload.errors?.length) throw new Error(`GraphQL request failed: ${JSON.stringify(payload.errors)}`);
  return payload.data;
}

async function loadProject() {
  const data = await graphql(`query ProjectByOwner($login: String!) {
    user(login: $login) {
      databaseId
      projectsV2(first: 100) {
        nodes {
          id number title
          fields(first: 100) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField { id databaseId name options { id name color description } }
            }
          }
          views(first: 100) { nodes { id number name layout filter } }
        }
      }
    }
  }`, { login: owner });
  if (!data.user) throw new Error(`GitHub user ${owner} was not found.`);
  const matches = data.user.projectsV2.nodes.filter((project) => project.title === projectTitle);
  if (matches.length !== 1) throw new Error(`Expected exactly one project named ${projectTitle}; found ${matches.length}.`);
  return { user: data.user, project: matches[0] };
}

function optionInput(definition, existingField) {
  const existingOptions = existingField?.options || [];
  return definition.options.map((option) => {
    const existing = existingOptions.find((candidate) => candidate.name === option.name);
    return { ...(existing ? { id: existing.id } : {}), ...option };
  });
}

async function createField(projectId, definition) {
  const data = await graphql(`mutation CreateField($input: CreateProjectV2FieldInput!) {
    createProjectV2Field(input: $input) {
      projectV2Field {
        __typename
        ... on ProjectV2SingleSelectField { id databaseId name options { id name color description } }
      }
    }
  }`, { input: { projectId, name: definition.name, dataType: "SINGLE_SELECT", singleSelectOptions: optionInput(definition) } });
  return data.createProjectV2Field.projectV2Field;
}

async function updateField(existingField, definition) {
  const data = await graphql(`mutation UpdateField($input: UpdateProjectV2FieldInput!) {
    updateProjectV2Field(input: $input) {
      projectV2Field {
        __typename
        ... on ProjectV2SingleSelectField { id databaseId name options { id name color description } }
      }
    }
  }`, { input: { fieldId: existingField.id, singleSelectOptions: optionInput(definition, existingField) } });
  return data.updateProjectV2Field.projectV2Field;
}

async function ensureFields(project) {
  const existing = new Map(project.fields.nodes.filter((f) => f?.__typename === "ProjectV2SingleSelectField").map((f) => [f.name, f]));
  for (const definition of fieldsWanted) {
    const field = existing.get(definition.name);
    if (field) {
      existing.set(definition.name, await updateField(field, definition));
      console.log(`Updated field: ${definition.name}`);
    } else {
      existing.set(definition.name, await createField(project.id, definition));
      console.log(`Created field: ${definition.name}`);
    }
  }
}

function fieldId(restFields, name) {
  const field = restFields.find((candidate) => candidate.name === name);
  if (!field) throw new Error(`Required field ${name} was not returned by the Projects REST API.`);
  return field.id;
}

function visibleFieldIds(restFields) {
  return ["Title", "Status", "Work Type", "Priority", "Area", "Phase", "Severity", "Environment"]
    .map((name) => restFields.find((field) => field.name === name)?.id)
    .filter(Number.isInteger);
}

async function updateExistingView(view, definition) {
  await graphql(`mutation UpdateView($input: UpdateProjectV2ViewInput!) {
    updateProjectV2View(input: $input) { projectV2View { id name layout filter } }
  }`, { input: { viewId: view.id, name: definition.name, layout: definition.layout.toUpperCase(), filter: definition.filter || "" } });
  console.log(`Updated view: ${definition.name}`);
}

async function createView(userId, projectNumber, restFields, definition) {
  const body = { name: definition.name, layout: definition.layout, ...(definition.filter ? { filter: definition.filter } : {}) };
  const visible = visibleFieldIds(restFields);
  if (visible.length && definition.layout !== "roadmap") body.visible_fields = visible;
  if (definition.groupBy) body.group_by = [fieldId(restFields, definition.groupBy)];
  if (definition.verticalGroupBy) body.vertical_group_by = [fieldId(restFields, definition.verticalGroupBy)];
  if (definition.sortBy) body.sort_by = definition.sortBy.map(([name, direction]) => [fieldId(restFields, name), direction]);
  await request(`https://api.github.com/users/${userId}/projectsV2/${projectNumber}/views`, { method: "POST", body });
  console.log(`Created view: ${definition.name}`);
}

async function ensureViews(user, project) {
  const restFields = await request(`https://api.github.com/users/${encodeURIComponent(owner)}/projectsV2/${project.number}/fields?per_page=100`);
  const wanted = [
    { name: "Pilot Command Center", layout: "board", filter: 'phase:"Controlled Pilot"', verticalGroupBy: "Status", groupBy: "Priority", sortBy: [["Priority", "asc"]] },
    { name: "Bugs", layout: "table", filter: "work-type:Bug", groupBy: "Status", sortBy: [["Priority", "asc"]] },
    { name: "Launch Blockers", layout: "table", filter: "priority:P0,P1 -status:Done", groupBy: "Priority", sortBy: [["Status", "asc"]] },
    { name: "Testing Queue", layout: "table", filter: "status:Testing", groupBy: "Area", sortBy: [["Priority", "asc"]] },
    { name: "Admin & Moderation", layout: "table", filter: "area:Admin,Moderation", groupBy: "Area", sortBy: [["Priority", "asc"]] },
    { name: "Feature Backlog", layout: "table", filter: 'work-type:Feature phase:"Public Beta","v1.0",Later -status:Done', groupBy: "Phase", sortBy: [["Priority", "asc"]] },
    { name: "Roadmap", layout: "board", verticalGroupBy: "Phase", sortBy: [["Priority", "asc"]] },
  ];
  const existing = new Map(project.views.nodes.map((view) => [view.name, view]));
  for (const definition of wanted) {
    const view = existing.get(definition.name);
    if (view) await updateExistingView(view, definition);
    else await createView(user.databaseId, project.number, restFields, definition);
  }
}

async function main() {
  const { user, project } = await loadProject();
  console.log(`Configuring project: ${project.title} (#${project.number})`);
  await ensureFields(project);
  await ensureViews(user, project);
  console.log(`Project configuration complete: https://github.com/users/${owner}/projects/${project.number}`);
  console.log('Note: GitHub reserves the field name "Type" for native Issue Type, so FairSwap uses "Work Type" for the requested Bug/Feature/etc taxonomy.');
  console.log("Roadmap is a board grouped by Phase until target dates are defined for a true timeline roadmap.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
