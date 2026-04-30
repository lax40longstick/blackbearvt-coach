/* BenchBoss Coach HQ - Team Branding v0.5.3
 * Adds customizable team colors, logo, and a clean settings UI.
 * Uses localStorage/app state now; SUPABASE_TEAM_BRANDING.md documents production persistence.
 */

const DEFAULT_BRAND = Object.freeze({
  productName: 'BenchBoss Coach HQ',
  shortName: 'BenchBoss',
  teamName: 'Black Bears Youth 12U T2',
  orgName: 'Black Bear Hockey',
  primaryColor: '#7dd3d8',
  secondaryColor: '#f4cf57',
  accentColor: '#4ad9a8',
  backgroundColor: '#0a0a0a',
  logoDataUrl: '',
  logoMode: 'monogram',
  monogram: 'BB',
});

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeHex(value, fallback) {
  const raw = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function getBrand(state) {
  const source = state?.teamBranding || {};
  return {
    ...DEFAULT_BRAND,
    ...source,
    primaryColor: normalizeHex(source.primaryColor, DEFAULT_BRAND.primaryColor),
    secondaryColor: normalizeHex(source.secondaryColor, DEFAULT_BRAND.secondaryColor),
    accentColor: normalizeHex(source.accentColor, DEFAULT_BRAND.accentColor),
    backgroundColor: normalizeHex(source.backgroundColor, DEFAULT_BRAND.backgroundColor),
    monogram: String(source.monogram || DEFAULT_BRAND.monogram).slice(0, 4).toUpperCase(),
  };
}

function ensureTeamBrandingState(state) {
  if (!state) return getBrand(null);
  state.teamBranding = getBrand(state);
  return state.teamBranding;
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function applyTeamBranding(state) {
  const brand = ensureTeamBrandingState(state || window.state || {});
  setCssVar('--teal', brand.primaryColor);
  setCssVar('--teal-bright', brand.primaryColor);
  setCssVar('--teal-dim', brand.accentColor);
  setCssVar('--tie', brand.primaryColor);
  setCssVar('--gold', brand.secondaryColor);
  setCssVar('--team-primary', brand.primaryColor);
  setCssVar('--team-secondary', brand.secondaryColor);
  setCssVar('--team-accent', brand.accentColor);
  setCssVar('--team-bg', brand.backgroundColor);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', brand.primaryColor);

  document.querySelectorAll('[data-brand-product]').forEach(el => { el.textContent = brand.productName; });
  document.querySelectorAll('[data-brand-short]').forEach(el => { el.textContent = brand.shortName; });
  document.querySelectorAll('[data-brand-team]').forEach(el => { el.textContent = brand.teamName; });
  document.querySelectorAll('[data-brand-org]').forEach(el => { el.textContent = brand.orgName; });

  const topTitle = document.getElementById('topTitle');
  if (topTitle) topTitle.textContent = brand.shortName.toUpperCase();
  document.querySelectorAll('[data-workspace-team]').forEach(el => { if (brand.teamName) el.textContent = brand.teamName.toUpperCase(); });
  document.querySelectorAll('[data-workspace-org]').forEach(el => { if (brand.orgName) el.textContent = brand.orgName.toUpperCase(); });

  const logo = document.getElementById('appBrandLogo');
  const logoImg = document.getElementById('appBrandLogoImg');
  const logoText = document.getElementById('appBrandLogoText');
  if (logo) {
    logo.style.borderColor = brand.primaryColor;
    logo.style.color = brand.primaryColor;
  }
  if (logoImg && logoText) {
    if (brand.logoDataUrl) {
      logoImg.src = brand.logoDataUrl;
      logoImg.style.display = 'block';
      logoText.style.display = 'none';
    } else {
      logoImg.removeAttribute('src');
      logoImg.style.display = 'none';
      logoText.style.display = 'block';
      logoText.textContent = brand.monogram;
    }
  }
  return brand;
}

function updateBrandingFromSettings() {
  const state = window.state;
  if (!state) return;
  const brand = ensureTeamBrandingState(state);
  const next = {
    ...brand,
    productName: document.getElementById('brandProductName')?.value.trim() || DEFAULT_BRAND.productName,
    shortName: document.getElementById('brandShortName')?.value.trim() || DEFAULT_BRAND.shortName,
    orgName: document.getElementById('brandOrgName')?.value.trim() || DEFAULT_BRAND.orgName,
    teamName: document.getElementById('brandTeamName')?.value.trim() || DEFAULT_BRAND.teamName,
    monogram: (document.getElementById('brandMonogram')?.value.trim() || DEFAULT_BRAND.monogram).slice(0, 4).toUpperCase(),
    primaryColor: normalizeHex(document.getElementById('brandPrimaryColor')?.value, brand.primaryColor),
    secondaryColor: normalizeHex(document.getElementById('brandSecondaryColor')?.value, brand.secondaryColor),
    accentColor: normalizeHex(document.getElementById('brandAccentColor')?.value, brand.accentColor),
    backgroundColor: normalizeHex(document.getElementById('brandBackgroundColor')?.value, brand.backgroundColor),
  };
  state.teamBranding = next;
  applyTeamBranding(state);
  renderBrandingPreview(state);
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.toast === 'function') window.toast('Team branding saved');
}

function resetTeamBranding() {
  const state = window.state;
  if (!state) return;
  state.teamBranding = { ...DEFAULT_BRAND };
  fillBrandingForm(state);
  applyTeamBranding(state);
  renderBrandingPreview(state);
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.toast === 'function') window.toast('Branding reset');
}

