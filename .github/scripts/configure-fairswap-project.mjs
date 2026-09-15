const token = process.env.GH_PROJECT_TOKEN;
const owner = process.env.PROJECT_OWNER || "vivek2310sharma";
const projectTitle = process.env.PROJECT_TITLE || "FairSwap-Web";
const apiVersion = "2026-03-10";

if (!token) {
  throw new Error("GH_PROJECT_TOKEN is required. Configure repository secret FAIRSWAP_PROJECT_TOKEN.");
}

const fieldDefinitions = [
  {
    name: "Status",
    aliases: { Inbox: ["Todo", "To do"] },
    options: [
      ["Inbox", "GRAY", "New work that has not yet been triaged."],
      ["Triage", "YELLOW", "Needs review, clarification, or prioritization."],
      ["Ready", "BLUE", "Ready to be picked up."],
      ["In Progress", "PURPLE", "Actively being worked on."],
      ["Testing", "PINK", "Implementation is complete and awaiting verification."],
      ["Blocked", "RED", "Cannot proceed until a dependency or issue is resolved."],
      ["Done", "GREEN", "Completed and verified."],
    ],
  },
  {
    name: "Type",
    options: [
      ["Bug", "RED", "A defect in existing behavior."],
      ["Feature", "BLUE", "New user or product capability."],
      ["Enhancement", "GREEN", "Improvement to existing behavior."],
      ["UX", "PURPLE", "User experience or usability work."],
      ["Security", "ORANGE", "Security, abuse prevention, or access-control work."],
      ["Infrastructure", "GRAY", "Hosting, CI/CD, database, DNS, or platform work."],
      ["Admin", "PINK", "Administrator or moderation tooling work."],
      ["Content", "YELLOW", "Copy, policy, SEO content, or documentation."],
    ],
  },
  {
    name: "Priority",
    options: [
      ["P0", "RED", "Critical: immediate action required."],
      ["P1", "ORANGE", "High: should be addressed before the next release gate."],
      ["P2", "YELLOW", "Medium: important but not currently blocking."],
      ["P3", "GRAY", "Low: useful improvement or future work."],
    ],
  },
  {
    name: "Area",
    options: [
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
    ],
  },
  {
    name: "Environment",
    options: [
      ["Production", "RED", "Live production environment."],
      ["Preview", "YELLOW", "Vercel preview or shared test environment."],
      ["Local", "GRAY", "Local development environment."],
    ],
  },
  {
    name: "Phase",
    options: [
      ["First Prod", "BLUE", "Initial production provisioning and first production deployment."],
      ["Controlled Pilot", "PURPLE", "Family-and-friends production testing and stabilization."],
      ["Public Beta", "YELLOW", "Broader public beta testing."],
      ["v1.0", "GREEN", "Public launch baseline."],
      ["Later", "GRAY", "Future work outside the current release horizon."],
    ],
  },
  {
    name: "Severity",
    options: [
      ["Critical", "RED", "Service, security, or core-flow failure requiring urgent attention."],
      ["Major", "ORANGE", "Significant functional problem with meaningful user impact."],
      ["Minor", "YELLOW", "Limited-impact issue with a workaround or narrow scope."],
      ["Cosmetic", "GRAY", "Visual, wording, or polish issue with no functional impact."],
    ],
  },
].map((field) => ({
  ...field,
  options: field.options.map(([name, color, description]) => ({ name, color, description })),
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
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const details = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`${method} ${url} failed (${response.status}): ${details}`);
  }

  return payload;
}

