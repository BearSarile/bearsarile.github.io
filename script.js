const DATA_URL = 'projects.json';

async function fetchData(){
  const res = await fetch(DATA_URL);
  return res.ok ? res.json() : {projects:[]};
}

function createCard(p){
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <img class="thumb" loading="lazy" alt="${escapeHtml(p.title)} thumbnail" src="${p.media.images && p.media.images[0] ? p.media.images[0] : ''}">
    <h3>${escapeHtml(p.title)}</h3>
    <div class="meta"><span class="badge">${escapeHtml(p.role)}</span><span class="badge">${p.year}</span><span class="badge">${escapeHtml(p.status)}</span></div>
    <p style="color:var(--muted);margin:8px 0 0">${escapeHtml(p.shortDescription)}</p>
    <div class="actions">
      <button class="btn view" data-id="${p.id}">View details</button>
    </div>
  `;
  return el;
}

function escapeHtml(s=''){ return s.replace?.(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ?? s; }

function openModalById(id, data){
  const project = data.projects.find(x=>x.id===id);
  if(!project) return;
  const modal = document.getElementById('project-modal');
  const container = document.getElementById('project-detail');
  container.innerHTML = `
    <h2>${escapeHtml(project.title)}</h2>
    <div class="meta"><span class="badge">${escapeHtml(project.role)}</span><span class="badge">${project.year}</span><span class="badge">${escapeHtml(project.status)}</span></div>
    <p style="margin-top:8px">${escapeHtml(project.shortDescription)}</p>
    <h4>Features</h4>
    <ul>${project.features.map(f=>`<li>${escapeHtml(f)}</li>`).join('')}</ul>
    <h4>Technologies</h4>
    <div class="tech-list">${project.technologies.map(t=>`<span class="tech">${escapeHtml(t)}</span>`).join('')}</div>
    <div id="store-links" style="margin-top:12px"></div>
    <div class="gallery" id="gallery"></div>
    <p style="color:var(--muted);margin-top:12px">${escapeHtml(project.notes || '')}</p>
  `;
  renderStores(project);
  renderMedia(project);
  modal.setAttribute('aria-hidden','false');
  location.hash = project.id;
}

function renderStores(project){
  const container = document.getElementById('store-links');
  const stores = project.stores || {};
  const items = [];
  if(stores.steam) items.push(`<a class="btn" href="${stores.steam}" target="_blank" rel="noopener">Steam</a>`);
  if(stores.google_play) items.push(`<a class="btn" href="${stores.google_play}" target="_blank" rel="noopener">Google Play</a>`);
  if(stores.app_store) items.push(`<a class="btn" href="${stores.app_store}" target="_blank" rel="noopener">App Store</a>`);
  if(!items.length) items.push(`<span class="badge">Archived / No store listing</span>`);
  container.innerHTML = items.join(' ');
}

function renderMedia(project){
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  const imgs = (project.media && project.media.images) || [];
  for(const src of imgs){
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = `${project.title} screenshot`;
    img.src = src;
    gallery.appendChild(img);
  }
  const vids = (project.media && project.media.videos) || [];
  for(const v of vids){
    if(v.type === 'hosted'){
      const video = document.createElement('video');
      video.controls = true; video.muted = true; video.loop = false; video.preload = 'metadata';
      video.src = v.src; video.width = 480;
      gallery.appendChild(video);
    } else if(v.type === 'youtube' || v.type === 'vimeo'){
      const iframe = document.createElement('iframe');
      iframe.src = v.src;
      iframe.width = '480'; iframe.height = '270';
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('loading','lazy');
      gallery.appendChild(iframe);
    }
  }
}

function closeModal(){
  const modal = document.getElementById('project-modal');
  modal.setAttribute('aria-hidden','true');
  history.replaceState(null, '', location.pathname);
}

// setup modal events
document.addEventListener('click', e=>{
  if(e.target.matches('.modal-close')) closeModal();
  if(e.target.matches('.modal-backdrop') || e.target.classList.contains('modal-backdrop')) closeModal();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeModal(); });

let APP_DATA = null;
let ACTIVE = { year: '', status: '', techs: new Set(), q: '' };

function populateFilters(data){
  const years = [...new Set(data.projects.map(p=>p.year).filter(Boolean))].sort((a,b)=>b-a);
  const yearSel = document.getElementById('filter-year');
  for(const y of years) yearSel.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
  const techs = new Set();
  data.projects.forEach(p => (p.technologies||[]).forEach(t => techs.add(t)));
  const techsContainer = document.getElementById('filter-techs');
  for(const t of Array.from(techs).sort()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip';
    btn.textContent = t;
    btn.dataset.tech = t;
    btn.addEventListener('click', ()=> {
      btn.classList.toggle('active');
      if(btn.classList.contains('active')) ACTIVE.techs.add(t); else ACTIVE.techs.delete(t);
      applyFilters();
    });
    techsContainer.appendChild(btn);
  }
  document.getElementById('filter-year').addEventListener('change', (e)=> { ACTIVE.year = e.target.value; applyFilters(); });
  document.getElementById('filter-status').addEventListener('change', (e)=> { ACTIVE.status = e.target.value; applyFilters(); });
  document.getElementById('filter-search').addEventListener('input', (e)=> { ACTIVE.q = e.target.value.trim().toLowerCase(); applyFilters(); });
}

function projectMatches(p){
  if(ACTIVE.year && String(p.year) !== String(ACTIVE.year)) return false;
  if(ACTIVE.status && String(p.status) !== String(ACTIVE.status)) return false;
  if(ACTIVE.techs.size) {
    const has = (p.technologies||[]).some(t => ACTIVE.techs.has(t));
    if(!has) return false;
  }
  if(ACTIVE.q) {
    const hay = [
      p.title, p.shortDescription, (p.features||[]).join(' '), (p.technologies||[]).join(' ')
    ].join(' ').toLowerCase();
    if(!hay.includes(ACTIVE.q)) return false;
  }
  return true;
}

function renderProjects(data){
  APP_DATA = data;
  populateFilters(data);
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';
  document.getElementById('site-name').textContent = data.site?.name ?? 'Portfolio';
  document.getElementById('site-tagline').textContent = data.site?.tagline ?? '';
  data.projects.forEach(p => { if(projectMatches(p)) grid.appendChild(createCard(p)); });
  grid.querySelectorAll('.view').forEach(btn => btn.addEventListener('click', ()=> openModalById(btn.dataset.id, data)));
  const hash = location.hash.replace('#','');
  if(hash) openModalById(hash, data);
}

function applyFilters(){
  if(!APP_DATA) return;
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';
  APP_DATA.projects.forEach(p => { if(projectMatches(p)) grid.appendChild(createCard(p)); });
  grid.querySelectorAll('.view').forEach(btn => btn.addEventListener('click', ()=> openModalById(btn.dataset.id, APP_DATA)));
}

(async function init(){
  const data = await fetchData();
  renderProjects(data);
})();