function removeTeamLogo() {
  const state = window.state;
  if (!state) return;
  const brand = ensureTeamBrandingState(state);
  state.teamBranding = { ...brand, logoDataUrl: '' };
  fillBrandingForm(state);
  applyTeamBranding(state);
  renderBrandingPreview(state);
  if (typeof window.saveState === 'function') window.saveState();
}

function handleTeamLogoUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    if (typeof window.toast === 'function') window.toast('Please choose an image file');
    return;
  }
  if (file.size > 1024 * 1024 * 1.5) {
    if (typeof window.toast === 'function') window.toast('Logo must be under 1.5MB');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const state = window.state;
    if (!state) return;
    const brand = ensureTeamBrandingState(state);
    state.teamBranding = { ...brand, logoDataUrl: String(reader.result || '') };
    applyTeamBranding(state);
    renderBrandingPreview(state);
    if (typeof window.saveState === 'function') window.saveState();
    if (typeof window.toast === 'function') window.toast('Logo uploaded');
  };
  reader.readAsDataURL(file);
}

function fillBrandingForm(state) {
  const brand = ensureTeamBrandingState(state || window.state || {});
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
  set('brandProductName', brand.productName);
  set('brandShortName', brand.shortName);
  set('brandOrgName', brand.orgName);
  set('brandTeamName', brand.teamName);
  set('brandMonogram', brand.monogram);
  set('brandPrimaryColor', brand.primaryColor);
  set('brandSecondaryColor', brand.secondaryColor);
  set('brandAccentColor', brand.accentColor);
  set('brandBackgroundColor', brand.backgroundColor);
}

function renderBrandingPreview(state) {
  const mount = document.getElementById('teamBrandingPreview');
  if (!mount) return;
  const brand = ensureTeamBrandingState(state || window.state || {});
  const logo = brand.logoDataUrl
    ? `<img src="${esc(brand.logoDataUrl)}" alt="Team logo">`
    : `<span>${esc(brand.monogram)}</span>`;
  mount.innerHTML = `
    <div class="brand-preview-card" style="--preview-primary:${esc(brand.primaryColor)};--preview-secondary:${esc(brand.secondaryColor)};--preview-accent:${esc(brand.accentColor)};--preview-bg:${esc(brand.backgroundColor)}">
      <div class="brand-preview-top">
        <div class="brand-preview-logo">${logo}</div>
        <div>
          <h3>${esc(brand.teamName)}</h3>
          <p>${esc(brand.productName)} · ${esc(brand.orgName)}</p>
        </div>
      </div>
      <div class="brand-preview-body">
        <div><strong>Practice</strong><span>Published drills and lineup cards inherit team colors.</span></div>
        <button type="button">Primary Button</button>
      </div>
    </div>`;
}

function hydrateBrandingSettings(state) {
  ensureTeamBrandingState(state || window.state || {});
  fillBrandingForm(state || window.state || {});
  applyTeamBranding(state || window.state || {});
  renderBrandingPreview(state || window.state || {});
}

window.BenchBossBranding = {
  DEFAULT_BRAND,
  ensureTeamBrandingState,
  applyTeamBranding,
  hydrateBrandingSettings,
  updateBrandingFromSettings,
  resetTeamBranding,
  removeTeamLogo,
  handleTeamLogoUpload,
};

window.updateBrandingFromSettings = updateBrandingFromSettings;
window.resetTeamBranding = resetTeamBranding;
window.removeTeamLogo = removeTeamLogo;
window.handleTeamLogoUpload = handleTeamLogoUpload;
