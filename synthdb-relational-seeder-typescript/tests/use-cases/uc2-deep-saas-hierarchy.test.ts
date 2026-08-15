/**
 * Use Case 2: Deep 7-Level Multi-Tenant SaaS Hierarchy & Determinism Test Suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { SynthDB } from '../../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runUc2Test(): Promise<{ name: string; passed: boolean; assertions: number; durationMs: number }> {
  const startTime = performance.now();
  let assertions = 0;

  console.log('\n--- Running UC-2: Deep SaaS Hierarchy & Determinism Test ---');

  const schemaPath = path.resolve(__dirname, '../../samples/saas.sql');
  const ddl = fs.readFileSync(schemaPath, 'utf8');

  const config = {
    seed: 9999,
    defaultRowCount: 20,
    rowCountPerTable: {
      tenants: 5,
      organizations: 10,
      workspaces: 15,
      teams: 20,
      saas_users: 30,
      team_memberships: 40,
      projects: 25,
      tasks: 60,
      time_logs: 120
    },
    dialect: 'postgres' as const,
    outputDir: 'output/uc2_saas'
  };

  // Run 1
  const engine1 = new SynthDB(config);
  const schema1 = engine1.parseDdl(ddl);
  const db1 = await engine1.generate(schema1);

  // Run 2 (with identical seed to test strict determinism)
  const engine2 = new SynthDB(config);
  const schema2 = engine2.parseDdl(ddl);
  const db2 = await engine2.generate(schema2);

  // 1. Topological Sort Chain Verification
  const order = db1.executionOrder;
  const tIdx = (name: string) => order.indexOf(name.toLowerCase());

  assert(tIdx('tenants') < tIdx('organizations'), 'tenants must precede organizations');
  assert(tIdx('organizations') < tIdx('workspaces'), 'organizations must precede workspaces');
  assert(tIdx('workspaces') < tIdx('teams'), 'workspaces must precede teams');
  assert(tIdx('tenants') < tIdx('saas_users'), 'tenants must precede saas_users');
  assert(tIdx('teams') < tIdx('team_memberships'), 'teams must precede team_memberships');
  assert(tIdx('workspaces') < tIdx('projects'), 'workspaces must precede projects');
  assert(tIdx('projects') < tIdx('tasks'), 'projects must precede tasks');
  assert(tIdx('tasks') < tIdx('time_logs'), 'tasks must precede time_logs');
  assertions += 8;

  // 2. Cascade Referential Integrity Verification across all 7 levels
  const tenants = db1.datasets.get('tenants')!;
  const orgs = db1.datasets.get('organizations')!;
  const workspaces = db1.datasets.get('workspaces')!;
  const teams = db1.datasets.get('teams')!;
  const users = db1.datasets.get('saas_users')!;
  const memberships = db1.datasets.get('team_memberships')!;
  const projects = db1.datasets.get('projects')!;
  const tasks = db1.datasets.get('tasks')!;
  const timeLogs = db1.datasets.get('time_logs')!;

  const tenantIds = new Set(tenants.rows.map(r => r.id));
  const orgIds = new Set(orgs.rows.map(r => r.id));
  const wsIds = new Set(workspaces.rows.map(r => r.id));
  const teamIds = new Set(teams.rows.map(r => r.id));
  const userIds = new Set(users.rows.map(r => r.id));
  const projectIds = new Set(projects.rows.map(r => r.id));
  const taskIds = new Set(tasks.rows.map(r => r.id));

  for (const org of orgs.rows) assert(tenantIds.has(org.tenant_id), 'org.tenant_id must exist in tenants');
  for (const ws of workspaces.rows) assert(orgIds.has(ws.organization_id), 'ws.organization_id must exist in orgs');
  for (const team of teams.rows) assert(wsIds.has(team.workspace_id), 'team.workspace_id must exist in workspaces');
  for (const u of users.rows) assert(tenantIds.has(u.tenant_id), 'user.tenant_id must exist in tenants');
  for (const tm of memberships.rows) {
    assert(teamIds.has(tm.team_id), 'membership.team_id must exist in teams');
    assert(userIds.has(tm.user_id), 'membership.user_id must exist in users');
  }
  for (const p of projects.rows) {
    assert(wsIds.has(p.workspace_id), 'project.workspace_id must exist in workspaces');
    assert(userIds.has(p.lead_user_id), 'project.lead_user_id must exist in users');
  }
  for (const t of tasks.rows) {
    assert(projectIds.has(t.project_id), 'task.project_id must exist in projects');
    if (t.assigned_user_id) assert(userIds.has(t.assigned_user_id), 'task.assigned_user_id must exist in users');
  }
  for (const tl of timeLogs.rows) {
    assert(taskIds.has(tl.task_id), 'time_log.task_id must exist in tasks');
    assert(userIds.has(tl.user_id), 'time_log.user_id must exist in users');
  }
  assertions += orgs.rows.length + workspaces.rows.length + teams.rows.length + memberships.rows.length * 2 + projects.rows.length * 2 + tasks.rows.length + timeLogs.rows.length * 2;

  // 3. Strict PRNG Determinism Check (Run 1 vs Run 2 byte comparison)
  for (const t of schema1.tables) {
    const r1 = db1.datasets.get(t.name.toLowerCase())!.rows;
    const r2 = db2.datasets.get(t.name.toLowerCase())!.rows;
    assert(r1.length === r2.length, `Table ${t.name} row count mismatch between identical seed runs`);
    for (let i = 0; i < r1.length; i++) {
      assert(JSON.stringify(r1[i]) === JSON.stringify(r2[i]), `Row mismatch at index ${i} in table ${t.name}`);
    }
  }
  assertions += 50;

  // 4. Unique Constraints Verification
  const subdomains = new Set(tenants.rows.map(r => r.subdomain));
  assert(subdomains.size === tenants.rows.length, 'All tenant subdomains must be strictly unique');
  const userEmails = new Set(users.rows.map(r => r.email));
  assert(userEmails.size === users.rows.length, 'All user emails must be strictly unique');
  assertions += 2;

  const durationMs = performance.now() - startTime;
  console.log(`✔ UC-2 Passed: ${assertions} assertions verified in ${durationMs.toFixed(2)}ms`);

  return {
    name: 'UC-2: Deep SaaS Hierarchy & Determinism',
    passed: true,
    assertions,
    durationMs
  };
}

if (require.main === module) {
  runUc2Test().catch(err => {
    console.error('UC-2 Test Failed:', err);
    process.exit(1);
  });
}
