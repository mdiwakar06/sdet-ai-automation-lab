/**
 * Interactive HTML Drift Dashboard Reporter for DriftGuard
 */

import * as fs from 'fs';
import * as path from 'path';
import { DriftReport } from '../types/diff';

export class HtmlReporter {
  /**
   * Generates a modern interactive HTML report file
   */
  static generate(report: DriftReport, outputPath?: string): string {
    const html = this.renderHtml(report);

    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, html, 'utf-8');
    }

    return html;
  }

  private static renderHtml(report: DriftReport): string {
    const summary = report.summary;
    const isBroken = summary.isContractBroken;
    const score = summary.score;
    const diffsJson = JSON.stringify(report.diffs);
    const reportJson = JSON.stringify(report, null, 2);

    return `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-900 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DriftGuard • API Contract Drift Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    code, pre { font-family: 'Fira Code', monospace; }
  </style>
</head>
<body class="min-h-full flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
  
  <!-- Header / Navigation -->
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            DriftGuard
            <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">OpenAPI 3.1 & JSON Schema</span>
          </h1>
          <p class="text-xs text-slate-400">Automated Contract Drift & Schema Comparator</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="text-xs text-slate-400">Generated: ${new Date(report.generatedAt).toLocaleString()}</span>
        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
          isBroken ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }">
          <span class="w-2 h-2 rounded-full mr-2 ${isBroken ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}"></span>
          ${isBroken ? 'CONTRACT DRIFTED (FAIL)' : 'CONTRACT COMPATIBLE (PASS)'}
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    
    <!-- Top Metrics Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      
      <!-- Integrity Score Card -->
      <div class="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between shadow-sm">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Contract Integrity</p>
          <p class="text-3xl font-extrabold mt-1 text-white">${score}%</p>
          <p class="text-xs text-slate-400 mt-1">${summary.totalEndpointsEvaluated} Endpoints Evaluated</p>
        </div>
        <div class="relative w-14 h-14 flex items-center justify-center">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path class="text-slate-700" stroke-width="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}" stroke-dasharray="${score}, 100" stroke-width="3.5" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span class="absolute text-xs font-bold">${score}</span>
        </div>
      </div>

      <!-- Critical Breaking Card -->
      <div class="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-red-400">Critical Breaking</p>
          <p class="text-3xl font-extrabold mt-1 text-red-400">${summary.criticalBreakingCount}</p>
          <p class="text-xs text-red-400/80 mt-1">Requires immediate hotfix</p>
        </div>
        <div class="p-3 bg-red-500/10 rounded-xl text-red-400">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>

      <!-- Warning Risk Card -->
      <div class="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/40 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-amber-400">Warning Risk</p>
          <p class="text-3xl font-extrabold mt-1 text-amber-400">${summary.warningRiskCount}</p>
          <p class="text-xs text-amber-400/80 mt-1">Backward compatibility risk</p>
        </div>
        <div class="p-3 bg-amber-500/10 rounded-xl text-amber-400">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Non-Breaking Additions Card -->
      <div class="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-emerald-400">Non-Breaking</p>
          <p class="text-3xl font-extrabold mt-1 text-emerald-400">${summary.nonBreakingAdditionCount}</p>
          <p class="text-xs text-emerald-400/80 mt-1">Safe additive evolutions</p>
        </div>
        <div class="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

    </div>

    <!-- Filter Bar and Search Controls -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
      
      <!-- Filter Tabs -->
      <div class="flex items-center space-x-2 w-full md:w-auto" id="filterTabs">
        <button onclick="setFilter('ALL')" id="tab-ALL" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm">
          All Changes (${report.diffs.length})
        </button>
        <button onclick="setFilter('CRITICAL_BREAKING')" id="tab-CRITICAL_BREAKING" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">
          Critical (${summary.criticalBreakingCount})
        </button>
        <button onclick="setFilter('WARNING_RISK')" id="tab-WARNING_RISK" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">
          Warnings (${summary.warningRiskCount})
        </button>
        <button onclick="setFilter('NON_BREAKING_ADDITION')" id="tab-NON_BREAKING_ADDITION" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">
          Additions (${summary.nonBreakingAdditionCount})
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-80">
        <input type="text" id="searchInput" oninput="renderDiffs()" placeholder="Search path, rule, or field..." class="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500">
        <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

    </div>

    <!-- Diffs Container -->
    <div id="diffsList" class="space-y-4">
      <!-- Injected via JavaScript -->
    </div>

    <!-- Raw Report Drawer Toggle -->
    <div class="pt-6 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
      <span>DriftGuard v1.0.0 • Autonomous API Contract Testing Engine</span>
      <button onclick="toggleRawJson()" class="hover:text-indigo-400 underline cursor-pointer">View Raw JSON Report</button>
    </div>

    <!-- Raw JSON Modal / Container -->
    <div id="rawJsonContainer" class="hidden p-4 rounded-2xl bg-slate-950 border border-slate-800">
      <pre class="text-xs text-slate-300 overflow-x-auto max-h-96"><code>${this.escapeHtml(reportJson)}</code></pre>
    </div>

  </main>

  <script>
    const diffsData = ${diffsJson};
    let currentFilter = 'ALL';

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('#filterTabs button').forEach(btn => {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700';
      });
      const activeBtn = document.getElementById('tab-' + filter);
      if (activeBtn) {
        activeBtn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm';
      }
      renderDiffs();
    }

    function renderDiffs() {
      const container = document.getElementById('diffsList');
      const searchTerm = (document.getElementById('searchInput').value || '').toLowerCase();

      const filtered = diffsData.filter(d => {
        const matchesFilter = currentFilter === 'ALL' || d.severity === currentFilter;
        const matchesSearch = !searchTerm || 
          d.path.toLowerCase().includes(searchTerm) || 
          d.ruleId.toLowerCase().includes(searchTerm) || 
          d.description.toLowerCase().includes(searchTerm) ||
          d.pointer.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = \`
          <div class="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-800">
            <svg class="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-slate-300">No contract diffs match the selected filter.</p>
          </div>
        \`;
        return;
      }

      container.innerHTML = filtered.map((diff, idx) => {
        let badgeColor = 'bg-slate-700 text-slate-300';
        let borderColor = 'border-slate-700';
        if (diff.severity === 'CRITICAL_BREAKING') {
          badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
          borderColor = 'border-red-900/30';
        } else if (diff.severity === 'WARNING_RISK') {
          badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          borderColor = 'border-amber-900/30';
        } else {
          badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          borderColor = 'border-emerald-900/30';
        }

        return \`
          <div class="rounded-2xl bg-slate-800/40 border \${borderColor} p-5 space-y-3 transition-all hover:bg-slate-800/60">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center space-x-2.5">
                <span class="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900 text-indigo-400 border border-slate-700">\${diff.ruleId}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold \${badgeColor}">\${diff.severity}</span>
                <span class="text-sm font-semibold text-white font-mono">\${diff.method ? diff.method + ' ' : ''}\${diff.path}</span>
              </div>
              <span class="text-xs font-mono text-slate-400 truncate max-w-md">\${diff.pointer}</span>
            </div>

            <p class="text-sm text-slate-200">\${diff.description}</p>

            \${diff.expected !== undefined && diff.actual !== undefined ? \`
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p class="text-xs font-semibold text-emerald-400 mb-1">Baseline Expected</p>
                  <pre class="text-xs text-slate-300 overflow-x-auto"><code>\${JSON.stringify(diff.expected, null, 2)}</code></pre>
                </div>
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p class="text-xs font-semibold text-red-400 mb-1">Runtime Observed</p>
                  <pre class="text-xs text-slate-300 overflow-x-auto"><code>\${JSON.stringify(diff.actual, null, 2)}</code></pre>
                </div>
              </div>
            \` : ''}

            <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div class="text-slate-400"><strong class="text-amber-400">Impact:</strong> \${diff.impact}</div>
              \${diff.remediationAdvice ? \`
                <div class="text-slate-400"><strong class="text-indigo-400">Advice:</strong> \${diff.remediationAdvice}</div>
              \` : ''}
            </div>
          </div>
        \`;
      }).join('');
    }

    function toggleRawJson() {
      const el = document.getElementById('rawJsonContainer');
      el.classList.toggle('hidden');
    }

    // Initial render
    renderDiffs();
  </script>
</body>
</html>`;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
