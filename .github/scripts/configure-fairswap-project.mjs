const token = process.env.GH_PROJECT_TOKEN;
const owner = process.env.PROJECT_OWNER || "vivek2310sharma";
const projectTitle = process.env.PROJECT_TITLE || "FairSwap-Web";

if (!token) throw new Error("GH_PROJECT_TOKEN is required. Configure FAIRSWAP_PROJECT_TOKEN.");

const FIELD_DEFS = [
  ["Status", [["Inbox","GRAY"],["Triage","YELLOW"],["Ready","BLUE"],["In Progress","PURPLE"],["Testing","PINK"],["Blocked","RED"],["Done","GREEN"]]],
  ["Work Type", [["Bug","RED"],["Feature","BLUE"],["Enhancement","GREEN"],["UX","PURPLE"],["Security","ORANGE"],["Infrastructure","GRAY"],["Admin","PINK"],["Content","YELLOW"]]],
  ["Priority", [["P0","RED"],["P1","ORANGE"],["P2","YELLOW"],["P3","GRAY"]]],
  ["Area", [["Auth","BLUE"],["Profile","PURPLE"],["Listings","GREEN"],["Search","YELLOW"],["Images","PINK"],["Moderation","ORANGE"],["Admin","RED"],["Email","BLUE"],["Infrastructure","GRAY"],["SEO","GREEN"],["Analytics","PURPLE"]]],
  ["Environment", [["Production","RED"],["Preview","YELLOW"],["Local","GRAY"]]],
  ["Phase", [["First Prod","BLUE"],["Controlled Pilot","PURPLE"],["Public Beta","YELLOW"],["v1.0","GREEN"],["Later","GRAY"]]],
  ["Severity", [["Critical","RED"],["Major","ORANGE"],["Minor","YELLOW"],["Cosmetic","GRAY"]]],
].map(([name, options]) => ({
  name,
  options: options.map(([optionName, color]) => ({ name: optionName, color, description: `${optionName} for ${name}.` })),
}));

const VIEW_DEFS = [
  { name: "Pilot Command Center", layout: "BOARD_LAYOUT", filter: 'phase:"Controlled Pilot"' },
  { name: "Bugs", layout: "TABLE_LAYOUT", filter: "work-type:Bug" },
  { name: "Launch Blockers", layout: "TABLE_LAYOUT", filter: "priority:P0,P1 -status:Done" },
  { name: "Testing Queue", layout: "TABLE_LAYOUT", filter: "status:Testing" },
  { name: "Admin & Moderation", layout: "TABLE_LAYOUT", filter: "area:Admin,Moderation" },
  { name: "Feature Backlog", layout: "TABLE_LAYOUT", filter: 'work-type:Feature phase:"Public Beta","v1.0",Later -status:Done' },
  { name: "Roadmap", layout: "ROADMAP_LAYOUT", filter: "" },
];