async function graphql(query, variables = {}) {
  const payload = await request("https://api.github.com/graphql", {
    method: "POST",
    body: { query, variables },
  });

  if (payload.errors?.length) {
    throw new Error(`GraphQL request failed: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data;
}

async function loadProject() {
  const data = await graphql(
    `query ProjectByOwner($login: String!) {
      user(login: $login) {
        id
        login
        databaseId
        projectsV2(first: 100) {
          nodes {
            id
            number
            title
            fields(first: 100) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  databaseId
                  name
                  options { id name color description }
                }
              }
            }
            views(first: 100) {
              nodes { id number name layout filter }
            }
          }
        }
      }
    }`,
    { login: owner },
  );

  if (!data.user) {
    throw new Error(`GitHub user ${owner} was not found.`);
  }

  const matches = data.user.projectsV2.nodes.filter((project) => project.title === projectTitle);
  if (matches.length === 0) {
    const available = data.user.projectsV2.nodes.map((project) => project.title).join(", ") || "none";
    throw new Error(`Project ${projectTitle} was not found for ${owner}. Available projects: ${available}`);
  }
  if (matches.length > 1) {
    throw new Error(`More than one project named ${projectTitle} exists for ${owner}; refusing to guess.`);
  }

  return { user: data.user, project: matches[0] };
}

function optionInput(definition, existingField) {
  const aliases = definition.aliases || {};
  const existingOptions = existingField?.options || [];

  return definition.options.map((option) => {
    const exact = existingOptions.find((existing) => existing.name === option.name);
    const aliasNames = aliases[option.name] || [];
    const alias = exact ? null : existingOptions.find((existing) => aliasNames.includes(existing.name));
    const existing = exact || alias;
    return {
      ...(existing ? { id: existing.id } : {}),
      name: option.name,
      color: option.color,
      description: option.description,
    };
  });
}

async function createField(projectId, definition) {
  const data = await graphql(
    `mutation CreateField($input: CreateProjectV2FieldInput!) {
      createProjectV2Field(input: $input) {
        projectV2Field {
          __typename
          ... on ProjectV2SingleSelectField {
            id
            databaseId
            name
            options { id name color description }
          }
        }
      }
    }`,
    {
      input: {
        projectId,
        name: definition.name,
        dataType: "SINGLE_SELECT",
        singleSelectOptions: optionInput(definition),
      },
    },
  );
  return data.createProjectV2Field.projectV2Field;
}

async function updateField(existingField, definition) {
  const data = await graphql(
    `mutation UpdateField($input: UpdateProjectV2FieldInput!) {
      updateProjectV2Field(input: $input) {
        projectV2Field {
          __typename
          ... on ProjectV2SingleSelectField {
            id
            databaseId
            name
            options { id name color description }
          }
        }
      }
    }`,
    {
      input: {
        fieldId: existingField.id,
        singleSelectOptions: optionInput(definition, existingField),
      },
    },
  );
  return data.updateProjectV2Field.projectV2Field;
}

async function ensureFields(project) {
  const fields = new Map(
    project.fields.nodes
      .filter((field) => field?.__typename === "ProjectV2SingleSelectField")
      .map((field) => [field.name, field]),
  );

  for (const definition of fieldDefinitions) {
    const existing = fields.get(definition.name);
    if (existing) {
      const updated = await updateField(existing, definition);
      fields.set(definition.name, updated);
      console.log(`Updated field: ${definition.name}`);
    } else {
      const created = await createField(project.id, definition);
      fields.set(definition.name, created);
      console.log(`Created field: ${definition.name}`);
    }
  }

  return fields;
}

async function updateExistingView(view, definition) {
  await graphql(
    `mutation UpdateView($input: UpdateProjectV2ViewInput!) {
      updateProjectV2View(input: $input) {
        projectV2View { id name layout filter }
      }
    }`,
    {
      input: {
        viewId: view.id,
        name: definition.name,
        layout: definition.layout.toUpperCase(),
        filter: definition.filter || "",
      },
    },
  );
  console.log(`Updated view: ${definition.name}`);
}

function fieldId(restFields, name) {
  const field = restFields.find((candidate) => candidate.name === name);
  if (!field) {
    throw new Error(`Required project field ${name} was not returned by the REST API.`);
  }
  return field.id;
}

function visibleFieldIds(restFields) {
  const preferred = ["Title", "Status", "Type", "Priority", "Area", "Phase", "Severity", "Environment"];
  return preferred
    .map((name) => restFields.find((field) => field.name === name)?.id)
    .filter((id) => Number.isInteger(id));
}

async function createView(userId, projectNumber, restFields, definition) {
  const body = {
    name: definition.name,
    layout: definition.layout,
    ...(definition.filter ? { filter: definition.filter } : {}),
  };

  if (definition.layout !== "roadmap") {
    const visible = visibleFieldIds(restFields);
    if (visible.length) body.visible_fields = visible;
  }

  if (definition.groupBy) {
    body.group_by = [fieldId(restFields, definition.groupBy)];
  }
  if (definition.verticalGroupBy) {
    body.vertical_group_by = [fieldId(restFields, definition.verticalGroupBy)];
  }
  if (definition.sortBy) {
    body.sort_by = definition.sortBy.map(([fieldName, direction]) => [fieldId(restFields, fieldName), direction]);
  }

  await request(`https://api.github.com/users/${userId}/projectsV2/${projectNumber}/views`, {
    method: "POST",
    body,
  });
  console.log(`Created view: ${definition.name}`);
}

async function ensureViews(user, project) {
  const restFields = await request(
    `https://api.github.com/users/${encodeURIComponent(owner)}/projectsV2/${project.number}/fields?per_page=100`,
  );

  const viewDefinitions = [
    {
      name: "Pilot Command Center",
      layout: "board",
      filter: 'phase:"Controlled Pilot"',
      verticalGroupBy: "Status",
      groupBy: "Priority",
      sortBy: [["Priority", "asc"]],
    },
    {
      name: "Bugs",
      layout: "table",
      filter: "type:Bug",
      groupBy: "Status",
      sortBy: [["Priority", "asc"]],
    },
    {
      name: "Launch Blockers",
      layout: "table",
      filter: "priority:P0,P1 -status:Done",
      groupBy: "Priority",
      sortBy: [["Status", "asc"]],
    },
    {
      name: "Testing Queue",
      layout: "table",
      filter: "status:Testing",
      groupBy: "Area",
      sortBy: [["Priority", "asc"]],
    },
    {
      name: "Admin & Moderation",
      layout: "table",
      filter: "area:Admin,Moderation",
      groupBy: "Area",
      sortBy: [["Priority", "asc"]],
    },
    {
      name: "Feature Backlog",
      layout: "table",
      filter: 'type:Feature phase:"Public Beta","v1.0",Later -status:Done',
      groupBy: "Phase",
      sortBy: [["Priority", "asc"]],
    },
    {
      name: "Roadmap",
      layout: "board",
      verticalGroupBy: "Phase",
      sortBy: [["Priority", "asc"]],
    },
  ];

  const existingViews = new Map(project.views.nodes.map((view) => [view.name, view]));

  for (const definition of viewDefinitions) {
    const existing = existingViews.get(definition.name);
    if (existing) {
      await updateExistingView(existing, definition);
    } else {
      await createView(user.databaseId, project.number, restFields, definition);
    }
  }
}

async function main() {
  const { user, project } = await loadProject();
  console.log(`Configuring project: ${project.title} (#${project.number})`);

  await ensureFields(project);
  await ensureViews(user, project);

  console.log(`Project configuration complete: https://github.com/users/${owner}/projects/${project.number}`);
  console.log("Roadmap is intentionally a board grouped by Phase; a true timeline roadmap can be added later when target dates are defined.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
