// ==================== DATA STORE ====================
let state = {
    projects: [],
    entries: [],
    recipients: [],
    sentReports: [], // Track sent report blocks
    breaks: [], // Track breaks within sessions
    settings: {
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24',
        weekStart: 1,
        accentColor: '#6366f1',
        globalRate: 0, // Global default rate
        globalRateEnabled: true
    },
    currentSession: null,
    currentBreak: null,
    selectedProject: null,
    calendarDate: new Date(),
    calendarView: 'month', // month, week, day
    reportPeriod: 'week'
};

const CURRENCY_SYMBOLS = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CAD: '$',
    AUD: '$', CHF: 'Fr', CNY: '¥', INR: '₹', BRL: 'R$'
};

const ACCENT_PRESETS = [
    '#6366f1', // Indigo (default)
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
];

// ==================== INITIALIZATION ====================
function init() {
    loadData();
    applyAccentColor(state.settings.accentColor);
    updateClock();
    setInterval(updateClock, 1000);
    setupNavigation();
    setupColorPicker();
    setupTabs();
    setupPeriodToggle();
    setupCalendarViewToggle();
    setupAccentColorPicker();
    renderAll();

    // Set default date for entry modal
    const entryDateEl = document.getElementById('entryDate');
    if (entryDateEl) {
        entryDateEl.valueAsDate = new Date();
    }

    // Restore session UI if active
    if (state.currentSession) {
        updateClockButtonState();
    }
}

function loadData() {
    const saved = localStorage.getItem('timeflow_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };

        // Restore session dates
        if (state.currentSession) {
            state.currentSession.startTime = new Date(state.currentSession.startTime);
            if (state.currentSession.breaks) {
                state.currentSession.breaks = state.currentSession.breaks.map(b => ({
                    ...b,
                    startTime: new Date(b.startTime),
                    endTime: b.endTime ? new Date(b.endTime) : null
                }));
            }
        }
        if (state.currentBreak) {
            state.currentBreak.startTime = new Date(state.currentBreak.startTime);
        }

        // Ensure new properties exist
        if (!state.sentReports) state.sentReports = [];
        if (!state.settings.accentColor) state.settings.accentColor = '#6366f1';
        if (state.settings.globalRate === undefined) state.settings.globalRate = 0;
        if (state.settings.globalRateEnabled === undefined) state.settings.globalRateEnabled = true;
    }

    // Apply settings to UI
    const currencySelect = document.getElementById('currencySelect');
    const dateFormatSelect = document.getElementById('dateFormatSelect');
    const timeFormatSelect = document.getElementById('timeFormatSelect');
    const weekStartSelect = document.getElementById('weekStartSelect');
    const globalRateInput = document.getElementById('globalRateInput');
    const globalRateEnabled = document.getElementById('globalRateEnabled');

    if (currencySelect) currencySelect.value = state.settings.currency;
    if (dateFormatSelect) dateFormatSelect.value = state.settings.dateFormat;
    if (timeFormatSelect) timeFormatSelect.value = state.settings.timeFormat;
    if (weekStartSelect) weekStartSelect.value = state.settings.weekStart;
    if (globalRateInput) globalRateInput.value = state.settings.globalRate || '';
    if (globalRateEnabled) globalRateEnabled.checked = state.settings.globalRateEnabled;
}

function saveData() {
    localStorage.setItem('timeflow_data', JSON.stringify({
        projects: state.projects,
        entries: state.entries,
        recipients: state.recipients,
        sentReports: state.sentReports,
        settings: state.settings,
        currentSession: state.currentSession,
        currentBreak: state.currentBreak,
        selectedProject: state.selectedProject
    }));
}

// ==================== THEME / ACCENT COLOR ====================
function applyAccentColor(color) {
    // Convert hex to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);

    // Update logo gradient
    const logoGradient = document.getElementById('logoGradient');
    if (logoGradient) {
        logoGradient.innerHTML = `
            <stop stop-color="${color}"/>
            <stop offset="1" stop-color="#22c55e"/>
        `;
    }
}

function setupAccentColorPicker() {
    const picker = document.getElementById('accentColorPicker');
    if (picker) {
        picker.value = state.settings.accentColor;
        picker.addEventListener('input', (e) => {
            updateAccentColor(e.target.value);
        });
    }

    // Preset buttons
    document.querySelectorAll('.accent-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            updateAccentColor(color);
            if (picker) picker.value = color;
        });
    });

    updateAccentPresetSelection();
}

function updateAccentColor(color) {
    state.settings.accentColor = color;
    applyAccentColor(color);
    updateAccentPresetSelection();
    saveData();
}

function updateAccentPresetSelection() {
    document.querySelectorAll('.accent-preset').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === state.settings.accentColor);
    });
}

// ==================== CLOCK & TIME ====================
function updateClock() {
    const now = new Date();
    const timeStr = formatTime(now, true);
    const currentTimeEl = document.getElementById('currentTime');
    const currentDateEl = document.getElementById('currentDate');

    if (currentTimeEl) currentTimeEl.textContent = timeStr;
    if (currentDateEl) currentDateEl.textContent = formatDate(now, true);

    // Update session duration if clocked in
    if (state.currentSession) {
        updateSessionDuration();
    }
}

function updateSessionDuration() {
    const now = new Date();
    let totalDuration = now - state.currentSession.startTime;

    // Subtract completed breaks
    if (state.currentSession.breaks) {
        state.currentSession.breaks.forEach(b => {
            if (b.endTime) {
                totalDuration -= (b.endTime - b.startTime);
            }
        });
    }

    // Subtract current break if on break
    if (state.currentBreak) {
        totalDuration -= (now - state.currentBreak.startTime);
    }

    const sessionDurationEl = document.getElementById('sessionDuration');
    if (sessionDurationEl) {
        sessionDurationEl.textContent = formatDuration(Math.max(0, totalDuration));
        sessionDurationEl.classList.toggle('on-break', !!state.currentBreak);
    }

    // Update break info
    const breakInfoEl = document.getElementById('breakInfo');
    if (breakInfoEl) {
        if (state.currentBreak) {
            const breakDuration = now - state.currentBreak.startTime;
            breakInfoEl.style.display = 'block';
            breakInfoEl.textContent = `On break: ${formatDuration(breakDuration)}`;
        } else {
            breakInfoEl.style.display = 'none';
        }
    }
}

