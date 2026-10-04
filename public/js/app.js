// CivicPulse (जनसमाधान) — Client Application Logic (EduResolve Design Integration)

const AppState = {
  incidents: [],
  myVouchedIds: new Set(JSON.parse(localStorage.getItem('civic_vouched_ids') || '[]')),
  myReportedIds: new Set(JSON.parse(localStorage.getItem('civic_reported_ids') || '[]')),
  currentRole: 'citizen',
  activeTab: 'feedTab',
  selectedCategory: 'ALL',
  selectedWard: 'ALL',
  selectedStatus: 'ALL',
  searchQuery: '',
  sortOrder: 'cipi',
  currentGps: { lat: 17.4350, lon: 78.4050, address: 'Gandhi Bazaar Road, Ward 3' },
  map: null,
  mapMarkers: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initRoleSwitcher();
  initFilters();
  initReportModal();
  initVoiceAssistant();
  fetchStats();
  fetchIncidents();
  initMap();
});

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : '📢');
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. Navigation & Tab Switching
function initNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab-item');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      AppState.activeTab = targetTab;

      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = document.getElementById(targetTab);
      if (activePanel) activePanel.classList.add('active');

      if (targetTab === 'mapTab') {
        setTimeout(() => {
          if (AppState.map) AppState.map.invalidateSize();
          renderMapMarkers();
        }, 150);
      } else if (targetTab === 'authorityTab') {
        renderAuthorityTable();
      } else if (targetTab === 'myReportsTab') {
        renderMyReports();
      } else if (targetTab === 'transparencyTab') {
        renderTransparencyScorecard();
      }
    });
  });
}

// 2. Role Switcher
function initRoleSwitcher() {
  const roleSelect = document.getElementById('userRoleSelect');
  roleSelect.addEventListener('change', (e) => {
    AppState.currentRole = e.target.value;
    showToast(`Role switched to ${e.target.options[e.target.selectedIndex].text}`, 'info');
    renderIncidents();
    renderAuthorityTable();
  });
}

// 3. Filters & Search
function initFilters() {
  // Global search input
  const searchInput = document.getElementById('globalSearchInput');
  searchInput.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value.toLowerCase().trim();
    fetchIncidents();
  });

  // Category pills
  const catPills = document.querySelectorAll('.cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      AppState.selectedCategory = pill.getAttribute('data-cat');
      fetchIncidents();
    });
  });

  // Ward & Status dropdowns
  document.getElementById('filterWard').addEventListener('change', (e) => {
    AppState.selectedWard = e.target.value;
    fetchIncidents();
  });

  document.getElementById('filterStatus').addEventListener('change', (e) => {
    AppState.selectedStatus = e.target.value;
    fetchIncidents();
  });

  document.getElementById('sortOrder').addEventListener('change', (e) => {
    AppState.sortOrder = e.target.value;
    fetchIncidents();
  });
}

