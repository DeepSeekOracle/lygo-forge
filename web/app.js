(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { gitTarget: 'site',
    status: null,
    harness: null,
    projects: [],
    current: null,
    tasks: [],
    selected: null,
    next: null,
    job: null,
    timer: null,
    modalMode: null,
  };

  async function api(path, opts = {}) {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setLog(text) {
    const el = $('log');
    el.textContent = text || 'Ready.';
    el.scrollTop = el.scrollHeight;
  }

  function setJobState(s) {
    const el = $('jobState');
    el.textContent = s || 'idle';
    el.className = 'jobstate ' + (s || '');
  }

  function profile() {
    return state.harness?.profiles?.[state.current?.profile] || state.harness?.profiles?.['web-2d'] || null;
  }

  function renderModels() {
    const sel = $('model');
    sel.innerHTML = '';
    for (const m of state.status?.models || []) {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = `${m.name} · ${m.route}`;
      sel.appendChild(o);
    }
    const pinned = localStorage.getItem('forge.hermesDesk');
    const saved = localStorage.getItem('forge.model');
    if (!pinned && [...sel.options].some(o => o.value === 'hermes')) {
      sel.value = 'hermes';
      localStorage.setItem('forge.hermesDesk', '1');
      localStorage.setItem('forge.model', 'hermes');
    } else if (saved && [...sel.options].some(o => o.value === saved)) {
      sel.value = saved;
    }
    updateModelRoute();
  }

  function updateModelRoute() {
    const m = (state.status?.models || []).find(x => x.id === $('model').value);
    const hermes = m && (m.id === 'hermes' || String(m.id).startsWith('hermes/'));
    const brain = state.status?.brain;
    if (hermes && brain?.ready) {
      $('modelRoute').textContent = `${brain.label || 'LYGO Engine'} · ${brain.tier || 'local'}`;
    } else if (hermes) {
      $('modelRoute').textContent = 'engine offline';
    } else {
      $('modelRoute').textContent = m ? m.route : 'local';
    }
    if (hermes) {
      $('build').innerHTML = 'Ask Hermes <kbd>Ctrl ↵</kbd>';
      $('prompt').placeholder = 'Message the Forge Master…';
      $('composerHint').textContent = brain?.hint || 'Default local brain: LYGO Engine on 11441. Start LYGO Agent Manager to boot it.';
    } else {
      $('build').innerHTML = 'Build <kbd>Ctrl ↵</kbd>';
      $('prompt').placeholder = 'Describe what to build or fix…';
      $('composerHint').textContent = 'Task scope is enforced. No account, no credits.';
    }
  }

  function renderProjects() {
    const box = $('projects');
    box.innerHTML = '';
    $('projectCount').textContent = String(state.projects.length);
    for (const p of state.projects) {
      const b = document.createElement('button');
      b.className = 'project' + (state.current?.slug === p.slug ? ' active' : '');
      b.type = 'button';
      b.innerHTML = `<span class="pdot"></span><span class="pname">${esc(p.name)}</span>`;
      b.title = `${p.path}\n${p.profile_label || p.profile || ''}`;
      b.onclick = () => selectProject(p);
      box.appendChild(b);
    }
    if (!state.projects.length) {
      const n = document.createElement('div');
      n.className = 'sub';
      n.style.padding = '8px';
      n.textContent = 'No projects yet.';
      box.appendChild(n);
    }
  }

  function setEmptyTask(text, action) {
    const box = $('taskbox');
    box.innerHTML = `<div class="emptyline"><span>${esc(text)}</span>${action || ''}</div>`;
    if (action) $('initHarness')?.addEventListener('click', () => initHarness());
  }

  async function selectProject(p) {
    state.current = p;
    state.tasks = [];
    state.selected = null;
    state.next = null;
    $('crumbProject').textContent = p.name;
    $('projectTitle').textContent = p.name;
    $('projectPath').textContent = p.path;
    $('projectKind').textContent = `${(p.profile_label || p.profile || 'WEB').toUpperCase()}`;
    $('build').disabled = false;
    $('stop').disabled = true;
    $('previewInfo').textContent = p.slug;
    {
      // BOOT UNITY is always on screen; its label says whether the editor can open this project.
      const bu = $('bootUnity');
      if (bu) {
        bu.style.display = '';
        bu.textContent = p.is_unity ? 'BOOT UNITY' : 'BOOT UNITY (web game)';
        bu.title = p.is_unity
          ? "Open this game's Unity project in the Unity editor"
          : "This project is not a Unity title - the editor only opens for Unity projects";
      }
    }
    if (p.is_unity) {
      $('previewInfo').textContent = 'UNITY PROJECT';
      $('previewFrame').style.display = 'none';
      $('previewFrame').src = 'about:blank';
      $('previewEmpty').style.display = 'grid';
      $('previewEmpty').innerHTML = '<b>UNITY PROJECT</b><span>No HTML preview. Use Build to edit the C# project, or open the Unity editor / WebGL build.</span>';

      // Unity titles skip refreshPreview, so git status (and the SITE/UNITY switcher)
      // has to be kicked here or the buttons never appear.
      setTimeout(() => { if (window.__gitStatus) window.__gitStatus(); }, 300);
    } else {
      $('previewEmpty').style.display = 'none';
      $('previewFrame').style.display = 'block';
      $('previewFrame').src = `/preview/${encodeURIComponent(p.slug)}/?v=${Date.now()}`;
    }
    renderProjects();
    setLog(`Selected ${p.name}\n${p.path}\nProfile: ${p.profile_label || p.profile || 'web-2d'}`);
    setJobState('idle');
    await loadTasks();
  }

  async function loadTasks() {
    if (!state.current) return;
    $('task').innerHTML = '';
    if (!state.current.has_tasks) {
      setEmptyTask('This project has no harness yet.', '<button class="primary" id="initHarness">Initialize harness</button>');
      $('markDone').disabled = true;
      renderRail();
      return;
    }
    try {
      const d = await api(`/api/projects/${encodeURIComponent(state.current.slug)}/tasks`);
      state.tasks = d.tasks || [];
      state.next = d.next || null;
      state.current.profile = d.profile || state.current.profile;
      const prefer = state.selected?.id || state.next?.id || state.tasks.find(t => t.status !== 'done')?.id || state.tasks[0]?.id;
      state.selected = state.tasks.find(t => t.id === prefer) || null;
      renderTasks();
      renderRail();
      renderHarness();
    } catch (e) {
      setEmptyTask('Could not load tasks: ' + e.message);
    }
  }

  function renderTasks() {
    const sel = $('task');
    sel.innerHTML = '';
    for (const t of state.tasks) {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = `${t.id} · ${t.title} ${t.status === 'done' ? '✓' : t.status === 'blocked' ? '!' : ''}`;
      sel.appendChild(o);
    }
    if (state.selected) sel.value = state.selected.id;
    sel.onchange = () => {
      state.selected = state.tasks.find(t => t.id === sel.value) || null;
      if (state.selected) $('specialist').value = state.selected.owner || 'producer';
      renderTasks();
      renderRail();
      renderHarness();
    };
  }

  function renderHarness() {
    const p = profile();
    const spec = $('specialist');
    const previous = spec.value;
    spec.innerHTML = '';
    const ids = p?.specialists || Object.keys(state.harness?.specialists || {});
    for (const id of ids) {
      const s = state.harness?.specialists?.[id];
      if (!s) continue;
      const o = document.createElement('option');
      o.value = id;
      o.textContent = s.name;
      spec.appendChild(o);
    }
    if (state.selected?.owner && [...spec.options].some(o => o.value === state.selected.owner)) {
      spec.value = state.selected.owner;
    } else if (previous && [...spec.options].some(o => o.value === previous)) {
      spec.value = previous;
    }
    spec.onchange = () => {
      if (state.selected) state.selected.owner = spec.value;
    };

    const box = $('taskbox');
    if (!state.selected) {
      box.innerHTML = `<div class="emptyline"><span>No pending task. The phase gate may be complete.</span></div>`;
      $('markDone').disabled = true;
      $('dispatchTask').disabled = true;
      return;
    }
    const t = state.selected;
    const chips = [
      `<span class="chip">${esc((p?.label || state.current.profile) || '')}</span>`,
      `<span class="chip ${t.status === 'done' ? 'ok' : ''}">${esc(t.status)}</span>`,
      `<span class="chip">${esc(t.owner)}</span>`,
    ];
    if (t.evidence?.length) chips.push(`<span class="chip ok">${t.evidence.length} evidence</span>`);
    box.innerHTML = `
      <div class="taskhead"><div><div class="taskid">${esc(t.id)} · ${esc(t.phase)}</div><div class="tasktitle">${esc(t.title)}</div></div></div>
      <div class="taskmeta">${chips.join('')}</div>
      <p class="taskdesc">${esc(t.description)}</p>
      <ul class="accept">${(t.acceptance || []).map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      ${t.evidence?.length ? `<div class="evidence"><b>Evidence:</b> ${t.evidence.map(esc).join(' · ')}</div>` : ''}
      <div class="evidence">Read: GAME.md · PLAN.md · TASKS.json · GDD.md · ART_BIBLE.md · TECH_SPEC.md · QA.md</div>`;
    $('markDone').disabled = t.status === 'done';
    $('dispatchTask').disabled = t.status === 'done' || !state.current;
  }

  function renderRail() {
    const rail = $('rail');
    rail.innerHTML = '';
    for (const ph of state.harness?.phases || []) {
      const tasks = state.tasks.filter(t => t.phase === ph.id);
      const done = tasks.filter(t => t.status === 'done').length;
      const active = state.selected?.phase === ph.id || (!state.selected && state.next?.phase === ph.id);
      const b = document.createElement('button');
      b.className = 'phase' + (active ? ' active' : '') + (tasks.length && done === tasks.length ? ' done' : '');
      b.type = 'button';
      b.innerHTML = `${esc(ph.title)} <span class="pcount">${done}/${tasks.length || 0}</span>`;
      b.title = ph.goal;
      b.onclick = () => {
        const target = tasks.find(t => t.status !== 'done') || tasks[0];
        if (target) {
          state.selected = target;
          $('task').value = target.id;
          $('specialist').value = target.owner || 'producer';
          renderTasks();
          renderRail();
          renderHarness();
        }
      };
      rail.appendChild(b);
    }
  }

  async function initHarness() {
    if (!state.current) return;
    try {
      await api(`/api/projects/${encodeURIComponent(state.current.slug)}/harness`, {
        method: 'POST',
        body: JSON.stringify({ profile: state.current.profile || 'web-2d' }),
      });
      await reload();
      const p = state.projects.find(x => x.slug === state.current.slug);
      if (p) await selectProject(p);
    } catch (e) { alert(e.message); }
  }

  async function dispatchTask() {
    if (!state.current || !state.selected) return;
    $('dispatchTask').disabled = true;
    try {
      const d = await api('/api/dispatcher/from-task', {
        method: 'POST',
        body: JSON.stringify({ project: state.current.slug, task: state.selected.id }),
      });
      setLog(`Dispatched ${d.task.id} → ${d.job.id} on ${d.job.agent_name || 'worker queue'}`);
      await openDispatcher();
      await refreshDispatcher();
    } catch (e) {
      alert(e.message);
    } finally {
      $('dispatchTask').disabled = false;
    }
  }

  async function markDone() {
    if (!state.current || !state.selected) return;
    const evidence = window.prompt('Evidence for this task (what did you run, see, or measure?):', '');
    if (!evidence || !evidence.trim()) return;
    try {
      await api(`/api/projects/${encodeURIComponent(state.current.slug)}/tasks/${encodeURIComponent(state.selected.id)}`, {
        method: 'POST',
        body: JSON.stringify({ status: 'done', evidence: evidence.trim() }),
      });
      state.selected = null;
      state.current.has_tasks = true;
      await loadTasks();
    } catch (e) { alert(e.message); }
  }

  function refreshPreview() {
    if (!state.current) return;
    // Unity games preview a WebGL build; the BOOT UNITY button opens the real editor instead.
    const bu = $('bootUnity');
    if (bu) {
      bu.style.display = '';
      bu.textContent = state.current.is_unity ? 'BOOT UNITY' : 'BOOT UNITY (web game)';
      bu.title = state.current.is_unity
        ? "Open this game's Unity project in the Unity editor"
        : "This project is not a Unity title - the editor only opens for Unity projects";
    }
    if (state.current.is_unity) return;
    $('previewFrame').src = `/preview/${encodeURIComponent(state.current.slug)}/?v=${Date.now()}`;
    $('previewInfo').textContent = 'reloaded ' + new Date().toLocaleTimeString();
    setTimeout(() => { if (window.__gitStatus) window.__gitStatus(); }, 300);
  }

  async function startBuild() {
    if (!state.current) return;
    const prompt = $('prompt').value.trim();
    if (!state.selected && !prompt) {
      $('prompt').focus();
      return;
    }
    const model = $('model').value;
    localStorage.setItem('forge.model', model);
    $('build').disabled = true;
    $('stop').disabled = false;
    $('prompt').disabled = true;
    setJobState('queued');
    setLog('Starting build…');
    try {
      const data = await api('/api/build', {
        method: 'POST',
        body: JSON.stringify({
          project: state.current.slug,
          model,
          prompt,
          task: state.selected?.id || '',
          specialist: $('specialist').value || '',
        }),
      });
      state.job = data.job;
      pollJob();
    } catch (e) {
      setJobState('failed');
      setLog(`Build failed to start: ${e.message}`);
      $('build').disabled = false;
      $('stop').disabled = true;
      $('prompt').disabled = false;
    }
  }

  async function pollJob() {
    clearTimeout(state.timer);
    if (!state.job) return;
    try {
      const j = await api(`/api/jobs/${state.job}`);
      setJobState(j.status);
      setLog((j.log || []).join('\n'));
      if (['done', 'failed', 'stopped', 'timeout', 'unknown'].includes(j.status)) {
        $('build').disabled = false;
        $('stop').disabled = true;
        $('prompt').disabled = false;
        if (j.status === 'done') refreshPreview();
        return;
      }
    } catch (e) {
      setLog(`Job poll error: ${e.message}`);
    }
    state.timer = setTimeout(pollJob, 1100);
  }

  async function stopBuild() {
    if (!state.job) return;
    try { await api(`/api/jobs/${state.job}/stop`, { method: 'POST' }); } catch {}
    setJobState('stopped');
    $('build').disabled = false;
    $('stop').disabled = true;
    $('prompt').disabled = false;
  }

  function profileOptions(selected) {
    const profiles = state.harness?.profiles || {};
    return Object.entries(profiles).map(([id, p]) =>
      `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(p.label)} — ${esc(p.engine)}</option>`
    ).join('');
  }

  function updateProfileNote() {
    const id = $('newProfile')?.value;
    const p = state.harness?.profiles?.[id];
    if (!p || !$('profileNote')) return;
    const b = p.budget || {};
    $('profileNote').textContent = `${p.summary}\n\nLow-end target: ${b.target_fps} FPS · ${b.resolution} · ${b.draw_calls} draw calls · ${b.triangles} tris · ${b.texture_mb} MB textures.\n\n${p.checks.join('\n')}`;
  }

  function openModal(mode) {
    state.modalMode = mode;
    $('modal').hidden = false;
    $('modalBody').innerHTML = '';
    $('modalGo').style.display = '';
    if (mode === 'new') {
      $('modalKicker').textContent = 'NEW PROJECT';
      $('modalTitle').textContent = 'Start a game';
      $('modalSub').textContent = 'Picks an engine profile and writes the full phase/task harness.';
      $('modalGo').textContent = 'Create';
      $('modalBody').innerHTML = `<label>PROJECT NAME<input id="newName" placeholder="e.g. Iron Veil" autofocus></label>
        <label>ENGINE PROFILE<select id="newProfile">${profileOptions('web-hd2d')}</select></label>
        <div class="api-note" id="profileNote"></div>`;
      setTimeout(() => $('newName')?.focus(), 50);
      updateProfileNote();
      $('newProfile').onchange = updateProfileNote;
    } else if (mode === 'adopt') {
      $('modalKicker').textContent = 'OPEN PROJECT';
      $('modalTitle').textContent = 'Adopt a folder';
      $('modalSub').textContent = 'Point Forge at an existing HTML5 or Unity project. It stays where it is.';
      $('modalGo').textContent = 'Open';
      $('modalBody').innerHTML = `<label>ABSOLUTE FOLDER PATH<input id="adoptPath" placeholder="D:\\chatagent\\games\\lattice-arena" autofocus></label>
        <label>INITIALIZE HARNESS (OPTIONAL)<select id="adoptProfile"><option value="">Detect / do not initialize</option>${profileOptions('')}</select></label>`;
      setTimeout(() => $('adoptPath')?.focus(), 50);
    } else if (mode === 'api') {
      $('modalKicker').textContent = 'AGENT API';
      $('modalTitle').textContent = 'Local task API';
      $('modalSub').textContent = 'Any local agent can drive Forge without a browser.';
      $('modalGo').style.display = 'none';
      $('modalBody').innerHTML = `<div class="api-note">GET  /api/status
GET  /api/harness
GET  /api/projects
POST /api/projects       {"name":"Game","profile":"web-hd2d"}
POST /api/adopt          {"path":"D:\\path\\to\\game","profile":"unity-hd2d"}
POST /api/projects/&lt;slug&gt;/harness
GET  /api/projects/&lt;slug&gt;/tasks
POST /api/projects/&lt;slug&gt;/tasks/&lt;id&gt;  {"status":"done","evidence":"..."}
POST /api/build          {"project":"slug","model":"hermes","task":"GDD-01","specialist":"game-designer"}
GET  /api/llm
POST /api/llm            {"mode":"local"|"api"|"clear","model":"...","provider":"openai","api_key":"..."}
POST /api/llm/scan

Default local brain: LYGO Engine Qwen3-4B-Instruct-2507 (engine 11441, bridge 8081). An API key takes priority when present. Notes: docs/MODELS.md.

Bind: 127.0.0.1 only. No account, credits, store, or telemetry.</div>`;
      $('modalCancel').focus();
    } else if (mode === 'freebuild') {
      $('modalKicker').textContent = 'FREE BUILD';
      $('modalTitle').textContent = 'Build it without a task';
      $('modalSub').textContent = 'No phase, no document. Your instruction plus this project\'s BUILD.md contract go to a worker.';
      $('modalGo').style.display = 'none';
      const slug = state.current && state.current.slug;
      if (!slug) { $('modalBody').innerHTML = '<div class="api-note">Open a project first.</div>'; return; }
      $('modalBody').innerHTML = `
        <label>INSTRUCTION<textarea id="fbPrompt" rows="5" style="width:100%" placeholder="e.g. Build a proper HUD: health bar, ammo counter, objective line, pause screen. Art-directed, not grey boxes."></textarea></label>
        <label>WORKER<select id="fbAgent" style="width:100%"><option value="">auto (dispatcher picks)</option></select></label>
        <label>SKILL<select id="fbSkill" style="width:100%"><option value="forge-worker">forge-worker</option>
          <option value="forge-ui-worker">forge-ui-worker</option>
          <option value="forge-image-worker">forge-image-worker</option>
          <option value="forge-2d-map-worker">forge-2d-map-worker</option>
          <option value="forge-2d-character-worker">forge-2d-character-worker</option>
          <option value="forge-audio-worker">forge-audio-worker</option>
          <option value="forge-qa-worker">forge-qa-worker</option>
        </select></label>
        <div class="api-note" id="fbStatus">Picks up BUILD.md automatically when the project has one.</div>
        <button class="primary" id="fbGo" type="button">Dispatch build</button>`;
      api('/api/dispatcher/agents').then(d => {
        const sel = $('fbAgent');
        (d.agents || []).filter(x => x.dispatchable).forEach(x => {
          const o = document.createElement('option');
          o.value = x.id; o.textContent = `${x.name} (${x.kind}) - ${x.status}`;
          sel.appendChild(o);
        });
      }).catch(() => {});
      $('fbGo').onclick = async () => {
        const prompt = ($('fbPrompt').value || '').trim();
        const st = $('fbStatus');
        if (!prompt) { st.textContent = 'Type an instruction first.'; return; }
        $('fbGo').disabled = true;
        st.textContent = 'Dispatching…';
        try {
          const d = await api(`/api/projects/${encodeURIComponent(slug)}/build/free`, {
            method: 'POST',
            body: JSON.stringify({ prompt, agent: $('fbAgent').value || '', skill: $('fbSkill').value }),
          });
          st.textContent = `Job ${d.job.id} queued on ${d.job.agent_name || 'the dispatcher'}` +
                           (d.used_contract ? ' · BUILD.md contract attached' : ' · NO contract (project has no BUILD.md)');
          setLog(`Free build ${d.job.id}: ${d.job.title}\n${st.textContent}`);
        } catch (e) {
          st.textContent = 'Failed: ' + e.message;
        } finally { $('fbGo').disabled = false; }
      };
    } else if (mode === 'build') {
      $('modalKicker').textContent = 'BUILD CONTRACT';
      $('modalTitle').textContent = 'What must physically exist';
      $('modalSub').textContent = 'A task is done when the preview shows the change, not when a doc was updated.';
      $('modalGo').style.display = 'none';
      const slug = state.current && state.current.slug;
      $('modalBody').innerHTML = '<div class="api-note">No project open.</div>';
      if (slug) {
        api(`/api/projects/${encodeURIComponent(slug)}/build`).then(d => {
          $('modalBody').innerHTML = d.exists
            ? `<pre style="white-space:pre-wrap;font:12px/1.5 ui-monospace,Consolas,monospace;max-height:58vh;overflow:auto">${esc(d.text)}</pre>`
            : `<div class="api-note">No BUILD.md in this project yet.${esc(d.hint || '')}<br><br>Every project needs one: HUD, visual identity, 6+ used assets, one authored level, 3 effects, 4+ SFX and a music bed.</div>`;
        }).catch(e => { $('modalBody').innerHTML = `<div class="api-note">${esc(e.message)}</div>`; });
      }
    } else if (mode === 'harness') {
      $('modalKicker').textContent = 'HARNESS';
      $('modalTitle').textContent = 'Phase-gated game development';
      $('modalSub').textContent = 'Adapted from MIT-licensed BMad Game Dev Studio and GitHub Spec Kit; task discipline is our own implementation.';
      $('modalGo').style.display = 'none';
      const phases = (state.harness?.phases || []).map(p => `<b>${esc(p.title)}</b> — ${esc(p.goal)}`).join('<br>');
      $('modalBody').innerHTML = `<div class="api-note">${phases}</div>`;
    } else if (mode === 'brain') {
      $('modalKicker').textContent = 'BRAIN';
      $('modalTitle').textContent = 'LYGO Engine is basic';
      $('modalSub').textContent = 'Forge ships with LYGO Engine. Upgrade the LLM here, or read docs/LLM.md.';
      $('modalGo').style.display = 'none';
      renderBrainModal();
    }
  }

  async function renderBrainModal() {
    let brain = state.status?.brain || {};
    try { brain = await api('/api/llm'); state.status.brain = brain; setBridgeUI(state.status); updateModelRoute(); } catch (e) {}
    const found = brain.ready
      ? `${esc(brain.label)} · ${esc(brain.model)} · ${esc(brain.tier)}`
      : 'LYGO Engine is not answering. Start it, scan again, or add an API key.';
    $('modalBody').innerHTML = `<div class="api-note">${found}<br><br>${esc(brain.hint || '')}<br><br>The shipped model is basic. Upgrade notes: docs/LLM.md</div>
      <div class="modal-actions" style="margin:10px 0"><button class="ghost small" id="brainScan" type="button">Scan this PC</button></div>
      <label>LOCAL MODEL URL<input id="brainUrl" value="${esc(brain.mode === 'local' ? brain.endpoint : 'http://127.0.0.1:8080/v1')}"></label>
      <label>MODEL ID<input id="brainModel" value="${esc(brain.model || 'Qwen3-4B-Instruct-2507')}"></label>
      <label>API PROVIDER<select id="brainProvider">
        <option value="openai">OpenAI</option>
        <option value="openrouter">OpenRouter</option>
        <option value="anthropic">Anthropic</option>
        <option value="xai">xAI</option>
        <option value="custom">Custom HTTPS</option>
      </select></label>
      <label>API BASE URL (CUSTOM)<input id="brainApiUrl" placeholder="https://example.com/v1"></label>
      <label>API KEY<input id="brainKey" type="password" autocomplete="off" placeholder="${brain.key_set ? 'Key saved. Paste only to replace it.' : 'Paste a key to upgrade off this PC'}"></label>
      <div class="modal-actions">
        <button class="ghost small" id="brainLocal" type="button">Use this local model</button>
        <button class="primary small" id="brainApi" type="button">Save API upgrade</button>
        <button class="ghost small" id="brainClear" type="button">Back to LYGO Engine</button>
      </div>
      <div class="api-note" id="brainMsg"></div>`;
    $('brainScan').onclick = scanBrain;
    $('brainLocal').onclick = saveLocalBrain;
    $('brainApi').onclick = saveApiBrain;
    $('brainClear').onclick = clearBrain;
  }

  async function scanBrain() {
    $('brainMsg').textContent = 'Scanning this PC…';
    try {
      const d = await api('/api/llm/scan', { method: 'POST' });
      state.status.brain = d.brain;
      setBridgeUI(state.status);
      updateModelRoute();
      const lines = (d.found || []).map(hit => `${hit.label}: ${hit.models.join(', ')}`);
      $('brainMsg').textContent = lines.length ? lines.join('\n') : 'No local model answered. Start LYGO Engine, or add an API key.';
    } catch (e) { $('brainMsg').textContent = e.message; }
  }

  async function saveLocalBrain() {
    try {
      const brain = await api('/api/llm', { method: 'POST', body: JSON.stringify({ mode: 'local', endpoint: $('brainUrl').value.trim(), model: $('brainModel').value.trim() }) });
      state.status.brain = brain;
      setBridgeUI(state.status);
      updateModelRoute();
      $('brainMsg').textContent = `Using ${brain.label} · ${brain.model} · ${brain.tier}`;
    } catch (e) { $('brainMsg').textContent = e.message; }
  }

  async function saveApiBrain() {
    const key = $('brainKey').value;
    try {
      const brain = await api('/api/llm', { method: 'POST', body: JSON.stringify({
        mode: 'api',
        provider: $('brainProvider').value,
        model: $('brainModel').value.trim(),
        endpoint: $('brainApiUrl').value.trim(),
        api_key: key,
      }) });
      $('brainKey').value = '';
      state.status.brain = brain;
      setBridgeUI(state.status);
      updateModelRoute();
      $('brainMsg').textContent = `API upgrade saved for ${brain.model}. The key stays on this PC.`;
    } catch (e) { $('brainMsg').textContent = e.message; }
  }

  async function clearBrain() {
    try {
      const brain = await api('/api/llm', { method: 'POST', body: JSON.stringify({ mode: 'clear' }) });
      state.status.brain = brain;
      setBridgeUI(state.status);
      updateModelRoute();
      $('brainMsg').textContent = brain.hint || 'Back to the shipped LYGO Engine scan.';
    } catch (e) { $('brainMsg').textContent = e.message; }
  }

  let gauntletTimer = null;

  function gauntletStatusClass(s) {
    return String(s || '').replace(/[^a-z-]/g, '');
  }

  function renderGauntlet(d) {
    const box = $('modalBody');
    if (!d || d.status === 'not-run' || !Object.keys(d.agents || {}).length) {
      box.innerHTML = `<div class="api-note">No gauntlet run yet. The sandbox is disposable; Lattice Arena is not modified.<br><br><button class="primary small" id="gRun">Run worker gauntlet</button></div>`;
      $('gRun').onclick = runGauntlet;
      return;
    }
    const summary = d.summary || {};
    const rows = Object.values(d.agents || {}).map(a => {
      const cases = Object.entries(a.cases || {}).map(([id, c]) =>
        `<span class="gcase ${gauntletStatusClass(c.status)}" title="${esc(c.error || '')}">${esc(id)} ${c.score ?? 0} · ${c.latency ?? '—'}s</span>`
      ).join('');
      return `<tr><td><b>${esc(a.name)}</b><div class="sub">${esc(a.kind)} · ${esc(a.model)}</div></td>
        <td><span class="agent-status">avg ${a.average ?? 0}</span></td>
        <td>${cases}</td><td>${esc(a.state)}</td></tr>`;
    }).join('');
    box.innerHTML = `<div class="api-note"><b>Run ${esc(d.run)}</b> · avg <b>${summary.average ?? 0}</b> · max <b>${summary.max ?? 0}</b> · ${esc(d.status)}<br>
      <button class="primary small" id="gRun" ${d.status === 'running' ? 'disabled' : ''}>${d.status === 'running' ? 'Running…' : 'Run again'}</button></div>
      <table class="gtable"><thead><tr><th>Agent</th><th>Score</th><th>Cases</th><th>State</th></tr></thead><tbody>${rows}</tbody></table>`;
    $('gRun').onclick = runGauntlet;
    if (d.status === 'running') {
      clearInterval(gauntletTimer);
      gauntletTimer = setInterval(refreshGauntlet, 3000);
    }
  }

  async function refreshGauntlet() {
    try {
      const d = await api('/api/gauntlet/latest');
      renderGauntlet(d);
      if (d.status !== 'running') { clearInterval(gauntletTimer); gauntletTimer = null; }
    } catch (e) { /* keep the last render */ }
  }

  async function openGauntlet() {
    state.modalMode = 'gauntlet';
    $('modal').hidden = false;
    $('modalBody').innerHTML = '<div class="api-note">Loading gauntlet results…</div>';
    $('modalKicker').textContent = 'WORKER GAUNTLET';
    $('modalTitle').textContent = 'Quality, scope and stability';
    $('modalSub').textContent = 'Strict-output + scope-discipline tests in a disposable sandbox. Results are persisted.';
    $('modalGo').style.display = 'none';
    await refreshGauntlet();
  }

  async function runGauntlet() {
    try {
      await api('/api/gauntlet/run', { method: 'POST', body: '{}' });
      $('modalBody').innerHTML = '<div class="api-note">Gauntlet started. Keep this panel open; results update every 3s.</div>';
      clearInterval(gauntletTimer);
      gauntletTimer = setInterval(refreshGauntlet, 3000);
    } catch (e) { alert(e.message); }
  }

  async function openWorkflow() {
    state.modalMode = 'workflow';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'PRODUCTION WORKFLOW';
    $('modalTitle').textContent = 'Stages, owners and tools';
    $('modalSub').textContent = 'The pipeline is fixed; each stage names the roles, outputs, tools and gate.';
    $('modalGo').style.display = 'none';
    $('modalBody').innerHTML = '<div class="api-note">Loading workflow…</div>';
    try {
      const d = await api('/api/workflow');
      const stages = d.stages || [];
      const roles = d.roles || {};
      const cards = stages.map(s => `
        <div class="wstage">
          <div class="wstage-top"><b>${esc(s.title)}</b><span>${esc(s.phase)}</span></div>
          <p>${esc(s.goal)}</p>
          <div class="wtags">${(s.agents || []).map(r => `<span title="${esc((roles[r] || {}).mission || '')}">${esc((roles[r] || {}).title || r)}</span>`).join('')}</div>
          <div class="wtools">${(s.tools || []).map(t => `<code>${esc(t)}</code>`).join(' ')}</div>
          <div class="wgate"><b>GATE</b> ${esc(s.gate)}</div>
        </div>`).join('');
      $('modalBody').innerHTML = `<div class="api-note">${d.stage_count} gated stages · ${d.role_count} roles · ${esc(d.source_note)}</div><div class="wgrid">${cards}</div>`;
    } catch (e) { $('modalBody').innerHTML = `<div class="api-note">Workflow error: ${esc(e.message)}</div>`; }
  }

  async function openAssets() {
    state.modalMode = 'assets';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'ASSET BOT';
    $('modalTitle').textContent = 'Fetch, licence, register';
    $('modalSub').textContent = 'Host-allowlisted HTTPS only. CC0 downloads directly; restricted licences create an approval request.';
    $('modalGo').style.display = 'none';
    $('modalBody').innerHTML = '<div class="api-note">Loading sources…</div>';
    try {
      const d = await api('/api/assets/sources');
      const opts = (d.sources || []).map(s => `<option value="${esc(s.id)}" data-license="${esc(s.license)}" data-attribution="${esc(s.attribution_required)}">${esc(s.name)} — ${esc(s.license)}</option>`).join('');
      $('modalBody').innerHTML = `<div class="assetform">
        <label>SOURCE<select id="assetSource">${opts}</select></label>
        <label>EXACT ASSET URL<input id="assetUrl" placeholder="https://..."></label>
        <label>LICENCE<input id="assetLicense" value="CC0"></label>
        <label>ATTRIBUTION<input id="assetAttribution" placeholder="required for CC-BY"></label>
        <label>TASK / OWNER<input id="assetTask" placeholder="TASK-ID / image-worker"></label>
        <label>TARGET SKILL<select id="assetTarget"><option>forge-image-worker</option><option>forge-2d-artist</option><option>forge-asset-pointer</option></select></label>
        <button class="primary" id="assetFetch">Fetch & register</button>
        <div class="api-note" id="assetResult">Asset goes to assets/_inbox only. No engine import.</div>
        <hr>
        <div class="api-note">MADE IT LOCALLY? <a href="/pixel/" target="_blank" rel="noopener">Open the pixel editor</a>
          (Piskel, runs locally) - export PNG / sheet / .piskel, then bring it in here.</div>
        <label>IMPORT FILE<input type="file" id="assetFile" accept=".png,.gif,.webp,.json,.piskel,.ogg,.wav,.glb,.gltf"></label>
        <label>LICENCE FOR IMPORT<input id="assetImpLicense" value="operator-declared"></label>
        <button class="primary" id="assetImport">Import & register</button>
        <div class="api-note" id="assetImportResult"></div></div>`;
      const sync = () => {
        const o = $('assetSource').selectedOptions[0];
        $('assetLicense').value = o?.dataset.license || '';
        $('assetAttribution').placeholder = o?.dataset.attribution === 'true' ? 'required for this source' : 'optional';
      };
      $('assetSource').onchange = sync; sync();
      $('assetFetch').onclick = fetchAsset;
      $('assetImport').onclick = importAsset;
      renderAssetFolders();
    } catch (e) { $('modalBody').innerHTML = `<div class="api-note">Asset source error: ${esc(e.message)}</div>`; }
  }


  async function importAsset() {
    const f = $('assetFile').files[0];
    if (!f) { $('assetImportResult').textContent = 'Pick a file first.'; return; }
    const slug = state.current && state.current.slug;
    if (!slug) { $('assetImportResult').textContent = 'Open a project first.'; return; }
    const fd = new FormData();
    fd.append('file', f);
    fd.append('license', $('assetImpLicense').value || 'operator-declared');
    fd.append('kind', f.name.split('.').pop());
    $('assetImportResult').textContent = 'Importing…';
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(slug)}/assets/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || r.status);
      $('assetImportResult').textContent =
        `Registered ${d.asset.path} (${d.asset.bytes} bytes, sha ${d.asset.sha256.slice(0, 12)}) - candidate, waiting for the art director.`;
      setLog(`asset import: ${d.asset.path}`);
    } catch (e) { $('assetImportResult').textContent = 'Import failed: ' + e.message; }
  }

  async function fetchAsset() {
    const url = $('assetUrl').value.trim();
    if (!url) { $('assetUrl').focus(); return; }
    const btn = $('assetFetch'); btn.disabled = true;
    $('assetResult').textContent = 'Fetching…';
    try {
      const d = await api('/api/assets/fetch', { method: 'POST', body: JSON.stringify({
        project: state.current?.slug, source_id: $('assetSource').value, url,
        license: $('assetLicense').value.trim(), attribution: $('assetAttribution').value.trim(),
        owner: 'asset-bot', task: $('assetTask').value.trim(), kind: 'reference',
        to: $('assetTarget').value,
      }) });
      if (d.pending) {
        $('assetResult').innerHTML = `<b>Approval requested:</b> ${esc(d.approval.id)}<br>No file was downloaded. Open <b>Notes</b> to approve or reject.`;
        setLog(`Approval requested ${d.approval.id}; no download.`);
        return;
      }
      $('assetResult').innerHTML = `<b>${esc(d.asset.id)}</b> · ${d.bytes} bytes · ${esc(d.asset.license)}<br>${esc(d.asset.path)}<br><code>${esc(d.asset.hash)}</code>`;
      setLog(`Fetched ${d.asset.id} → ${d.asset.path}`);
    } catch (e) { $('assetResult').textContent = e.message; }
    finally { btn.disabled = false; }
  }

  // ---- asset folder registry + skill browser (added 2026-10-26) -------------
  async function renderAssetFolders() {
    const body = $('modalBody');
    if (!body) return;
    let box = $('assetFolders');
    if (!box) {
      box = document.createElement('div');
      box.id = 'assetFolders';
      box.className = 'assetfolders';
      body.appendChild(box);
    }
    const slug = state.current?.slug || '';
    box.innerHTML = '<div class="api-note">Loading tracked asset folders…</div>';
    try {
      const d = await api('/api/assets/folders' + (slug ? '?project=' + encodeURIComponent(slug) : ''));
      const rows = d.folders || [];
      const total = rows.reduce((n, r) => n + (r.images || 0), 0);
      box.innerHTML = `
        <div class="afhead"><b>ASSET FOLDERS</b><span>${rows.length} tracked · ${total} images</span>
          <button class="ghost small" id="afDiscover">Scan drives</button></div>
        <div class="api-note">Where this game's art actually lives. Track a folder once; every agent reads the same list.</div>
        ${rows.length ? rows.map(r => `
          <div class="afrow">
            <div class="afpath">${esc(r.path)}</div>
            <div class="afmeta">${esc(r.project || 'unassigned')} · ${esc(r.kind || 'mixed')} · ${r.images || 0} images · ${r.mb || 0} MB</div>
          </div>`).join('') : '<div class="api-note">No folders tracked yet. Hit “Scan drives”.</div>'}`;
      const btn = $('afDiscover');
      if (btn) btn.onclick = discoverFolders;
    } catch (e) {
      box.innerHTML = `<div class="api-note">Folder registry error: ${esc(e.message)}</div>`;
    }
  }

  async function discoverFolders() {
    const btn = $('afDiscover');
    if (btn) { btn.disabled = true; btn.textContent = 'Scanning…'; }
    try {
      const d = await api('/api/assets/discover', { method: 'POST', body: JSON.stringify({
        project: '', register: true,
      }) });
      setLog(`Asset scan: ${d.count} folders found, ${d.registered} tracked.`);
      await renderAssetFolders();
    } catch (e) {
      setLog('Asset scan failed: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Scan drives'; }
    }
  }

  async function openSkills() {
    state.modalMode = 'skills';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'SKILLS';
    $('modalTitle').textContent = 'Forge skill library';
    $('modalSub').textContent = 'Each skill is a folder with a SKILL.md. Agents load the matching one before acting.';
    $('modalGo').style.display = 'none';
    $('modalBody').innerHTML = '<div class="api-note">Loading skills…</div>';
    try {
      const d = await api('/api/skills');
      const rows = d.skills || [];
      $('modalBody').innerHTML =
        `<div class="api-note">${rows.length} skills in <code>${esc(d.root || '')}</code></div>` +
        rows.map(s => `
          <div class="skillcard">
            <div class="skillcard-top"><b>${esc(s.id)}</b><span>${esc(s.name)}</span></div>
            <p>${esc(s.description || 'no description')}</p>
            <div class="skillcard-meta">${s.references ? 'references · ' : ''}${s.tools ? 'tools · ' : ''}${Math.round((s.bytes || 0) / 1024)} KB</div>
          </div>`).join('');
    } catch (e) { $('modalBody').innerHTML = `<div class="api-note">Skill error: ${esc(e.message)}</div>`; }
  }

  async function openSchematic() {
    state.modalMode = 'schematic';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'SCHEMATIC';
    $('modalTitle').textContent = 'Structure board';
    $('modalSub').textContent = 'The paper for this project, plus the append-only ledger of how it changed.';
    $('modalGo').style.display = 'none';
    $('modalBody').innerHTML = '<div class="api-note">Loading board…</div>';
    const slug = state.current?.slug;
    if (!slug) { $('modalBody').innerHTML = '<div class="api-note">Open a project first.</div>'; return; }
    try {
      const d = await api(`/api/projects/${encodeURIComponent(slug)}/schematic`);
      const ledger = (d.ledger || []).slice().reverse();
      $('modalBody').innerHTML = `
        <div class="api-note">${d.lines} lines · ${Math.round((d.bytes || 0) / 1024)} KB · <code>${esc(d.path || 'no board file')}</code></div>
        ${d.board ? `<pre class="schematic">${esc(d.board)}</pre>`
                  : '<div class="api-note">No board file yet. Generate one into <code>docs/GAME-INDEX.txt</code>.</div>'}
        <div class="schead"><b>LEDGER</b><span>${ledger.length} entries · append-only</span></div>
        <div class="ledger">${ledger.length ? ledger.map((e) => `
          <div class="ledrow">
            <div class="ledmeta">${esc(e.ts)} · ${esc(e.author)} · ${esc(e.kind)}</div>
            <div>${esc(e.note)}</div>
          </div>`).join('') : '<div class="api-note">No entries yet.</div>'}</div>
        <div class="ledadd">
          <input id="ledNote" placeholder="Append an entry to the ledger…">
          <button class="primary" id="ledAdd">Append</button>
        </div>`;
      $('ledAdd').onclick = async () => {
        const note = $('ledNote').value.trim();
        if (!note) { $('ledNote').focus(); return; }
        $('ledAdd').disabled = true;
        try {
          await api(`/api/projects/${encodeURIComponent(slug)}/schematic/ledger`, {
            method: 'POST',
            body: JSON.stringify({ note, author: 'operator', kind: 'note' }),
          });
          setLog('Schematic ledger appended.');
          await openSchematic();
        } catch (e) { setLog('Ledger append failed: ' + e.message); $('ledAdd').disabled = false; }
      };
    } catch (e) {
      $('modalBody').innerHTML = `<div class="api-note">Schematic error: ${esc(e.message)}</div>`;
    }
  }

  async function openNotes() {
    state.modalMode = 'notes';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'AGENT NOTES';
    $('modalTitle').textContent = 'Pending approvals';
    $('modalSub').textContent = 'Each approval is recorded with sender, job, timestamp and resolution.';
    $('modalGo').style.display = 'none';
    $('modalBody').innerHTML = '<div class="api-note">Loading approvals…</div>';
    try {
      const d = await api('/api/notes/approvals');
      const list = d.approvals || [];
      if (!list.length) {
        $('modalBody').innerHTML = '<div class="api-note">No pending approvals. The notes bus is clear.</div>';
        return;
      }
      $('modalBody').innerHTML = `<div class="api-note">${list.length} pending approval request(s)</div>` + list.map(n => `
        <div class="notecard">
          <div class="notecard-top"><b>${esc(n.skill)}</b><span>${esc(n.kind)}</span></div>
          <div class="notecard-meta">${esc(n.from)} → ${esc(n.to)} · ${esc(n.job || 'no job')} · ${esc(n.time_iso)}</div>
          <p>${esc(n.message)}</p>
          ${(n.paths || []).map(p => `<code>${esc(p)}</code>`).join(' ')}
          <div class="notecard-actions">
            <button class="primary small" data-approve="${esc(n.skill)}|${esc(n.id)}">Approve</button>
            <button class="ghost small" data-reject="${esc(n.skill)}|${esc(n.id)}">Reject</button>
          </div>
        </div>`).join('');
      $('modalBody').querySelectorAll('button[data-approve]').forEach(b => b.onclick = () => resolveApproval(b.dataset.approve, 'approved'));
      $('modalBody').querySelectorAll('button[data-reject]').forEach(b => b.onclick = () => resolveApproval(b.dataset.reject, 'rejected'));
    } catch (e) { $('modalBody').innerHTML = `<div class="api-note">Notes error: ${esc(e.message)}</div>`; }
  }

  async function resolveApproval(encoded, decision) {
    const [skill, noteId] = encoded.split('|');
    const note = window.prompt('Decision note (audit trail):', decision === 'approved' ? 'Approved by operator.' : 'Rejected by operator.');
    if (note === null) return;
    try {
      await api('/api/skills/' + encodeURIComponent(skill) + '/notes/' + encodeURIComponent(noteId) + '/resolve', {
        method: 'POST', body: JSON.stringify({ decision, by: 'operator', note }),
      });
      await openNotes();
    } catch (e) { alert(e.message); }
  }

  function openPlan() {
    state.modalMode = 'plan';
    $('modal').hidden = false;
    $('modalKicker').textContent = 'PLANNING BOARD';
    $('modalTitle').textContent = 'Tasks, owners and gates';
    $('modalSub').textContent = 'Read-only gate view. A task cannot be dispatched while a dependency is incomplete.';
    $('modalGo').style.display = 'none';
    if (!state.current) {
      $('modalBody').innerHTML = '<div class="api-note">Select a project first.</div>';
      return;
    }
    const tasks = state.tasks || [];
    const done = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
    const blocked = tasks.filter(t => (t.depends_on || []).some(d => !done.has(d)));
    const groups = {};
    for (const t of tasks) {
      const k = String(t.phase || 'other').toUpperCase();
      (groups[k] ||= []).push(t);
    }
    const cards = Object.entries(groups).map(([phase, list]) => `
      <div class="planphase"><div class="planphase-head"><b>${esc(phase)}</b><span>${list.length} tasks</span></div>
        ${list.map(t => {
          const missing = (t.depends_on || []).filter(d => !done.has(d));
          return `<div class="plantask ${statusClass(t.status)} ${missing.length ? 'blocked' : ''}">
            <div class="plantask-top"><b>${esc(t.title)}</b><span>${esc(t.status)}</span></div>
            <div class="plantask-meta">${esc(t.id)} · ${esc(t.owner || 'unowned')}${missing.length ? ' · BLOCKED BY ' + missing.map(esc).join(', ') : ''}</div>
            <div class="plantask-desc">${esc(t.description || '')}</div>
            <div class="plantask-evidence">EVIDENCE ${(t.evidence || []).length}</div>
          </div>`;
        }).join('')}
      </div>`).join('');
    $('modalBody').innerHTML = `<div class="api-note">${tasks.length} tasks · ${blocked.length} blocked · ${done.size} done<br>Blocked tasks are advisory until their dependency is done; the Dispatcher enforces 409.</div><div class="planwrap">${cards}</div>`;
  }

  function closeModal() {
    clearInterval(gauntletTimer);
    gauntletTimer = null;
    $('modal').hidden = true;
    $('modalGo').style.display = '';
  }

  async function modalGo() {
    $('modal').hidden = true;
    $('modalGo').style.display = '';
  }

  async function modalGo() {
    const mode = state.modalMode;
    $('modalGo').disabled = true;
    try {
      if (mode === 'new') {
        const name = $('newName').value.trim();
        if (!name) throw new Error('Name required');
        const profileId = $('newProfile').value;
        const d = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name, profile: profileId }) });
        await reload();
        const p = state.projects.find(x => x.slug === d.project.slug);
        if (p) await selectProject(p);
      } else if (mode === 'adopt') {
        const path = $('adoptPath').value.trim();
        if (!path) throw new Error('Path required');
        const profileId = $('adoptProfile').value;
        const d = await api('/api/adopt', { method: 'POST', body: JSON.stringify({ path, profile: profileId }) });
        await reload();
        const p = state.projects.find(x => x.slug === d.project.slug);
        if (p) await selectProject(p);
      }
      closeModal();
    } catch (e) {
      alert(e.message);
    } finally {
      $('modalGo').disabled = false;
    }
  }

  function setBridgeUI(status) {
    const nv = !!status.nvidia_bridge;
    const lq = !!status.local_bridge;
    const brain = status.brain || {};
    const hm = !!brain.ready;
    $('nvDot').className = 'dot ' + (nv ? 'green' : 'red');
    $('nvState').textContent = nv ? 'ready' : 'offline';
    $('lqDot').className = 'dot ' + (lq ? 'green' : 'red');
    $('lqState').textContent = lq ? 'ready' : 'offline';
    $('hmDot').className = 'dot ' + (hm ? 'green' : 'red');
    $('hmState').textContent = hm ? (brain.tier || 'ready') : 'offline';
  }

  async function reload() {
    const [status, projects] = await Promise.all([api('/api/status'), api('/api/projects')]);
    state.status = status;
    renderConsoleChip(status);
    state.projects = projects.projects || [];
    $('ocState').textContent = status.opencode ? 'ready' : 'missing';
    $('ocState').style.color = status.opencode ? 'var(--green)' : 'var(--red)';
    setBridgeUI(status);
    renderProjects();
    if (!state.current && state.projects.length) {
      await selectProject(state.projects[0]);
    } else if (state.current) {
      const p = state.projects.find(x => x.slug === state.current.slug);
      if (p) state.current = p;
    }
  }

  function bind() {
    $('newProject').onclick = () => openModal('new');
    $('openProject').onclick = () => openModal('adopt');
    $('apiHelp').onclick = () => openModal('api');
    $('brainOpen').onclick = () => openModal('brain');
    $('harnessHelp').onclick = () => openModal('harness');
    $('gauntletOpen').onclick = openGauntlet;
    $('workflowOpen').onclick = openWorkflow;
    $('planOpen').onclick = openPlan;
    if ($('buildOpen')) $('buildOpen').onclick = () => openModal('build');
    if ($('freeBuildOpen')) $('freeBuildOpen').onclick = () => openModal('freebuild');
    renderConsoleChip(state.status);
    if ($('autoRun')) $('autoRun').onclick = toggleAutoRun;
    setInterval(refreshAutoRun, 5000);
    if ($('pixelOpen')) $('pixelOpen').onclick = () => window.open('/pixel/', '_blank', 'noopener');
    $('assetsOpen').onclick = openAssets;
    $('skillsOpen').onclick = openSkills;
    $('schematicOpen').onclick = openSchematic;
    $('notesOpen').onclick = openNotes;
    $('dispatcherOpen').onclick = openDispatcher;
    $('dClose').onclick = closeDispatcher;
    $('dRefresh').onclick = refreshDispatcher;
    $('dCreate').onclick = createDispatchJob;
    $('dTest').onclick = runDispatcherTest;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('dispatcher').hidden) closeDispatcher();
      else if (!$('modal').hidden) closeModal();
    });
    $('closeModal').onclick = closeModal;
    $('modalCancel').onclick = closeModal;
    $('modalGo').onclick = modalGo;
    $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });
    $('build').onclick = startBuild;
    $('stop').onclick = stopBuild;
    $('markDone').onclick = markDone;
    $('dispatchTask').onclick = dispatchTask;
    $('refreshPreview').onclick = refreshPreview;

    // ---- git bridge buttons (2026-10-26) ----------------------------------
    const gitAction = async (kind) => {
      const slug = state.current?.slug;
      if (!slug) return setLog('Open a project first.');
      const btns = ['gitPull', 'gitSync', 'gitPush', 'gitPost'].map((id) => $(id));
      btns.forEach((b) => { if (b) b.disabled = true; });
      setLog(`git ${kind}: ${slug} …`);
      try {
        const body = kind === 'post' ? { confirm: true } : {};
        const d = await api(`/api/projects/${encodeURIComponent(slug)}/git/${kind}?target=${state.gitTarget}`,
          { method: 'POST', body: JSON.stringify(body) });
        if (d.error) setLog(`git ${kind} refused: ${d.error}`);
        else if (kind === 'post') setLog(`post: pushed=${d.pushed} head=${d.head} live=${d.verified ? 'VERIFIED' : 'not yet'} (${d.waited_s}s)`);
        else if (kind === 'pull') setLog(`pull: ${d.copied} files into site · head ${d.head}`);
        else if (kind === 'sync') setLog(`sync: ${d.copied} files staged\n${d.staged_stat || ''}`);
        else setLog(`push: pushed=${d.pushed} head=${d.head}`);
        if (d.verified) refreshPreview();
      } catch (e) { setLog(`git ${kind} failed: ${e.message}`); }
      finally { btns.forEach((b) => { if (b) b.disabled = false; }); await gitStatus(); }
    };
    const gitStatus = async () => {
    state.gitTarget = state.gitTarget || 'site';
      const slug = state.current?.slug;
      const el = $('gitStatus');
      if (!el) return;
      if (!slug) { el.textContent = 'no project'; return; }
      try {
        const d = await api(`/api/projects/${encodeURIComponent(slug)}/git?target=${state.gitTarget}`);
        if (d.error) { el.textContent = d.error; return; }
        const c = d.site_diff?.counts || {};
        const drift = (c.changed || 0) + (c.only_site || 0);
        el.textContent = `${d.head} · ${d.behind}↓ ${d.ahead}↑ · site≠repo ${drift} · outside ${(d.dirty_outside || []).length}`;
        el.className = 'gitstatus' + ((d.dirty_outside || []).length ? ' warn' : drift ? ' dirty' : '');
      } catch (e) { el.textContent = e.message; }
      // Unity titles choose which repo Pull/Sync/Push act on: SITE (web repo feeding the preview)
      // or UNITY (the Unity source project's own repo). Inside gitStatus so it follows selection.
      const tg = $('gitTargetWrap');
      if (tg) {
        const isUnity = !!(state.current && state.current.is_unity);
        tg.style.display = isUnity ? 'inline-flex' : 'none';
        const btnSite = $('gitTargetSite'), btnUnity = $('gitTargetUnity');
        if (btnSite) btnSite.onclick = () => { state.gitTarget = 'site'; gitStatus(); };
        if (btnUnity) btnUnity.onclick = () => { state.gitTarget = 'unity'; gitStatus(); };
        if (btnSite) btnSite.classList.toggle('on', state.gitTarget === 'site');
        if (btnUnity) btnUnity.classList.toggle('on', state.gitTarget === 'unity');
      }
    };
    if ($('refreshPreview')) $('refreshPreview').onclick = refreshPreviewNow;
    if ($('previewRefresh')) $('previewRefresh').onclick = refreshPreviewNow;
    if ($('gitPull')) $('gitPull').onclick = () => gitAction('pull');
    if ($('gitSync')) $('gitSync').onclick = () => gitAction('sync');
    if ($('gitPush')) $('gitPush').onclick = () => gitAction('push');
    if ($('gitPost')) $('gitPost').onclick = () => {
      if (confirm('Post this game live?\n\nThis copies site/ into the repo, commits the game folder and pushes.')) gitAction('post');
    };
    window.__gitStatus = gitStatus;
    setTimeout(() => gitStatus(), 800);
    if ($('bootUnity')) $('bootUnity').onclick = async () => {
      const slug = state.current?.slug;
      if (!slug) return setLog('Open a Unity project first.');
      setLog(`unity: booting ${slug} …`);
      try {
        const d = await api(`/api/projects/${encodeURIComponent(slug)}/unity/boot`,
          { method: 'POST', body: '{}' });
        if (d.error) setLog('unity boot refused: ' + d.error);
        else setLog(`unity ${d.version}: editor started\n  ${d.editor}\n  project: ${d.project}\n  ${d.note || ''}`);
      } catch (e) { setLog('unity boot failed: ' + e.message); }
    };
    // keep the strip honest: cheap local call, only while a project is open
    setInterval(() => { if (state.current && state.current.slug) gitStatus(); }, 5000);
    $('fullPreview').onclick = () => {
      if (state.current && !state.current.is_unity) window.open(`/preview/${encodeURIComponent(state.current.slug)}/`, '_blank');
    };
    $('openFolder').onclick = () => {
      if (state.current) {
        navigator.clipboard?.writeText(state.current.path).catch(() => {});
        setLog(`Project folder:\n${state.current.path}\n(path copied)`);
      }
    };
    $('model').onchange = () => { localStorage.setItem('forge.model', $('model').value); updateModelRoute(); };
    $('prompt').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); startBuild(); }
    });
    $('prompt').addEventListener('input', () => {
      $('build').disabled = !state.current || (!state.selected && !$('prompt').value.trim());
    });
    document.querySelectorAll('#quick button').forEach(b => {
      b.onclick = () => { $('prompt').value = b.dataset.p; $('prompt').focus(); $('build').disabled = !state.current; };
    });
  }

  let dispatcherTimer = null;
  let dispatcherSkills = [];

  function fmtAge(ts) {
    if (!ts) return '—';
    const s = Math.max(0, Math.round((Date.now() / 1000) - ts));
    if (s < 60) return s + 's';
    if (s < 3600) return Math.round(s / 60) + 'm';
    return Math.round(s / 3600) + 'h';
  }

  function statusClass(s) {
    return String(s || 'offline').replace(/[^a-z-]/g, '');
  }

  async function openDispatcher() {
    $('dispatcher').hidden = false;
    try {
      const d = await api('/api/dispatcher/skills');
      dispatcherSkills = d.skills || [];
      const sel = $('dSkill');
      sel.innerHTML = '';
      for (const s of dispatcherSkills) {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.id.replace('forge-', '').replace(/-worker$/, '') + ' · ' + s.title;
        sel.appendChild(o);
      }
      if ([...sel.options].some(o => o.value === 'forge-qa-worker')) sel.value = 'forge-qa-worker';
    } catch (e) { setLog('Dispatcher skills error: ' + e.message); }
    refreshDispatcher();
    clearInterval(dispatcherTimer);
    dispatcherTimer = setInterval(refreshDispatcher, 4000);
  }

  function closeDispatcher() {
    $('dispatcher').hidden = true;
    clearInterval(dispatcherTimer);
    dispatcherTimer = null;
  }


  function renderConsoleChip(st) {
    const el = document.getElementById('consoleChip');
    if (!el) return;
    const c = (st && st.console) || {};
    if (!c.up) {
      el.textContent = 'console offline';
      el.title = c.error || 'no /api/health';
      // the first render happens before the status fetch resolves - ask for the real state once
      if (!renderConsoleChip._retry) {
        renderConsoleChip._retry = true;
        fetch('/api/status').then(r => r.json()).then(s => {
          if (s && s.console) renderConsoleChip(s);
        }).catch(() => {});
      }
      return;
    }
    el.textContent = `${c.build} · engine ${c.engine || '?'} · ${c.selected || '?'} · ${c.models || '?'} models · ` +
                     `${c.ram_gb} GB free · ${(c.hermes_api || '').split('/').pop() || '—'}`;
    el.title = `${c.release_tag || ''}\nAPI brain: ${c.hermes_api || '—'}\nGPU free: ${c.gpu_free_mib} MiB\n${c.signature || ''}`;
  }


  async function refreshAutoRun() {
    try {
      const d = await api('/api/dispatcher/auto');
      const a = d.auto || {};
      const el = $('autoRunState');
      const btn = $('autoRun');
      if (el) el.textContent = a.enabled ? 'AUTORUN ON · ' + (a.project || 'no project') : 'autorun off';
      if (btn) btn.classList.toggle('on', !!a.enabled);
      if (a.enabled) {
        const st = await api('/api/dispatcher/state');
        const live = (st.jobs || []).filter(j => ['working', 'queued'].includes(j.status));
        if (el && live.length) el.textContent = 'AUTORUN · ' + live[0].status + ' ' + (live[0].title || '').slice(0, 28);
      }
    } catch (e) { /* keep quiet in the log */ }
  }

  async function toggleAutoRun() {
    const slug = state.current && state.current.slug;
    if (!slug) { setLog('Open a project first.'); return; }
    try {
      const cur = await api('/api/dispatcher/auto');
      const on = !(cur.auto || {}).enabled;
      const d = await api('/api/dispatcher/auto', {
        method: 'POST',
        body: JSON.stringify({ enabled: on, project: slug }),
      });
      setLog(on ? `AUTORUN ON for ${slug} - dispatching the next ready task, then verifying and marking it done.`
                : 'AUTORUN off.');
      if (on) api('/api/dispatcher/supervise', { method: 'POST' }).catch(() => {});
      await refreshAutoRun();
      await refreshDispatcher();
    } catch (e) { setLog('AUTORUN failed: ' + e.message); }
  }

  async function refreshDispatcher() {
    try {
      const [d, a] = await Promise.all([
        api('/api/dispatcher/state'),
        api('/api/dispatcher/auto').catch(() => null),
      ]);
      renderDispatcher(d, a);
    } catch (e) {
      $('dMaster').innerHTML = `<span class="mstat">Dispatcher error: ${esc(e.message)}</span>`;
    }
  }

  function renderDispatcher(d, autos) {
    $('dLinked').textContent = String(d.linked || 0);
    const m = d.master;
    $('dMaster').innerHTML = m ? `
      <div><b>${esc(m.name)}</b><div class="mstat">MASTER · ${esc(m.model)} · ${esc(m.status)}</div></div>
      <div class="mstat">${esc(m.detail || '')}<br>Jobs: ${(d.jobs || []).length} · counts ${esc(JSON.stringify(d.counts || {}))}</div>
      <div class="mstat">Only dispatchable workers are shown here; GUI-only tools remain under Tools.</div>` : '<span class="mstat">No master agent.</span>';

    const host = $('dMaster');
    let box = document.getElementById('dAutoBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dAutoBox';
      box.className = 'api-note';
      box.style.marginTop = '6px';
      host.appendChild(box);
    }
    if (autos && autos.auto) {
      const a = autos.auto;
      box.innerHTML = `<b>AUTO</b>
        <label style="margin-left:8px"><input type="checkbox" id="dAutoOn"> run the board without clicks</label>
        <select id="dAutoProject" style="margin-left:8px"></select>
        <span id="dAutoState" class="mstat" style="margin-left:8px"></span>`;
      const on = box.querySelector('#dAutoOn');
      const sel = box.querySelector('#dAutoProject');
      const state = box.querySelector('#dAutoState');
      on.checked = !!a.enabled;
      state.textContent = a.enabled
        ? `ON · ${a.project || 'no project'} · ${a.last_action || 'waiting'}`
        : 'OFF';
      api('/api/projects').then(p => {
        (p.projects || []).forEach(x => {
          const o = document.createElement('option');
          o.value = x.slug; o.textContent = x.slug;
          sel.appendChild(o);
        });
        sel.value = a.project || '';
      }).catch(() => {});
      const push = async () => {
        try {
          const r = await api('/api/dispatcher/auto', {
            method: 'POST',
            body: JSON.stringify({ enabled: on.checked, project: sel.value }),
          });
          state.textContent = r.auto.enabled ? `ON · ${r.auto.project}` : 'OFF';
        } catch (e) { state.textContent = 'error: ' + e.message; }
      };
      on.onchange = push;
      sel.onchange = push;
    }

    const grid = $('dAgents');
    grid.innerHTML = '';
    for (const a of (d.agents || []).filter(x => x.kind !== 'master' && x.dispatchable !== false)) {
      const st = statusClass(a.status);
      const stats = a.stats || {};
      const card = document.createElement('div');
      card.className = 'agent ' + st;
      card.innerHTML = `
        <div class="agent-top"><div><div class="agent-name">${esc(a.name)}</div><div class="agent-model">${esc(a.kind)} · ${esc(a.model)}</div></div><span class="agent-status">${esc(a.status)}</span></div>
        <div class="agent-detail">${esc(a.detail || '')}${a.current_job ? '<br>NOW: ' + esc(a.current_job) : ''}</div>
        ${(a.capabilities || []).length ? `<div class="agent-detail">CAPS: ${a.capabilities.map(esc).join(' · ')}</div>` : ''}
        <div class="agent-skills">${(a.skills || []).map(s => `<span>${esc(s)}</span>`).join('')}</div>
        <div class="agent-stats"><span>DONE <b>${stats.done || 0}</b></span><span>FAIL <b>${stats.failed || 0}</b></span><span>AVG <b>${stats.done ? Math.round((stats.total_seconds || 0) / stats.done) + 's' : '—'}</b></span><span>SEEN <b>${fmtAge(a.last_seen)}</b></span></div>
        ${a.dispatchable ? `<button class="ghost small" data-probe="${esc(a.id)}">Probe</button>` : ''}`;
      grid.appendChild(card);
    }
    grid.querySelectorAll('button[data-probe]').forEach(b => {
      b.onclick = async () => {
        try { const pr = await api('/api/dispatcher/agents/' + encodeURIComponent(b.dataset.probe) + '/probe', { method: 'POST' }); if (pr && pr.error) setLog('Probe: ' + pr.error); await refreshDispatcher(); }
        catch (e) { setLog('Probe error: ' + e.message); }
      };
    });

    const jobs = $('dJobs');
    jobs.innerHTML = '';
    if (!(d.jobs || []).length) {
      jobs.innerHTML = '<div class="sub">No jobs yet. Queue a job or run the read-only test.</div>';
      return;
    }
    for (const j of d.jobs) {
      const el = document.createElement('div');
      el.className = 'job';
      el.innerHTML = `
        <div><div class="job-title">${esc(j.title)}</div>
          <div class="job-meta">${esc(j.id)} · ${esc(j.project)} · ${esc(j.skill)} · ${esc(j.agent_name || 'unassigned')}${j.elapsed != null ? ' · ' + j.elapsed + 's' : ''}</div>
          ${j.error ? `<div class="job-result" style="color:var(--red)">${esc(j.error)}</div>` : ''}
          ${j.result ? `<div class="job-result">${esc(j.result)}</div>` : ''}
          <div class="job-actions">
            ${j.status === 'queued' || j.status === 'rework' ? `<button class="primary small" data-dispatch="${esc(j.id)}">Dispatch</button>` : ''}
            ${j.status === 'returned' ? `<button class="primary small" data-approve="${esc(j.id)}">Accept</button><button class="ghost small" data-rework="${esc(j.id)}">Rework</button>` : ''}
            ${j.status === 'failed' ? `<button class="ghost small" data-retry="${esc(j.id)}">Retry</button>` : ''}
          </div></div>
        <span class="job-status ${statusClass(j.status)}">${esc(j.status)}</span>`;
      jobs.appendChild(el);
    }
    jobs.querySelectorAll('button[data-dispatch]').forEach(b => b.onclick = async () => {
      try { await api('/api/dispatcher/jobs/' + encodeURIComponent(b.dataset.dispatch) + '/dispatch', { method: 'POST', body: '{}' }); await refreshDispatcher(); }
      catch (e) { setLog('Dispatch error: ' + e.message); }
    });
    jobs.querySelectorAll('button[data-approve]').forEach(b => b.onclick = async () => {
      try { await api('/api/dispatcher/jobs/' + encodeURIComponent(b.dataset.approve) + '/approve', { method: 'POST', body: JSON.stringify({ verdict: 'accepted', note: 'Accepted by operator' }) }); await refreshDispatcher(); }
      catch (e) { setLog('Approve error: ' + e.message); }
    });
    jobs.querySelectorAll('button[data-rework]').forEach(b => b.onclick = async () => {
      const note = window.prompt('Rework note for the worker:', '');
      if (!note) return;
      try { await api('/api/dispatcher/jobs/' + encodeURIComponent(b.dataset.rework) + '/approve', { method: 'POST', body: JSON.stringify({ verdict: 'rework', note }) }); await refreshDispatcher(); }
      catch (e) { setLog('Rework error: ' + e.message); }
    });
    jobs.querySelectorAll('button[data-retry]').forEach(b => b.onclick = async () => {
      try { await api('/api/dispatcher/jobs/' + encodeURIComponent(b.dataset.retry) + '/retry', { method: 'POST', body: '{}' }); await refreshDispatcher(); }
      catch (e) { setLog('Retry error: ' + e.message); }
    });
  }

  async function createDispatchJob() {
    if (!state.current) { alert('Select a project first.'); return; }
    const title = $('dTitle').value.trim() || 'Forge dispatch job';
    const brief = $('dBrief').value.trim();
    if (!brief) { $('dBrief').focus(); return; }
    $('dCreate').disabled = true;
    try {
      const d = await api('/api/dispatcher/jobs', { method: 'POST', body: JSON.stringify({ project: state.current.slug, title, brief, skill: $('dSkill').value, auto: true }) });
      setLog('Queued ' + d.job.id + ' → ' + (d.job.agent_name || 'waiting'));
      $('dTitle').value = '';
      $('dBrief').value = '';
      await refreshDispatcher();
    } catch (e) { alert(e.message); }
    finally { $('dCreate').disabled = false; }
  }

  async function runDispatcherTest() {
    if (!state.current) { alert('Select a project first.'); return; }
    $('dTest').disabled = true;
    try {
      const d = await api('/api/dispatcher/test', { method: 'POST', body: JSON.stringify({ project: state.current.slug }) });
      setLog('Dispatcher test queued: ' + d.job.id + ' on ' + (d.job.agent_name || 'local-qwen'));
      await refreshDispatcher();
    } catch (e) { alert(e.message); }
    finally { $('dTest').disabled = false; }
  }

  async function boot() {
    bind();
    try {
      const [status, projects, harness] = await Promise.all([api('/api/status'), api('/api/projects'), api('/api/harness')]);
      state.status = status;
      state.projects = projects.projects || [];
      state.harness = harness;
      renderModels();
      renderProjects();
      setBridgeUI(status);
      $('ocState').textContent = status.opencode ? 'ready' : 'missing';
      if (state.projects.length) {
        await selectProject(state.projects.find(p => p.slug === 'lattice-arena') || state.projects[0]);
      } else {
        openModal('new');
      }
    } catch (e) {
      setLog(`Forge backend error: ${e.message}`);
    }
  }

  boot();
  // REFRESH: reload the frame and SAY what is being served. The whole point is to tell
  // "nothing was built" apart from "the browser is showing a stale frame".
  async function refreshPreviewNow() {
    const slug = state.current && state.current.slug;
    if (!slug) return setLog('Open a project first.');
    const btn = $('refreshPreview');
    if (btn) { btn.disabled = true; btn.textContent = '↻ …'; }
    try {
      if (!state.current.is_unity) {
        const f = $('previewFrame');
        if (f) f.src = `/preview/${encodeURIComponent(slug)}/?v=${Date.now()}`;
      }
      const d = await api(`/api/projects/${encodeURIComponent(slug)}/preview-info`);
      if (d.error) {
        setLog('preview: ' + d.error);
        if ($('previewInfo')) $('previewInfo').textContent = 'no preview: ' + d.error;
      } else {
        const age = d.age_seconds < 90 ? `${d.age_seconds}s` :
                    d.age_seconds < 5400 ? `${Math.round(d.age_seconds / 60)}m` :
                    `${Math.round(d.age_seconds / 3600)}h`;
        const note = d.changed_count
          ? `${d.changed_count} file(s) newer than the page`
          : 'page is current';
        if ($('previewInfo')) {
          $('previewInfo').textContent =
            `${d.served_file} · served ${age} ago · sha ${d.sha256.slice(0, 8)} · ${note}`;
          $('previewInfo').style.color = d.changed_count ? '#ffb454' : '';
        }
        setLog(`preview: ${d.served_file} ${d.size} bytes, sha ${d.sha256.slice(0, 12)}, ${age} old\n` +
               (d.changed_count
                 ? 'newer than the page:\n' + d.changed_after_served.slice(0, 8)
                     .map(x => `  ${x.at}  ${x.kb} KB  ${x.file}`).join('\n')
                 : 'no project file is newer than the page - what you see is the build.'));
      }
    } catch (e) { setLog('preview refresh failed: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '↻ REFRESH'; } }
  }

})();