function formatTime(date, includeSeconds = false) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    if (state.settings.timeFormat === '12') {
        const period = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return includeSeconds
            ? `${h12}:${minutes}:${seconds} ${period}`
            : `${h12}:${minutes} ${period}`;
    }

    return includeSeconds
        ? `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`
        : `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function formatDate(date, full = false) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    if (full) {
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();

    switch (state.settings.dateFormat) {
        case 'MM/DD/YYYY': return `${m}/${d}/${y}`;
        case 'YYYY-MM-DD': return `${y}-${m}-${d}`;
        default: return `${d}/${m}/${y}`;
    }
}

function formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}:${m.toString().padStart(2, '0')}` : `${h}:00`;
}

function formatCurrency(amount) {
    return `${state.settings.currencySymbol}${amount.toFixed(2)}`;
}

// ==================== CLOCK IN/OUT WITH BREAKS ====================
function toggleClock() {
    if (state.currentSession) {
        if (state.currentBreak) {
            // Currently on break - end break and clock out
            endBreak();
        }
        clockOut();
    } else {
        clockIn();
    }
}

function clockIn() {
    if (!state.selectedProject) {
        showToast('Please select a project first', 'error');
        return;
    }

    const project = state.projects.find(p => p.id === state.selectedProject);

    state.currentSession = {
        projectId: state.selectedProject,
        startTime: new Date(),
        breaks: []
    };

    updateClockButtonState();

    const sessionInfoEl = document.getElementById('sessionInfo');
    const sessionProjectEl = document.getElementById('sessionProject');

    if (sessionInfoEl) sessionInfoEl.style.display = 'block';
    if (sessionProjectEl) sessionProjectEl.textContent = project.name;

    saveData();
    showToast(`Clocked in to ${project.name}`, 'success');
}

function clockOut() {
    const endTime = new Date();
    let totalDuration = endTime - state.currentSession.startTime;

    // Subtract break time
    if (state.currentSession.breaks) {
        state.currentSession.breaks.forEach(b => {
            if (b.endTime) {
                totalDuration -= (b.endTime - b.startTime);
            }
        });
    }

    const hours = totalDuration / 3600000;
    const project = state.projects.find(p => p.id === state.currentSession.projectId);
    const earnings = hours * (project?.rate || 0);

    // Calculate total break time
    let totalBreakTime = 0;
    if (state.currentSession.breaks) {
        state.currentSession.breaks.forEach(b => {
            if (b.endTime) {
                totalBreakTime += (b.endTime - b.startTime);
            }
        });
    }

    const entry = {
        id: generateId(),
        projectId: state.currentSession.projectId,
        date: state.currentSession.startTime.toISOString().split('T')[0],
        startTime: state.currentSession.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: totalDuration,
        hours: hours,
        earnings: earnings,
        notes: '',
        locked: false,
        breakTime: totalBreakTime,
        breaks: state.currentSession.breaks?.length || 0
    };

    state.entries.unshift(entry);
    state.currentSession = null;
    state.currentBreak = null;

    updateClockButtonState();

    const sessionInfoEl = document.getElementById('sessionInfo');
    if (sessionInfoEl) sessionInfoEl.style.display = 'none';

    saveData();
    renderAll();
    showToast(`Clocked out - ${formatHours(hours)} hours recorded`, 'success');
}

function toggleBreak() {
    if (!state.currentSession) return;

    if (state.currentBreak) {
        endBreak();
    } else {
        startBreak();
    }
}

function startBreak() {
    state.currentBreak = {
        startTime: new Date()
    };

    if (!state.currentSession.breaks) {
        state.currentSession.breaks = [];
    }

    updateClockButtonState();
    saveData();
    showToast('Break started', 'success');
}

function endBreak() {
    if (!state.currentBreak) return;

    const breakRecord = {
        startTime: state.currentBreak.startTime,
        endTime: new Date()
    };

    state.currentSession.breaks.push(breakRecord);
    state.currentBreak = null;

    updateClockButtonState();
    saveData();
    showToast('Break ended', 'success');
}

function updateClockButtonState() {
    const clockBtn = document.getElementById('clockBtn');
    const breakBtn = document.getElementById('breakBtn');
    const breakBtnContainer = document.getElementById('breakBtnContainer');

    if (!clockBtn) return;

    if (state.currentSession) {
        clockBtn.classList.add('clocked-in');
        clockBtn.classList.toggle('on-break', !!state.currentBreak);
        clockBtn.querySelector('span').textContent = 'CLOCK OUT';

        if (breakBtnContainer) breakBtnContainer.style.display = 'block';
        if (breakBtn) {
            breakBtn.classList.toggle('active', !!state.currentBreak);
            breakBtn.querySelector('.break-text').textContent = state.currentBreak ? 'RESUME' : 'BREAK';
        }
    } else {
        clockBtn.classList.remove('clocked-in', 'on-break');
        clockBtn.querySelector('span').textContent = 'CLOCK IN';

        if (breakBtnContainer) breakBtnContainer.style.display = 'none';
    }
}