async function graphql(query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "FairSwap-Web-project-configurator",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(`GitHub GraphQL failed: ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload.data;
}

async function loadProject() {
  const data = await graphql(`query($login:String!){
    user(login:$login){
      projectsV2(first:100){
        nodes{
          id number title
          fields(first:100){nodes{
            __typename
            ... on ProjectV2Field { id name }
            ... on ProjectV2SingleSelectField { id name options{id name color description} }
          }}
          views(first:100){nodes{id name layout filter}}
        }
      }
    }
  }`, { login: owner });

  const matches = data.user?.projectsV2?.nodes?.filter((p) => p.title === projectTitle) || [];
  if (matches.length !== 1) throw new Error(`Expected exactly one project named ${projectTitle}; found ${matches.length}.`);
  return matches[0];
}

function optionInput(definition, existing) {
  const old = existing?.options || [];
  return definition.options.map((option) => {
    const match = old.find((x) => x.name === option.name);
    return { ...(match ? { id: match.id } : {}), ...option };
  });
}

async function ensureField(projectId, definition, existing) {
  if (existing) {
    const data = await graphql(`mutation($input:UpdateProjectV2FieldInput!){
      updateProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{id name options{id name color description}}}}
    }`, { input: { fieldId: existing.id, singleSelectOptions: optionInput(definition, existing) } });
    console.log(`Updated field: ${definition.name}`);
    return data.updateProjectV2Field.projectV2Field;
  }

  const data = await graphql(`mutation($input:CreateProjectV2FieldInput!){
    createProjectV2Field(input:$input){projectV2Field{... on ProjectV2SingleSelectField{id name options{id name color description}}}}
  }`, { input: { projectId, name: definition.name, dataType: "SINGLE_SELECT", singleSelectOptions: optionInput(definition) } });
  console.log(`Created field: ${definition.name}`);
  return data.createProjectV2Field.projectV2Field;
}

async function ensureFields(project) {
  const existing = new Map(
    project.fields.nodes
      .filter((f) => f?.__typename === "ProjectV2SingleSelectField")
      .map((f) => [f.name, f]),
  );

  for (const definition of FIELD_DEFS) {
    existing.set(definition.name, await ensureField(project.id, definition, existing.get(definition.name)));
  }

  return existing;
}

function visibleIds(project, customFields) {
  const title = project.fields.nodes.find((f) => f?.name === "Title")?.id;
  const ordered = ["Status", "Work Type", "Priority", "Area", "Phase", "Severity", "Environment"];
  return [title, ...ordered.map((name) => customFields.get(name)?.id)].filter(Boolean);
}

function viewConfiguration(definition, ids) {
  return definition.layout === "ROADMAP_LAYOUT" ? undefined : { visibleFieldIds: ids };
}

async function createView(project, definition, ids) {
  const configuration = viewConfiguration(definition, ids);
  const input = {
    projectId: project.id,
    name: definition.name,
    layout: definition.layout,
    ...(configuration ? { configuration } : {}),
  };

  const data = await graphql(`mutation($input:CreateProjectV2ViewInput!){
    createProjectV2View(input:$input){projectV2View{id name layout filter}}
  }`, { input });

  const view = data.createProjectV2View.projectV2View;
  if (definition.filter) {
    await graphql(`mutation($input:UpdateProjectV2ViewInput!){updateProjectV2View(input:$input){projectV2View{id}}}`, {
      input: { viewId: view.id, filter: definition.filter },
    });
  }
  console.log(`Created view: ${definition.name}`);
}

async function updateView(view, definition, ids) {
  const configuration = viewConfiguration(definition, ids);
  const input = {
    viewId: view.id,
    name: definition.name,
    layout: definition.layout,
    filter: definition.filter,
    ...(configuration ? { configuration } : {}),
  };

  await graphql(`mutation($input:UpdateProjectV2ViewInput!){
    updateProjectV2View(input:$input){projectV2View{id name layout filter}}
  }`, { input });
  console.log(`Updated view: ${definition.name}`);
}

async function ensureViews(project, customFields) {
  const ids = visibleIds(project, customFields);
  const existing = new Map(project.views.nodes.map((v) => [v.name, v]));
  for (const definition of VIEW_DEFS) {
    const view = existing.get(definition.name);
    if (view) await updateView(view, definition, ids);
    else await createView(project, definition, ids);
  }
}

async function main() {
  const project = await loadProject();
  console.log(`Configuring project: ${project.title} (#${project.number})`);
  const customFields = await ensureFields(project);
  await ensureViews(project, customFields);
  console.log(`Project configuration complete: https://github.com/users/${owner}/projects/${project.number}`);
  console.log('GitHub reserves "Type" for native Issue Type, so the FairSwap taxonomy field is named "Work Type".');
  console.log("View names, layouts, filters, and visible fields are API-managed. Board grouping still requires the GitHub UI because that configuration is not exposed by the current GraphQL mutation input.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