// 4. Fetch Incidents from SQLite API
async function fetchIncidents() {
  try {
    const params = new URLSearchParams();
    if (AppState.selectedCategory !== 'ALL') params.append('category', AppState.selectedCategory);
    if (AppState.selectedWard !== 'ALL') params.append('ward', AppState.selectedWard);
    if (AppState.selectedStatus !== 'ALL') params.append('status', AppState.selectedStatus);
    if (AppState.searchQuery) params.append('search', AppState.searchQuery);
    if (AppState.sortOrder) params.append('sort', AppState.sortOrder);

    const res = await fetch(`/api/incidents?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      AppState.incidents = json.data;
      renderIncidents();
      renderAuthorityTable();
      renderMapMarkers();
      renderMyReports();
      document.getElementById('incidentCount').textContent = AppState.incidents.length;
    }
  } catch (err) {
    console.error('Error fetching incidents:', err);
  }
}

// 5. Fetch Platform Stats & KPIs
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      document.getElementById('kpiCritical').textContent = d.criticalActive || 0;
      document.getElementById('kpiActive').textContent = d.totalIncidents || 0;
      document.getElementById('kpiVouches').textContent = d.totalCommunityVouches || 0;
      document.getElementById('kpiResolutionRate').textContent = (d.resolutionRate || 85) + '%';
      
      // Update Authority Banner stats
      document.getElementById('authRedCount').textContent = d.criticalActive || 0;
      document.getElementById('authAmberCount').textContent = d.totalIncidents - (d.resolved || 0);
      document.getElementById('authVerificationCount').textContent = d.pendingVerification || 0;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// 6. Render Incident Cards (EduResolve Style)
function renderIncidents() {
  const grid = document.getElementById('incidentsGrid');
  if (!AppState.incidents || AppState.incidents.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px; background: #ffffff; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 36px; display: block; margin-bottom: 8px;">🎉</span>
        <h4 style="font-size: 16px; font-weight: 700;">No Grievances Found</h4>
        <p style="font-size: 12px; color: #64748b;">No active civic issues match your current filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = AppState.incidents.map(inc => {
    const cipi = inc.cipi_score || 50;
    let cipiClass = 'cipi-green';
    let cipiLabel = 'Routine Priority';
    if (cipi >= 75) { cipiClass = 'cipi-red'; cipiLabel = 'Critical Emergency'; }
    else if (cipi >= 50) { cipiClass = 'cipi-amber'; cipiLabel = 'Moderate / High'; }

    const isVouched = AppState.myVouchedIds.has(inc.id);
    const vouchBtnText = isVouched ? `✓ Vouched (${inc.vouch_count})` : `👍 I Face This Too (${inc.vouch_count})`;

    const statusMap = {
      'PENDING': 'Pending Triage',
      'DISPATCHED': 'Crew Dispatched',
      'IN_PROGRESS': 'In Progress',
      'PENDING_VERIFICATION': 'Awaiting Citizen Sign-off',
      'RESOLVED': 'Verified Resolved',
      'REJECTED': 'Dismissed'
    };
    const statusText = statusMap[inc.status] || inc.status;
    const statusClass = 'status-' + (inc.status || 'pending').toLowerCase();

    return `
      <div class="incident-card" data-id="${inc.id}">
        <div class="card-media">
          <img src="${inc.photo_url || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'}" class="card-img" alt="${inc.title}">
          <span class="card-category-badge">${getCategoryIcon(inc.category)} ${inc.category}</span>
          <span class="card-cipi-chip ${cipiClass}">CIPI: ${cipi}/100</span>
        </div>

        <div class="card-content">
          <div class="card-meta-top">
            <span class="tracking-id">${inc.tracking_id}</span>
            <span class="status-tag ${statusClass}">${statusText}</span>
          </div>

          <h3 class="card-title">${escapeHtml(inc.title)}</h3>
          <p class="card-desc">${escapeHtml(inc.description || 'No detailed description provided.')}</p>

          <div class="card-location-row">
            <span>📍</span>
            <span>${escapeHtml(inc.ward)} • ${escapeHtml(inc.address || '')}</span>
          </div>

          ${inc.vulnerability_tag ? `<div class="card-vulnerability-chip">${inc.vulnerability_tag}</div>` : ''}

          <div class="card-cipi-breakdown">
            <div class="cipi-bar-row">
              <span>Impact Score: ${cipiLabel}</span>
              <span>${cipi}%</span>
            </div>
            <div class="cipi-progress-bar">
              <div class="cipi-progress-fill ${cipiClass}" style="width: ${cipi}%;"></div>
            </div>
          </div>

          <div class="card-footer">
            <button class="btn-vouch" onclick="handleVouch(${inc.id})" ${isVouched ? 'disabled' : ''}>
              ${vouchBtnText}
            </button>
            <button class="btn-inspect" onclick="openDetailModal(${inc.id})">
              Inspect & Actions
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 7. Render Authority Command Table
function renderAuthorityTable() {
  const tbody = document.getElementById('authorityTableBody');
  if (!tbody) return;

  if (!AppState.incidents || AppState.incidents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">No active grievances in triage queue.</td></tr>`;
    return;
  }

  tbody.innerHTML = AppState.incidents.map(inc => {
    const cipi = inc.cipi_score || 50;
    let badgeColor = '#10b981';
    let badgeBg = '#ecfdf5';
    if (cipi >= 75) { badgeColor = '#ef4444'; badgeBg = '#fef2f2'; }
    else if (cipi >= 50) { badgeColor = '#f59e0b'; badgeBg = '#fffbeb'; }

    return `
      <tr>
        <td>
          <span class="cipi-score-badge-table" style="color: ${badgeColor}; background: ${badgeBg};">
            CIPI: ${cipi}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${inc.tracking_id}</td>
        <td>
          <strong style="display: block; font-size: 13px;">${escapeHtml(inc.title)}</strong>
          <span style="font-size: 11px; color: #64748b;">${getCategoryIcon(inc.category)} ${inc.category} • ${inc.vouch_count} Community Vouches</span>
        </td>
        <td>${escapeHtml(inc.ward)}</td>
        <td><span style="font-size: 11px; font-weight: 600; color: #065f46;">${inc.assigned_department || 'Auto Routing'}</span></td>
        <td>
          <span style="font-size: 11px; font-weight: 600; color: ${cipi >= 75 ? '#dc2626' : '#2563eb'};">
            ⏳ ${inc.sla_hours || 24}h SLA Limit
          </span>
        </td>
        <td>
          <span class="status-tag status-${(inc.status || 'pending').toLowerCase()}">
            ${inc.status}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline" style="padding: 4px 10px; font-size: 11px;" onclick="openDetailModal(${inc.id})">
            Dispatch / Manage
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 8. Render My Reports Tab
function renderMyReports() {
  const container = document.getElementById('myIncidentsGrid');
  if (!container) return;

  const myItems = AppState.incidents.filter(inc => 
    AppState.myReportedIds.has(inc.id) || AppState.myVouchedIds.has(inc.id)
  );

  if (myItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px; background: #ffffff; border-radius: 16px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 36px; display: block; margin-bottom: 8px;">📋</span>
        <h4 style="font-size: 16px; font-weight: 700;">No Personal Grievances Tracked Yet</h4>
        <p style="font-size: 12px; color: #64748b;">When you submit an issue or vouch for an existing one, it will appear here with live resolution updates.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = myItems.map(inc => {
    return `
      <div class="incident-card">
        <div class="card-media">
          <img src="${inc.photo_url || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'}" class="card-img" alt="${inc.title}">
          <span class="card-category-badge">${getCategoryIcon(inc.category)} ${inc.category}</span>
        </div>
        <div class="card-content">
          <div class="card-meta-top">
            <span class="tracking-id">${inc.tracking_id}</span>
            <span class="status-tag status-${(inc.status || 'pending').toLowerCase()}">${inc.status}</span>
          </div>
          <h3 class="card-title">${escapeHtml(inc.title)}</h3>
          <p class="card-desc">${escapeHtml(inc.description || '')}</p>
          <div class="card-footer">
            <span style="font-size: 11px; color: #64748b;">${inc.vouch_count} Citizens Vouched</span>
            <button class="btn-inspect" onclick="openDetailModal(${inc.id})">View Progress</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 9. Community Vouching Action
async function handleVouch(incidentId) {
  try {
    const userId = 'user-device-' + (localStorage.getItem('civic_user_id') || Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('civic_user_id', userId);

    const res = await fetch(`/api/incidents/${incidentId}/vouch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    const json = await res.json();

    if (json.success) {
      AppState.myVouchedIds.add(incidentId);
      localStorage.setItem('civic_vouched_ids', JSON.stringify([...AppState.myVouchedIds]));
      showToast(`Vouch registered! CIPI escalated to ${json.newCipiScore}/100.`, 'success');
      fetchIncidents();
      fetchStats();
    } else {
      showToast(json.message || 'Already vouched.', 'warning');
    }
  } catch (err) {
    showToast('Failed to record vouch. Check connection.', 'warning');
  }
}

// 10. Report Wizard & Modal Logic
function initReportModal() {
  const modal = document.getElementById('reportModalBackdrop');
  const openBtns = [
    document.getElementById('openReportModalBtn'),
    document.getElementById('openReportWizardBtn'),
    document.getElementById('openVoiceModalBtn')
  ];
  const closeBtn = document.getElementById('closeReportModalBtn');
  const cancelBtn = document.getElementById('cancelReportBtn');

  openBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      modal.classList.add('open');
      updateCipiPreview();
    });
  });

  [closeBtn, cancelBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', () => modal.classList.remove('open'));
  });

  // Category select cards
  const catCards = document.querySelectorAll('.cat-select-card');
  catCards.forEach(card => {
    card.addEventListener('click', () => {
      catCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updateCipiPreview();
        checkDuplicateProximity();
      }
    });
  });

  // Photo upload click handler
  const photoBox = document.getElementById('photoDropArea');
  const photoInput = document.getElementById('formPhotoFile');
  const photoPreview = document.getElementById('photoPreviewImg');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');

  photoBox.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (re) => {
        photoPreview.src = re.target.result;
        photoPreview.style.display = 'block';
        uploadPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });

  // GPS Auto-Locate Button
  document.getElementById('gpsAutoLocateBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          AppState.currentGps.lat = parseFloat(pos.coords.latitude.toFixed(4));
          AppState.currentGps.lon = parseFloat(pos.coords.longitude.toFixed(4));
          document.getElementById('gpsDisplay').textContent = `${AppState.currentGps.lat}° N, ${AppState.currentGps.lon}° E (Live Device GPS Lock)`;
          showToast('GPS Coordinates locked successfully with Geofence verification.', 'success');
          checkDuplicateProximity();
        },
        () => {
          // Fallback to simulated coordinates
          AppState.currentGps.lat = 17.4350;
          AppState.currentGps.lon = 78.4050;
          document.getElementById('gpsDisplay').textContent = `17.4350° N, 78.4050° E (Simulated Field Lock)`;
          showToast('Using local municipal boundary coordinates.', 'info');
          checkDuplicateProximity();
        }
      );
    }
  });

  // Vulnerability checkboxes recalculate CIPI
  ['checkSchool', 'checkHospital', 'checkHighway', 'checkDrinking'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateCipiPreview);
  });

  // Submit Report Form
  const form = document.getElementById('reportIssueForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitReportBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting...</span>';

    try {
      const formData = new FormData();
      const selectedCat = document.querySelector('input[name="category"]:checked')?.value || 'WATER';
      formData.append('category', selectedCat);
      formData.append('title', document.getElementById('formTitle').value);
      formData.append('description', document.getElementById('formDescription').value);
      formData.append('ward', document.getElementById('formWard').value);
      formData.append('address', document.getElementById('formAddress').value);
      formData.append('latitude', AppState.currentGps.lat);
      formData.append('longitude', AppState.currentGps.lon);
      formData.append('reported_by', AppState.currentRole === 'citizen' ? 'Ramesh Kumar (Citizen)' : 'Elected Field Rep');
      formData.append('reporter_role', AppState.currentRole);

      // Heuristics calculation
      let vScore = 10;
      let vTags = [];
      if (document.getElementById('checkSchool').checked) { vScore += 30; vTags.push('🏫 School Zone (<200m)'); }
      if (document.getElementById('checkHospital').checked) { vScore += 35; vTags.push('🏥 Hospital Route (<200m)'); }
      if (document.getElementById('checkHighway').checked) { vScore += 25; vTags.push('🚗 Main Bus/Arterial Route'); }
      if (document.getElementById('checkDrinking').checked) { vScore += 30; vTags.push('💧 Drinking Water Hazard'); }

      formData.append('vulnerability_proximity', Math.min(100, vScore));
      formData.append('vulnerability_tag', vTags.join(' • ') || 'Standard Community Zone');
      formData.append('base_severity', selectedCat === 'ELECTRICITY' ? 95 : (selectedCat === 'WATER' ? 85 : 70));
      formData.append('population_density', 75);

      if (photoInput.files && photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
      }

      const res = await fetch('/api/incidents', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.success) {
        showToast(`Grievance registered! Priority Score: ${json.cipiScore}/100. Tracking ID: ${json.trackingId}`, 'success');
        AppState.myReportedIds.add(json.incidentId);
        localStorage.setItem('civic_reported_ids', JSON.stringify([...AppState.myReportedIds]));
        modal.classList.remove('open');
        form.reset();
        photoPreview.style.display = 'none';
        uploadPlaceholder.style.display = 'block';
        fetchIncidents();
        fetchStats();
      } else {
        showToast(json.error || 'Failed to submit report.', 'warning');
      }
    } catch (err) {
      showToast('Error communicating with server.', 'warning');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 Submit & Alert Authorities</span>';
    }
  });
}

// 11. Live Proximity Duplicate Check
async function checkDuplicateProximity() {
  const alertBox = document.getElementById('duplicateAlertBox');
  const alertText = document.getElementById('duplicateAlertText');
  const vouchInsteadBtn = document.getElementById('vouchInsteadBtn');

  try {
    const selectedCat = document.querySelector('input[name="category"]:checked')?.value || 'WATER';
    const res = await fetch(`/api/incidents/check-duplicate?latitude=${AppState.currentGps.lat}&longitude=${AppState.currentGps.lon}&category=${selectedCat}`);
    const json = await res.json();

    if (json.success && json.duplicateFound) {
      alertText.textContent = `A similar issue "${json.matchedIncident.title}" was reported ${json.distanceMeters}m away in ${json.matchedIncident.ward}.`;
      alertBox.style.display = 'flex';
      vouchInsteadBtn.onclick = () => {
        handleVouch(json.matchedIncident.id);
        document.getElementById('reportModalBackdrop').classList.remove('open');
      };
    } else {
      alertBox.style.display = 'none';
    }
  } catch (err) {
    alertBox.style.display = 'none';
  }
}

// 12. Dynamic CIPI Preview in Wizard
function updateCipiPreview() {
  const selectedCat = document.querySelector('input[name="category"]:checked')?.value || 'WATER';
  let baseS = 60;
  let sla = '24 Hours';

  if (selectedCat === 'ELECTRICITY') { baseS = 95; sla = '4 Hours'; }
  else if (selectedCat === 'WATER') { baseS = 85; sla = '12 Hours'; }
  else if (selectedCat === 'ROADS') { baseS = 75; sla = '24 Hours'; }
  else if (selectedCat === 'SANITATION') { baseS = 65; sla = '24 Hours'; }
  else if (selectedCat === 'SAFETY') { baseS = 90; sla = '6 Hours'; }

  let vScore = 0;
  if (document.getElementById('checkSchool')?.checked) vScore += 30;
  if (document.getElementById('checkHospital')?.checked) vScore += 35;
  if (document.getElementById('checkHighway')?.checked) vScore += 25;
  if (document.getElementById('checkDrinking')?.checked) vScore += 30;

  const density = 70;
  const vouches = 1;
  const C = Math.round(28 * Math.log2(1 + vouches));
  const rawScore = (baseS * 0.35) + (density * 0.20) + (Math.min(100, vScore) * 0.20) + (C * 0.15) + (10 * 0.10);
  const finalCipi = Math.min(100, Math.max(10, Math.round(rawScore)));

  document.getElementById('previewCipiNumber').textContent = finalCipi;
  document.getElementById('previewSlaTarget').textContent = sla;
}

// 13. Multilingual Voice Assistant (Web Speech API)
function initVoiceAssistant() {
  const micBtn = document.getElementById('voiceMicBtn');
  const micLabel = document.getElementById('voiceMicLabel');
  const titleInput = document.getElementById('formTitle');
  const descInput = document.getElementById('formDescription');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (micBtn) micBtn.title = 'Speech recognition not supported in this browser';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'hi-IN'; // Default Hindi / Multilingual

  let isListening = false;

  micBtn.addEventListener('click', () => {
    if (!isListening) {
      recognition.start();
      isListening = true;
      micBtn.classList.add('listening');
      micLabel.textContent = 'Listening (Speak now)...';
    } else {
      recognition.stop();
      isListening = false;
      micBtn.classList.remove('listening');
      micLabel.textContent = 'Voice Input';
    }
  });

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    showToast(`Transcribed: "${transcript}"`, 'info');
    titleInput.value = transcript;
    descInput.value = `Voice Reported Issue: "${transcript}". Automatically transcribed and geolocated.`;

    // Smart keyword detection
    const t = transcript.toLowerCase();
    let detectedCat = 'WATER';
    if (t.includes('road') || t.includes('pothole') || t.includes('sadak') || t.includes('gaddha')) detectedCat = 'ROADS';
    else if (t.includes('wire') || t.includes('current') || t.includes('bijli') || t.includes('light')) detectedCat = 'ELECTRICITY';
    else if (t.includes('kachra') || t.includes('drain') || t.includes('nala') || t.includes('waste')) detectedCat = 'SANITATION';
    else if (t.includes('danger') || t.includes('hazard') || t.includes('khatra')) detectedCat = 'SAFETY';

    const targetRadio = document.querySelector(`input[name="category"][value="${detectedCat}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
      targetRadio.closest('.cat-select-card')?.click();
    }
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove('listening');
    micLabel.textContent = 'Voice Input';
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('listening');
    micLabel.textContent = 'Voice Input';
  };
}

// 14. Detail & Action Modal (Before/After & Dispatch Controls)
function openDetailModal(incidentId) {
  const inc = AppState.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  const modal = document.getElementById('detailModalBackdrop');
  document.getElementById('detailModalIcon').textContent = getCategoryIcon(inc.category);
  document.getElementById('detailModalTitle').textContent = inc.title;
  document.getElementById('detailModalTracking').textContent = `${inc.tracking_id} • Assigned: ${inc.assigned_department || 'Auto Routing'}`;

  const isOfficer = AppState.currentRole === 'officer' || AppState.currentRole === 'sarpanch';
  const cipi = inc.cipi_score || 50;

  const content = document.getElementById('detailModalBody');
  content.innerHTML = `
    <!-- Top Stats Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 14px 18px; border-radius: 12px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 12px;">
      <div>
        <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">CIPI Impact Score</span>
        <div style="font-family: var(--font-mono); font-size: 22px; font-weight: 800; color: ${cipi >= 75 ? '#dc2626' : '#059669'};">
          ${cipi} / 100
        </div>
      </div>
      <div>
        <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Current Status</span>
        <div><span class="status-tag status-${(inc.status || 'pending').toLowerCase()}">${inc.status}</span></div>
      </div>
      <div>
        <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Community Vouches</span>
        <div style="font-weight: 800; font-size: 18px;">👍 ${inc.vouch_count} Citizens</div>
      </div>
      <div>
        <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Statutory SLA</span>
        <div style="font-weight: 800; font-size: 18px; color: #2563eb;">⏳ ${inc.sla_hours || 24} Hours</div>
      </div>
    </div>

    <!-- Description & Location -->
    <div style="margin: 16px 0;">
      <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 6px;">Description & Field Context</h4>
      <p style="font-size: 13px; line-height: 1.6; color: #334155;">${escapeHtml(inc.description || 'No additional details logged.')}</p>
      <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
        📍 <strong>Location:</strong> ${escapeHtml(inc.ward)} — ${escapeHtml(inc.address || '')} (GPS: ${inc.latitude}, ${inc.longitude})
      </div>
    </div>

    <!-- Two-Way Proof of Resolution (Before & After Visuals) -->
    <h4 style="font-size: 14px; font-weight: 700; margin-top: 18px;">Visual Evidence & Resolution Proof</h4>
    <div class="before-after-container">
      <div class="proof-photo-card">
        <div class="proof-header before">📷 Citizen Report Photo (Before)</div>
        <img src="${inc.photo_url || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80'}" class="proof-img" alt="Before">
      </div>
      <div class="proof-photo-card">
        <div class="proof-header after">🛠️ Field Crew Completion Photo (After)</div>
        <img src="${inc.after_photo_url || 'https://placehold.co/600x400/e2e8f0/64748b?text=Pending+Field+Completion+Photo'}" class="proof-img" alt="After">
      </div>
    </div>

    ${inc.resolution_notes ? `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; font-size: 12px; color: #065f46;">
        <strong>Technician Completion Notes:</strong> ${escapeHtml(inc.resolution_notes)}
      </div>
    ` : ''}

    <!-- Citizen Quorum Verification Section (Visible when Pending Verification) -->
    ${inc.status === 'PENDING_VERIFICATION' ? `
      <div class="verification-actions-box">
        <h4>👥 Two-Way Citizen Quorum Verification</h4>
        <p>Field workers marked this issue as resolved. As a community member, please confirm if the repair was genuinely completed on the ground.</p>
        <div class="vote-btns-row">
          <button class="btn-confirm-fix" onclick="verifyResolution(${inc.id}, 'CONFIRM')">
            ✅ Yes, Confirmed Fixed on Ground
          </button>
          <button class="btn-dispute-fix" onclick="verifyResolution(${inc.id}, 'DISPUTE')">
            ❌ Dispute: Still Broken / Incomplete
          </button>
        </div>
      </div>
    ` : ''}

    <!-- Authority / Officer Controls Section -->
    ${isOfficer ? `
      <div style="margin-top: 24px; padding: 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #064e3b;">🛡️ Official Dispatch & Resolution Desk</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px;">Assign Field Crew / Contractor</label>
            <input type="text" id="officerAssignee" value="${escapeHtml(inc.assigned_to || '')}" placeholder="e.g. Lineman Unit 4 / PWD Alpha Crew" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px;">Update Operational Status</label>
            <select id="officerStatusSelect" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;">
              <option value="DISPATCHED" ${inc.status === 'DISPATCHED' ? 'selected' : ''}>DISPATCHED — Crew En Route</option>
              <option value="IN_PROGRESS" ${inc.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS — Field Work Active</option>
              <option value="RESOLVED" ${inc.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED — Completed & Signed off</option>
              <option value="REJECTED" ${inc.status === 'REJECTED' ? 'selected' : ''}>REJECTED — Duplicate / Spam</option>
            </select>
          </div>
        </div>

        <button class="btn btn-sm btn-primary" onclick="updateIncidentStatus(${inc.id})" style="background: #064e3b; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 12px;">
          💾 Save Status & Dispatch Notes
        </button>

        <!-- Quick Upload After Photo Button for Field Crew -->
        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
          <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 4px;">Upload Work Done Proof (After Photo)</label>
          <input type="text" id="afterPhotoUrl" placeholder="Enter image URL or simulated proof photo URL" value="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
          <input type="text" id="resolutionNotes" placeholder="Work summary: e.g. Replaced ruptured 300mm pipe and restored water pressure" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
          <button class="btn btn-sm" onclick="submitResolutionProof(${inc.id})" style="background: #10b981; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 12px;">
            📸 Submit Completion Proof for Citizen Quorum
          </button>
        </div>
      </div>
    ` : ''}
  `;

  modal.classList.add('open');
  document.getElementById('closeDetailModalBtn').onclick = () => modal.classList.remove('open');
}

// 15. Update Status (Officer action)
async function updateIncidentStatus(incidentId) {
  const status = document.getElementById('officerStatusSelect').value;
  const assigned_to = document.getElementById('officerAssignee').value;

  try {
    const res = await fetch(`/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        assigned_to,
        officer_name: AppState.currentRole === 'officer' ? 'Er. Rajesh Sharma' : 'Sarpanch Smt. Kavitha'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Incident status updated to ${status}.`, 'success');
      document.getElementById('detailModalBackdrop').classList.remove('open');
      fetchIncidents();
      fetchStats();
    }
  } catch (err) {
    showToast('Failed to update status.', 'warning');
  }
}

// 16. Submit Resolution Proof Photo
async function submitResolutionProof(incidentId) {
  const after_photo_url = document.getElementById('afterPhotoUrl').value;
  const resolution_notes = document.getElementById('resolutionNotes').value;

  try {
    const res = await fetch(`/api/incidents/${incidentId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        after_photo_url,
        resolution_notes,
        officer_name: 'Field Crew Team'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Resolution proof submitted! Opened for Citizen Verification.', 'success');
      document.getElementById('detailModalBackdrop').classList.remove('open');
      fetchIncidents();
      fetchStats();
    }
  } catch (err) {
    showToast('Failed to submit proof.', 'warning');
  }
}

// 17. Citizen Verification Sign-off (Two-Way Resolution)
async function verifyResolution(incidentId, decision) {
  try {
    const res = await fetch(`/api/incidents/${incidentId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        citizen_name: 'Ramesh Kumar (Citizen)',
        feedback: decision === 'CONFIRM' ? 'Field repair verified on ground. Work complete.' : 'Problem still persists on ground.'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, decision === 'CONFIRM' ? 'success' : 'warning');
      document.getElementById('detailModalBackdrop').classList.remove('open');
      fetchIncidents();
      fetchStats();
    }
  } catch (err) {
    showToast('Failed to process verification vote.', 'warning');
  }
}

// 18. Interactive Leaflet Map Integration
function initMap() {
  const mapElement = document.getElementById('civicMap');
  if (!mapElement) return;

  AppState.map = L.map('civicMap').setView([17.4360, 78.4060], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(AppState.map);

  document.getElementById('centerMapBtn')?.addEventListener('click', () => {
    AppState.map.setView([17.4360, 78.4060], 14);
  });
}

function renderMapMarkers() {
  if (!AppState.map) return;

  // Clear existing markers
  AppState.mapMarkers.forEach(m => AppState.map.removeLayer(m));
  AppState.mapMarkers = [];

  AppState.incidents.forEach(inc => {
    if (!inc.latitude || !inc.longitude) return;

    const cipi = inc.cipi_score || 50;
    let pinColor = '#10b981';
    if (cipi >= 75) pinColor = '#ef4444';
    else if (cipi >= 50) pinColor = '#f59e0b';

    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="background: ${pinColor}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 13px;">
          ${getCategoryIcon(inc.category)}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(AppState.map);
    marker.bindPopup(`
      <div style="font-family: 'Inter', sans-serif; padding: 4px;">
        <span style="font-family: monospace; font-size: 10px; color: #64748b; font-weight: bold;">${inc.tracking_id}</span>
        <h4 style="font-size: 13px; font-weight: 700; margin: 4px 0;">${escapeHtml(inc.title)}</h4>
        <div style="font-size: 11px; margin-bottom: 6px;">CIPI Score: <strong>${cipi}/100</strong></div>
        <button onclick="openDetailModal(${inc.id})" style="background: #064e3b; color: #ffffff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer;">
          Inspect Grievance
        </button>
      </div>
    `);

    AppState.mapMarkers.push(marker);
  });
}

// 19. Transparency Leaderboard
function renderTransparencyScorecard() {
  const list = document.getElementById('wardScoreList');
  if (!list) return;

  const wards = [
    { rank: 1, name: 'Ward 1 - Rampur Rural', score: '98/100', status: 'Best Maintained', cleanPct: 96 },
    { rank: 2, name: 'Ward 2 - Hospital Zone', score: '92/100', status: 'Priority Focus', cleanPct: 91 },
    { rank: 3, name: 'Ward 4 - Green Valley Colony', score: '88/100', status: 'Average Response', cleanPct: 86 },
    { rank: 4, name: 'Ward 3 - Gandhi Bazaar', score: '81/100', status: 'High Traffic Density', cleanPct: 79 }
  ];

  list.innerHTML = wards.map(w => `
    <div class="ward-score-item">
      <div class="ward-rank-box">
        <span class="ward-rank">${w.rank}</span>
        <div>
          <strong style="font-size: 13px;">${w.name}</strong>
          <span style="font-size: 11px; color: #64748b; display: block;">${w.status}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-family: var(--font-mono); font-weight: 800; font-size: 14px; color: #065f46;">${w.score}</span>
        <span style="font-size: 10px; color: #64748b; display: block;">${w.cleanPct}% Cleanliness</span>
      </div>
    </div>
  `).join('');
}

// Helper Utilities
function getCategoryIcon(cat) {
  switch (String(cat).toUpperCase()) {
    case 'WATER': return '🚰';
    case 'ROADS': return '🛣️';
    case 'ELECTRICITY': return '⚡';
    case 'SANITATION': return '🧹';
    case 'SAFETY': default: return '🏥';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