// ==================== PROJECTS ====================
function renderProjects() {
    // Project selector chips
    const selector = document.getElementById('projectSelector');
    if (selector) {
        if (state.projects.length === 0) {
            selector.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No projects yet. Create one to get started!</p>';
        } else {
            selector.innerHTML = state.projects.map(p => `
                <div class="project-chip ${state.selectedProject === p.id ? 'active' : ''}"
                     style="border-color: ${p.color}; ${state.selectedProject === p.id ? `background: ${p.color}` : ''}"
                     onclick="selectProject('${p.id}')">
                    ${p.name}
                </div>
            `).join('');
        }
    }

    // Project list in settings
    const list = document.getElementById('projectList');
    if (list) {
        if (state.projects.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No projects created yet</p></div>';
        } else {
            const totals = calculateProjectTotals();
            list.innerHTML = state.projects.map(p => {
                const total = totals[p.id] || { hours: 0, earnings: 0 };
                return `
                    <div class="project-item">
                        <div class="project-color" style="background: ${p.color}"></div>
                        <div class="project-details">
                            <div class="project-name">${p.name}</div>
                            <div class="project-rate">${p.client ? p.client + ' • ' : ''}${formatCurrency(p.rate || 0)}/hr</div>
                        </div>
                        <div class="project-total">
                            <div class="project-hours">${formatHours(total.hours)}</div>
                            <div class="project-earnings">${formatCurrency(total.earnings)}</div>
                        </div>
                        <div class="entry-actions">
                            <button class="btn btn-secondary btn-icon btn-sm" onclick="editProject('${p.id}')" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="btn btn-danger btn-icon btn-sm" onclick="deleteProject('${p.id}')" title="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Entry modal project dropdown
    const entryProjectSelect = document.getElementById('entryProject');
    if (entryProjectSelect) {
        entryProjectSelect.innerHTML = state.projects.map(p =>
            `<option value="${p.id}">${p.name}</option>`
        ).join('');
    }
}

function selectProject(id) {
    state.selectedProject = id;
    saveData();
    renderProjects();
}

function saveProject() {
    const id = document.getElementById('editProjectId').value;
    const name = document.getElementById('projectName').value.trim();
    const client = document.getElementById('projectClient').value.trim();
    let rate = parseFloat(document.getElementById('projectRate').value) || 0;
    const color = document.querySelector('.color-option.selected')?.dataset.color || '#6366f1';

    if (!name) {
        showToast('Please enter a project name', 'error');
        return;
    }

    // Use global rate if field is empty and global rate is enabled
    if (!document.getElementById('projectRate').value && state.settings.globalRateEnabled && state.settings.globalRate > 0) {
        rate = state.settings.globalRate;
    }

    if (id) {
        // Edit existing
        const index = state.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            state.projects[index] = { ...state.projects[index], name, client, rate, color };
        }
    } else {
        // Add new
        state.projects.push({
            id: generateId(),
            name,
            client,
            rate,
            color
        });
    }

    saveData();
    closeModal('projectModal');
    renderAll();
    showToast(id ? 'Project updated' : 'Project created', 'success');
}

function editProject(id) {
    const project = state.projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('editProjectId').value = id;
    document.getElementById('projectModalTitle').textContent = 'Edit Project';
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectClient').value = project.client || '';
    document.getElementById('projectRate').value = project.rate || '';

    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.color === project.color);
    });

    openModal('projectModal');
}

function deleteProject(id) {
    if (!confirm('Delete this project? This will not delete time entries.')) return;

    state.projects = state.projects.filter(p => p.id !== id);
    if (state.selectedProject === id) {
        state.selectedProject = state.projects[0]?.id || null;
    }

    saveData();
    renderAll();
    showToast('Project deleted', 'success');
}

// ==================== ENTRIES ====================
function renderEntries(filter = 'all') {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    let filtered = [...state.entries];

    switch (filter) {
        case 'today':
            filtered = filtered.filter(e => e.date === todayStr);
            break;
        case 'week':
            filtered = filtered.filter(e => e.date >= weekAgo);
            break;
        case 'month':
            filtered = filtered.filter(e => e.date >= monthStart);
            break;
    }

    // Recent entries on dashboard (max 5)
    const recentList = document.getElementById('recentEntries');
    if (recentList) {
        const recent = state.entries.slice(0, 5);
        if (recent.length === 0) {
            recentList.innerHTML = '<div class="empty-state"><p>No entries yet. Clock in to start!</p></div>';
        } else {
            recentList.innerHTML = recent.map(e => renderEntryItem(e)).join('');
        }
    }

    // All entries
    const allList = document.getElementById('allEntries');
    if (allList) {
        if (filtered.length === 0) {
            allList.innerHTML = '<div class="empty-state"><p>No entries found for this period</p></div>';
        } else {
            allList.innerHTML = filtered.map(e => renderEntryItem(e, true)).join('');
        }
    }
}

function renderEntryItem(entry, showActions = false) {
    const project = state.projects.find(p => p.id === entry.projectId);
    const startTime = new Date(entry.startTime);
    const endTime = new Date(entry.endTime);

    let breakInfo = '';
    if (entry.breaks && entry.breaks > 0) {
        breakInfo = `<span style="color: var(--warning); margin-left: 0.5rem;">(${entry.breaks} break${entry.breaks > 1 ? 's' : ''})</span>`;
    }

    return `
        <div class="entry-item ${entry.locked ? 'locked' : ''}" style="position: relative;">
            <div class="entry-color" style="background: ${project?.color || '#666'}"></div>
            <div class="entry-info">
                <div class="entry-project">${project?.name || 'Unknown Project'}${breakInfo}</div>
                <div class="entry-time">${formatDate(startTime)} • ${formatTime(startTime)} - ${formatTime(endTime)}</div>
                ${entry.notes ? `<div class="entry-time" style="font-style: italic;">${entry.notes}</div>` : ''}
            </div>
            <div>
                <div class="entry-duration">${formatHours(entry.hours)}</div>
                <div class="entry-earnings">${formatCurrency(entry.earnings)}</div>
            </div>
            ${entry.locked ? '<svg class="entry-lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : ''}
            ${showActions && !entry.locked ? `
                <div class="entry-actions">
                    <button class="btn btn-secondary btn-icon btn-sm" onclick="editEntry('${entry.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-danger btn-icon btn-sm" onclick="deleteEntry('${entry.id}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function saveEntry() {
    const id = document.getElementById('editEntryId').value;
    const projectId = document.getElementById('entryProject').value;
    const date = document.getElementById('entryDate').value;
    const startTimeStr = document.getElementById('entryStart').value;
    const endTimeStr = document.getElementById('entryEnd').value;
    const notes = document.getElementById('entryNotes').value.trim();

    if (!projectId || !date || !startTimeStr || !endTimeStr) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const startTime = new Date(`${date}T${startTimeStr}`);
    const endTime = new Date(`${date}T${endTimeStr}`);

    if (endTime <= startTime) {
        showToast('End time must be after start time', 'error');
        return;
    }

    const duration = endTime - startTime;
    const hours = duration / 3600000;
    const project = state.projects.find(p => p.id === projectId);
    const earnings = hours * (project?.rate || 0);

    if (id) {
        // Edit existing
        const index = state.entries.findIndex(e => e.id === id);
        if (index !== -1 && !state.entries[index].locked) {
            state.entries[index] = {
                ...state.entries[index],
                projectId,
                date,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration,
                hours,
                earnings,
                notes
            };
        }
    } else {
        // Add new
        state.entries.unshift({
            id: generateId(),
            projectId,
            date,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration,
            hours,
            earnings,
            notes,
            locked: false
        });
    }

    // Sort entries by date/time
    state.entries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    saveData();
    closeModal('entryModal');
    renderAll();
    showToast(id ? 'Entry updated' : 'Entry added', 'success');
}

function editEntry(id) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry || entry.locked) return;

    document.getElementById('editEntryId').value = id;
    document.getElementById('entryModalTitle').textContent = 'Edit Entry';
    document.getElementById('entryProject').value = entry.projectId;
    document.getElementById('entryDate').value = entry.date;

    const startDate = new Date(entry.startTime);
    const endDate = new Date(entry.endTime);
    document.getElementById('entryStart').value = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('entryEnd').value = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('entryNotes').value = entry.notes || '';

    openModal('entryModal');
}

function deleteEntry(id) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry || entry.locked) return;

    if (!confirm('Delete this time entry?')) return;

    state.entries = state.entries.filter(e => e.id !== id);
    saveData();
    renderAll();
    showToast('Entry deleted', 'success');
}

// ==================== CALENDAR ====================
function setupCalendarViewToggle() {
    document.querySelectorAll('.calendar-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('.calendar-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.calendarView = view;
            renderCalendar();
        });
    });
}

function renderCalendar() {
    switch (state.calendarView) {
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
        default:
            renderMonthView();
    }
}

function renderMonthView() {
    const calendarContent = document.getElementById('calendarContent');
    if (!calendarContent) return;

    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const calendarTitle = document.getElementById('calendarTitle');
    if (calendarTitle) {
        calendarTitle.textContent = `${months[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get entries for this month
    const monthEntries = {};
    state.entries.forEach(entry => {
        const entryDate = entry.date;
        if (entryDate.startsWith(`${year}-${(month + 1).toString().padStart(2, '0')}`)) {
            if (!monthEntries[entryDate]) {
                monthEntries[entryDate] = [];
            }
            monthEntries[entryDate].push(entry);
        }
    });

    let html = '<div class="calendar-grid">';

    // Day headers
    const dayNames = state.settings.weekStart === 1
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Adjust start day for week start setting
    let adjustedStartDay = startDay;
    if (state.settings.weekStart === 1) {
        adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    }

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${prevDays - i}</div>
        </div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayEntries = monthEntries[dateStr] || [];

        html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="viewDayEntries('${dateStr}')">
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-entries">
                ${dayEntries.slice(0, 3).map(e => {
                    const project = state.projects.find(p => p.id === e.projectId);
                    return `<div class="calendar-entry" style="background: ${project?.color || '#666'}">${formatHours(e.hours)}</div>`;
                }).join('')}
                ${dayEntries.length > 3 ? `<div class="calendar-entry" style="background: var(--bg-glass)">+${dayEntries.length - 3}</div>` : ''}
            </div>
        </div>`;
    }

    // Next month days
    const totalCells = Math.ceil((adjustedStartDay + daysInMonth) / 7) * 7;
    for (let day = 1; day <= totalCells - adjustedStartDay - daysInMonth; day++) {
        html += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${day}</div>
        </div>`;
    }

    html += '</div>';
    calendarContent.innerHTML = html;
}

function renderWeekView() {
    const calendarContent = document.getElementById('calendarContent');
    if (!calendarContent) return;

    const weekStart = getWeekStart(state.calendarDate);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const calendarTitle = document.getElementById('calendarTitle');
    if (calendarTitle) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        calendarTitle.textContent = `${months[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '<div class="week-view">';

    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dateStr = day.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;

        const dayEntries = state.entries.filter(e => e.date === dateStr);
        const totalHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);

        html += `
            <div class="week-day ${isToday ? 'today' : ''}" onclick="viewDayEntries('${dateStr}')">
                <div class="week-day-name">${dayNames[day.getDay()]}</div>
                <div class="week-day-date">${day.getDate()}</div>
                ${totalHours > 0 ? `<div class="week-hours">${formatHours(totalHours)}</div>` : ''}
                <div class="week-entries">
                    ${dayEntries.slice(0, 3).map(e => {
                        const project = state.projects.find(p => p.id === e.projectId);
                        return `<div class="week-entry" style="background: ${project?.color || '#666'}">${project?.name || ''}</div>`;
                    }).join('')}
                </div>
            </div>
        `;
    }

    html += '</div>';
    calendarContent.innerHTML = html;
}

function renderDayView() {
    const calendarContent = document.getElementById('calendarContent');
    if (!calendarContent) return;

    const dateStr = state.calendarDate.toISOString().split('T')[0];
    const dayEntries = state.entries.filter(e => e.date === dateStr);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const calendarTitle = document.getElementById('calendarTitle');
    if (calendarTitle) {
        calendarTitle.textContent = `${months[state.calendarDate.getMonth()]} ${state.calendarDate.getDate()}, ${state.calendarDate.getFullYear()}`;
    }

    let html = '<div class="day-view">';

    html += `
        <div class="day-header">
            <div class="day-header-date">${state.calendarDate.getDate()}</div>
            <div class="day-header-day">${days[state.calendarDate.getDay()]}</div>
        </div>
    `;

    if (dayEntries.length === 0) {
        html += '<div class="empty-state"><p>No entries for this day</p></div>';
    } else {
        html += '<div class="day-timeline">';
        dayEntries.forEach(e => {
            const project = state.projects.find(p => p.id === e.projectId);
            const startTime = new Date(e.startTime);
            const endTime = new Date(e.endTime);

            html += `
                <div class="day-entry">
                    <div class="entry-color" style="background: ${project?.color || '#666'}; width: 4px; border-radius: 2px;"></div>
                    <div class="day-entry-time">${formatTime(startTime)} - ${formatTime(endTime)}</div>
                    <div class="day-entry-details">
                        <div class="entry-project">${project?.name || 'Unknown'}</div>
                        ${e.notes ? `<div class="entry-time">${e.notes}</div>` : ''}
                    </div>
                    <div>
                        <div class="entry-duration">${formatHours(e.hours)}</div>
                        <div class="entry-earnings">${formatCurrency(e.earnings)}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';
    calendarContent.innerHTML = html;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day - state.settings.weekStart;
    d.setDate(d.getDate() - (diff >= 0 ? diff : 7 + diff));
    d.setHours(0, 0, 0, 0);
    return d;
}

function changeMonth(delta) {
    if (state.calendarView === 'week') {
        state.calendarDate.setDate(state.calendarDate.getDate() + (delta * 7));
    } else if (state.calendarView === 'day') {
        state.calendarDate.setDate(state.calendarDate.getDate() + delta);
    } else {
        state.calendarDate.setMonth(state.calendarDate.getMonth() + delta);
    }
    renderCalendar();
}

function viewDayEntries(dateStr) {
    state.calendarDate = new Date(dateStr + 'T12:00:00');
    state.calendarView = 'day';

    document.querySelectorAll('.calendar-view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === 'day');
    });

    renderCalendar();
}

// ==================== REPORTS ====================
function renderReports() {
    const now = new Date();
    let startDate;

    switch (state.reportPeriod) {
        case 'week':
            startDate = getWeekStart(now);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }

    const startStr = startDate.toISOString().split('T')[0];
    const filtered = state.entries.filter(e => e.date >= startStr);

    // Calculate totals
    const totalHours = filtered.reduce((sum, e) => sum + e.hours, 0);
    const totalEarnings = filtered.reduce((sum, e) => sum + e.earnings, 0);
    const daysInPeriod = Math.ceil((now - startDate) / (24 * 60 * 60 * 1000)) || 1;
    const avgPerDay = totalHours / daysInPeriod;

    // Active projects in period
    const activeProjects = new Set(filtered.map(e => e.projectId)).size;

    const reportHoursEl = document.getElementById('reportHours');
    const reportEarningsEl = document.getElementById('reportEarnings');
    const reportAvgDayEl = document.getElementById('reportAvgDay');
    const reportProjectsEl = document.getElementById('reportProjects');

    if (reportHoursEl) reportHoursEl.textContent = `${totalHours.toFixed(1)}h`;
    if (reportEarningsEl) reportEarningsEl.textContent = formatCurrency(totalEarnings);
    if (reportAvgDayEl) reportAvgDayEl.textContent = `${avgPerDay.toFixed(1)}h`;
    if (reportProjectsEl) reportProjectsEl.textContent = activeProjects;

    // Predictions
    renderPredictions(totalHours, totalEarnings, daysInPeriod);

    // Project chart
    renderProjectChart(filtered);

    // Daily chart
    renderDailyChart();

    // Sent reports / payment blocks
    renderSentReports();

    // Send summary
    renderSendSummary(totalHours, totalEarnings);
}

function renderPredictions(currentHours, currentEarnings, daysWorked) {
    const now = new Date();
    const avgRate = currentHours > 0 ? currentEarnings / currentHours : 0;
    const avgHoursPerDay = daysWorked > 0 ? currentHours / daysWorked : 0;

    // Days remaining in week
    const dayOfWeek = now.getDay();
    const daysLeftWeek = 7 - dayOfWeek;

    // Days remaining in month
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeftMonth = lastDayOfMonth - now.getDate();

    const predictedHoursWeek = currentHours + (avgHoursPerDay * daysLeftWeek);
    const predictedHoursMonth = currentHours + (avgHoursPerDay * daysLeftMonth);
    const predictedEarningsWeek = predictedHoursWeek * avgRate;
    const predictedEarningsMonth = predictedHoursMonth * avgRate;

    const predictWeekEl = document.getElementById('predictWeek');
    const predictMonthEl = document.getElementById('predictMonth');
    const predictHoursWeekEl = document.getElementById('predictHoursWeek');
    const predictHoursMonthEl = document.getElementById('predictHoursMonth');

    if (predictWeekEl) predictWeekEl.textContent = formatCurrency(predictedEarningsWeek);
    if (predictMonthEl) predictMonthEl.textContent = formatCurrency(predictedEarningsMonth);
    if (predictHoursWeekEl) predictHoursWeekEl.textContent = `${predictedHoursWeek.toFixed(1)}h`;
    if (predictHoursMonthEl) predictHoursMonthEl.textContent = `${predictedHoursMonth.toFixed(1)}h`;
}

function renderProjectChart(entries) {
    const projectHours = {};
    entries.forEach(e => {
        if (!projectHours[e.projectId]) {
            projectHours[e.projectId] = 0;
        }
        projectHours[e.projectId] += e.hours;
    });

    const maxHours = Math.max(...Object.values(projectHours), 1);

    const chart = document.getElementById('projectChart');
    if (chart) {
        chart.innerHTML = Object.entries(projectHours)
            .sort((a, b) => b[1] - a[1])
            .map(([projectId, hours]) => {
                const project = state.projects.find(p => p.id === projectId);
                const percent = (hours / maxHours) * 100;
                return `
                    <div class="bar-item">
                        <div class="bar-label">${project?.name || 'Unknown'}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${percent}%; background: ${project?.color || '#666'}">
                                ${formatHours(hours)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || '<p style="color: var(--text-secondary); text-align: center;">No data for this period</p>';
    }
}

function renderDailyChart() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyHours = {};

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyHours[dateStr] = {
            day: days[date.getDay()],
            hours: 0
        };
    }

    state.entries.forEach(e => {
        if (dailyHours[e.date]) {
            dailyHours[e.date].hours += e.hours;
        }
    });

    const maxHours = Math.max(...Object.values(dailyHours).map(d => d.hours), 1);

    const chart = document.getElementById('dailyChart');
    if (chart) {
        chart.innerHTML = Object.entries(dailyHours).map(([date, data]) => {
            const percent = (data.hours / maxHours) * 100;
            return `
                <div class="bar-item">
                    <div class="bar-label">${data.day}</div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percent}%; background: var(--accent)">
                            ${data.hours > 0 ? formatHours(data.hours) : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderSentReports() {
    const container = document.getElementById('sentReportsList');
    if (!container) return;

    if (state.sentReports.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No reports sent yet</p>';
        return;
    }

    container.innerHTML = state.sentReports
        .sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate))
        .slice(0, 5)
        .map(report => `
            <div class="sent-report-item">
                <div>
                    <div class="sent-report-date">${formatDate(new Date(report.sentDate))}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${report.period} • ${report.recipientCount} recipient(s)</div>
                </div>
                <div class="sent-report-hours">${formatHours(report.hours)}</div>
                <div class="sent-report-earnings">${formatCurrency(report.earnings)}</div>
            </div>
        `).join('');
}

function renderSendSummary(hours, earnings) {
    const summary = document.getElementById('sendSummary');
    const recipients = state.recipients.filter(r => r.sendEmail || r.sendSMS);

    if (summary) {
        summary.innerHTML = `
            <div class="send-summary-row">
                <span>Period</span>
                <span>${state.reportPeriod.charAt(0).toUpperCase() + state.reportPeriod.slice(1)}</span>
            </div>
            <div class="send-summary-row">
                <span>Total Hours</span>
                <span>${formatHours(hours)}</span>
            </div>
            <div class="send-summary-row">
                <span>Total Earnings</span>
                <span>${formatCurrency(earnings)}</span>
            </div>
            <div class="send-summary-row">
                <span>Recipients</span>
                <span>${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}</span>
            </div>
        `;
    }

    const sendBtn = document.getElementById('sendReportBtn');
    if (sendBtn) {
        sendBtn.disabled = recipients.length === 0;
    }
}

// ==================== RECIPIENTS ====================
function renderRecipients() {
    const list = document.getElementById('recipientList');
    if (!list) return;

    if (state.recipients.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No recipients added yet</p></div>';
        return;
    }

    list.innerHTML = state.recipients.map(r => {
        const initials = r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const layers = [];
        if (r.layers?.summary) layers.push('Summary');
        if (r.layers?.projects) layers.push('Projects');
        if (r.layers?.detailed) layers.push('Detailed');
        if (r.layers?.rates) layers.push('Rates');
        if (r.layers?.hoursOnly) layers.push('Hours Only');

        return `
            <div class="recipient-item">
                <div class="recipient-avatar">${initials}</div>
                <div class="recipient-info">
                    <div class="recipient-name">${r.name}</div>
                    <div class="recipient-contact">
                        ${r.email}${r.phone ? ' • ' + r.phone : ''}
                        ${r.sendEmail ? ' (Email)' : ''}${r.sendSMS ? ' (SMS)' : ''}
                    </div>
                    <div class="recipient-layers">
                        ${layers.map(l => `<span class="layer-badge active">${l}</span>`).join('')}
                    </div>
                </div>
                <div class="entry-actions">
                    <button class="btn btn-secondary btn-icon btn-sm" onclick="editRecipient('${r.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-danger btn-icon btn-sm" onclick="deleteRecipient('${r.id}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function saveRecipient() {
    const id = document.getElementById('editRecipientId').value;
    const name = document.getElementById('recipientName').value.trim();
    const email = document.getElementById('recipientEmail').value.trim();
    const phone = document.getElementById('recipientPhone').value.trim();
    const sendEmail = document.getElementById('sendEmail').checked;
    const sendSMS = document.getElementById('sendSMS').checked;

    const layers = {
        summary: document.getElementById('layerSummary').checked,
        projects: document.getElementById('layerProjects').checked,
        detailed: document.getElementById('layerDetailed').checked,
        rates: document.getElementById('layerRates').checked,
        hoursOnly: document.getElementById('layerHoursOnly')?.checked || false
    };

    if (!name || !email) {
        showToast('Name and email are required', 'error');
        return;
    }

    if (sendSMS && !phone) {
        showToast('Phone number required for SMS', 'error');
        return;
    }

    if (id) {
        const index = state.recipients.findIndex(r => r.id === id);
        if (index !== -1) {
            state.recipients[index] = { ...state.recipients[index], name, email, phone, sendEmail, sendSMS, layers };
        }
    } else {
        state.recipients.push({
            id: generateId(),
            name,
            email,
            phone,
            sendEmail,
            sendSMS,
            layers
        });
    }

    saveData();
    closeModal('recipientModal');
    renderAll();
    showToast(id ? 'Recipient updated' : 'Recipient added', 'success');
}

function editRecipient(id) {
    const recipient = state.recipients.find(r => r.id === id);
    if (!recipient) return;

    document.getElementById('editRecipientId').value = id;
    document.getElementById('recipientModalTitle').textContent = 'Edit Recipient';
    document.getElementById('recipientName').value = recipient.name;
    document.getElementById('recipientEmail').value = recipient.email;
    document.getElementById('recipientPhone').value = recipient.phone || '';
    document.getElementById('sendEmail').checked = recipient.sendEmail;
    document.getElementById('sendSMS').checked = recipient.sendSMS;
    document.getElementById('layerSummary').checked = recipient.layers?.summary ?? true;
    document.getElementById('layerProjects').checked = recipient.layers?.projects ?? true;
    document.getElementById('layerDetailed').checked = recipient.layers?.detailed ?? false;
    document.getElementById('layerRates').checked = recipient.layers?.rates ?? false;

    const hoursOnlyEl = document.getElementById('layerHoursOnly');
    if (hoursOnlyEl) hoursOnlyEl.checked = recipient.layers?.hoursOnly ?? false;

    openModal('recipientModal');
}

function deleteRecipient(id) {
    if (!confirm('Remove this recipient?')) return;

    state.recipients = state.recipients.filter(r => r.id !== id);
    saveData();
    renderAll();
    showToast('Recipient removed', 'success');
}

// ==================== SEND REPORTS ====================
function sendReports() {
    openModal('confirmSendModal');
}

function confirmSendReports() {
    closeModal('confirmSendModal');

    const recipients = state.recipients.filter(r => r.sendEmail || r.sendSMS);
    if (recipients.length === 0) {
        showToast('No recipients configured', 'error');
        return;
    }

    // Calculate current period data
    const now = new Date();
    let startDate;

    switch (state.reportPeriod) {
        case 'week':
            startDate = getWeekStart(now);
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }

    const startStr = startDate.toISOString().split('T')[0];
    const periodEntries = state.entries.filter(e => e.date >= startStr && !e.locked);

    const totalHours = periodEntries.reduce((sum, e) => sum + e.hours, 0);
    const totalEarnings = periodEntries.reduce((sum, e) => sum + e.earnings, 0);

    // Lock these entries
    periodEntries.forEach(e => {
        e.locked = true;
    });

    // Record this sent report
    state.sentReports.push({
        id: generateId(),
        sentDate: now.toISOString(),
        period: state.reportPeriod,
        hours: totalHours,
        earnings: totalEarnings,
        recipientCount: recipients.length,
        entryIds: periodEntries.map(e => e.id)
    });

    // Generate report for each recipient
    recipients.forEach(recipient => {
        const report = generateReport(recipient, periodEntries);

        if (recipient.sendEmail) {
            // Open email client
            const subject = encodeURIComponent(`Time Report - ${state.reportPeriod.charAt(0).toUpperCase() + state.reportPeriod.slice(1)}`);
            const body = encodeURIComponent(report.text);
            window.open(`mailto:${recipient.email}?subject=${subject}&body=${body}`);
        }

        if (recipient.sendSMS && recipient.phone) {
            // Open SMS (works on mobile)
            const smsBody = encodeURIComponent(report.sms);
            window.open(`sms:${recipient.phone}?body=${smsBody}`);
        }
    });

    saveData();
    renderAll();
    showToast(`Report sent to ${recipients.length} recipient(s). Entries locked.`, 'success');
}

function quickSendReport() {
    const recipients = state.recipients.filter(r => r.sendEmail || r.sendSMS);
    if (recipients.length === 0) {
        showToast('No recipients configured. Go to Settings to add recipients.', 'error');
        return;
    }
    openModal('confirmSendModal');
}

function generateReport(recipient, entries) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const totalEarnings = entries.reduce((sum, e) => sum + e.earnings, 0);

    let text = `TIME REPORT\n`;
    text += `Period: ${state.reportPeriod.charAt(0).toUpperCase() + state.reportPeriod.slice(1)}\n`;
    text += `Generated: ${formatDate(new Date())}\n\n`;

    // Hours only mode
    if (recipient.layers?.hoursOnly) {
        text += `Total Hours: ${formatHours(totalHours)}\n`;
        return { text, sms: `Time Report: ${formatHours(totalHours)} hours` };
    }

    if (recipient.layers?.summary) {
        text += `SUMMARY\n`;
        text += `Total Hours: ${formatHours(totalHours)}\n`;
        if (recipient.layers?.rates) {
            text += `Total Earnings: ${formatCurrency(totalEarnings)}\n`;
        }
        text += `\n`;
    }

    if (recipient.layers?.projects) {
        const projectTotals = {};
        entries.forEach(e => {
            if (!projectTotals[e.projectId]) {
                projectTotals[e.projectId] = { hours: 0, earnings: 0 };
            }
            projectTotals[e.projectId].hours += e.hours;
            projectTotals[e.projectId].earnings += e.earnings;
        });

        text += `BY PROJECT\n`;
        Object.entries(projectTotals).forEach(([projectId, totals]) => {
            const project = state.projects.find(p => p.id === projectId);
            text += `- ${project?.name || 'Unknown'}: ${formatHours(totals.hours)}`;
            if (recipient.layers?.rates) {
                text += ` (${formatCurrency(totals.earnings)})`;
            }
            text += `\n`;
        });
        text += `\n`;
    }

    if (recipient.layers?.detailed) {
        text += `DETAILED ENTRIES\n`;
        entries.forEach(e => {
            const project = state.projects.find(p => p.id === e.projectId);
            const start = new Date(e.startTime);
            const end = new Date(e.endTime);
            text += `${formatDate(start)} | ${project?.name || 'Unknown'} | ${formatTime(start)}-${formatTime(end)} | ${formatHours(e.hours)}`;
            if (recipient.layers?.rates) {
                text += ` | ${formatCurrency(e.earnings)}`;
            }
            if (e.notes) {
                text += `\n  Note: ${e.notes}`;
            }
            text += `\n`;
        });
    }

    // SMS version (shorter)
    let sms = `Time Report: ${formatHours(totalHours)} hours`;
    if (recipient.layers?.rates) {
        sms += `, ${formatCurrency(totalEarnings)}`;
    }

    return { text, sms };
}

// ==================== STATISTICS ====================
function updateStats() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Today
    const todayHours = state.entries
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + e.hours, 0);

    // This week
    const weekStart = getWeekStart(now);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekHours = state.entries
        .filter(e => e.date >= weekStartStr)
        .reduce((sum, e) => sum + e.hours, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthEntries = state.entries.filter(e => e.date >= monthStartStr);
    const monthHours = monthEntries.reduce((sum, e) => sum + e.hours, 0);
    const monthEarnings = monthEntries.reduce((sum, e) => sum + e.earnings, 0);

    const todayHoursEl = document.getElementById('todayHours');
    const weekHoursEl = document.getElementById('weekHours');
    const monthHoursEl = document.getElementById('monthHours');
    const monthEarningsEl = document.getElementById('monthEarnings');

    if (todayHoursEl) todayHoursEl.textContent = formatHours(todayHours);
    if (weekHoursEl) weekHoursEl.textContent = formatHours(weekHours);
    if (monthHoursEl) monthHoursEl.textContent = formatHours(monthHours);
    if (monthEarningsEl) monthEarningsEl.textContent = formatCurrency(monthEarnings);
}

function calculateProjectTotals() {
    const totals = {};
    state.entries.forEach(e => {
        if (!totals[e.projectId]) {
            totals[e.projectId] = { hours: 0, earnings: 0 };
        }
        totals[e.projectId].hours += e.hours;
        totals[e.projectId].earnings += e.earnings;
    });
    return totals;
}

// ==================== SETTINGS ====================
function updateCurrency() {
    const currency = document.getElementById('currencySelect').value;
    state.settings.currency = currency;
    state.settings.currencySymbol = CURRENCY_SYMBOLS[currency];
    saveData();
    renderAll();
}

function updateDateFormat() {
    state.settings.dateFormat = document.getElementById('dateFormatSelect').value;
    saveData();
    renderAll();
}

function updateTimeFormat() {
    state.settings.timeFormat = document.getElementById('timeFormatSelect').value;
    saveData();
    renderAll();
}

function updateWeekStart() {
    state.settings.weekStart = parseInt(document.getElementById('weekStartSelect').value);
    saveData();
    renderAll();
}

function updateGlobalRate() {
    const rate = parseFloat(document.getElementById('globalRateInput').value) || 0;
    state.settings.globalRate = rate;
    saveData();
}

function toggleGlobalRate() {
    state.settings.globalRateEnabled = document.getElementById('globalRateEnabled').checked;
    saveData();
}

// ==================== DATA MANAGEMENT ====================
function exportData() {
    const data = JSON.stringify({
        projects: state.projects,
        entries: state.entries,
        recipients: state.recipients,
        sentReports: state.sentReports,
        settings: state.settings,
        exportDate: new Date().toISOString(),
        version: '2.0'
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeflow-export-${formatDate(new Date()).replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Data exported successfully', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (data.projects) state.projects = data.projects;
            if (data.entries) state.entries = data.entries;
            if (data.recipients) state.recipients = data.recipients;
            if (data.sentReports) state.sentReports = data.sentReports;
            if (data.settings) state.settings = { ...state.settings, ...data.settings };

            saveData();
            loadData();
            applyAccentColor(state.settings.accentColor);
            renderAll();
            showToast('Data imported successfully', 'success');
        } catch (err) {
            showToast('Invalid import file', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function confirmClearData() {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
    if (!confirm('This will permanently delete all projects, entries, and recipients. Continue?')) return;

    state.projects = [];
    state.entries = [];
    state.recipients = [];
    state.sentReports = [];
    state.currentSession = null;
    state.currentBreak = null;
    state.selectedProject = null;

    saveData();
    renderAll();
    showToast('All data cleared', 'success');
}

// ==================== UI HELPERS ====================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screen = btn.dataset.screen;
            switchScreen(screen);
        });
    });
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const screenEl = document.getElementById(screenId);
    const navBtn = document.querySelector(`[data-screen="${screenId}"]`);

    if (screenEl) screenEl.classList.add('active');
    if (navBtn) navBtn.classList.add('active');

    // Re-render specific screens
    if (screenId === 'calendar') renderCalendar();
    if (screenId === 'reports') renderReports();
}

function setupColorPicker() {
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderEntries(filter);
        });
    });
}

function setupPeriodToggle() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.reportPeriod = period;
            renderReports();
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');

    // Reset form if adding new
    if (modalId === 'projectModal' && !document.getElementById('editProjectId').value) {
        document.getElementById('projectModalTitle').textContent = 'Add Project';
        document.getElementById('projectName').value = '';
        document.getElementById('projectClient').value = '';

        // Auto-populate with global rate if enabled
        const rateInput = document.getElementById('projectRate');
        if (state.settings.globalRateEnabled && state.settings.globalRate > 0) {
            rateInput.value = state.settings.globalRate;
            rateInput.placeholder = `Global: ${state.settings.globalRate}`;
        } else {
            rateInput.value = '';
            rateInput.placeholder = '0.00';
        }

        document.querySelectorAll('.color-option').forEach((o, i) => {
            o.classList.toggle('selected', i === 0);
        });
    }

    if (modalId === 'entryModal' && !document.getElementById('editEntryId').value) {
        document.getElementById('entryModalTitle').textContent = 'Add Manual Entry';
        document.getElementById('entryDate').valueAsDate = new Date();
        document.getElementById('entryStart').value = '';
        document.getElementById('entryEnd').value = '';
        document.getElementById('entryNotes').value = '';
    }

    if (modalId === 'recipientModal' && !document.getElementById('editRecipientId').value) {
        document.getElementById('recipientModalTitle').textContent = 'Add Recipient';
        document.getElementById('recipientName').value = '';
        document.getElementById('recipientEmail').value = '';
        document.getElementById('recipientPhone').value = '';
        document.getElementById('sendEmail').checked = true;
        document.getElementById('sendSMS').checked = false;
        document.getElementById('layerSummary').checked = true;
        document.getElementById('layerProjects').checked = true;
        document.getElementById('layerDetailed').checked = false;
        document.getElementById('layerRates').checked = false;

        const hoursOnlyEl = document.getElementById('layerHoursOnly');
        if (hoursOnlyEl) hoursOnlyEl.checked = false;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');

    // Clear edit IDs
    if (modalId === 'projectModal') {
        const el = document.getElementById('editProjectId');
        if (el) el.value = '';
    }
    if (modalId === 'entryModal') {
        const el = document.getElementById('editEntryId');
        if (el) el.value = '';
    }
    if (modalId === 'recipientModal') {
        const el = document.getElementById('editRecipientId');
        if (el) el.value = '';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success'
            ? '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>'
            : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>'}
        </svg>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function renderAll() {
    renderProjects();
    renderEntries();
    renderRecipients();
    renderCalendar();
    renderReports();
    updateStats();
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
