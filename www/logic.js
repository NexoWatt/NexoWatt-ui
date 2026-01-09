/* NexoLogic – simple logic blocks overview (A9) */

async function nwFetchLogicBlocks() {
  try {
    const res = await fetch('/api/logic/blocks');
    if (!res.ok) {
      console.error('Logic blocks request failed:', res.status, res.statusText);
      return [];
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !Array.isArray(data.blocks)) {
      console.warn('Logic blocks payload invalid', data);
      return [];
    }
    return data.blocks;
  } catch (e) {
    console.error('Logic blocks error:', e);
    return [];
  }
}

function nwRenderLogicBlocks(blocks) {
  const grid = document.getElementById('nw-logic-grid');
  const empty = document.getElementById('nw-logic-empty');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!blocks.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  blocks.forEach(block => {
    const card = document.createElement('div');
    const isScene = block.type === 'scene' && block.source && block.source.smarthomeId;
    card.className = 'nw-tile nw-tile--state-off' + (isScene ? '' : ' nw-tile--readonly');

    const header = document.createElement('div');
    header.className = 'nw-tile__header';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'nw-tile__icon';
    const iconSpan = document.createElement('span');
    iconSpan.textContent = (block.icon || 'L').toString().slice(0, 2).toUpperCase();
    iconWrap.appendChild(iconSpan);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'nw-tile__titles';
    const title = document.createElement('div');
    title.className = 'nw-tile__title';
    title.textContent = block.name || block.id || 'Logikblock';
    const subtitle = document.createElement('div');
    subtitle.className = 'nw-tile__subtitle';
    const typeLabel = block.type === 'scene' ? 'Szene' : (block.type || 'Logik');
    const roomLabel = block.room || 'Logik';
    subtitle.textContent = roomLabel + ' · ' + typeLabel;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    header.appendChild(iconWrap);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const content = document.createElement('div');
    content.className = 'nw-tile__content';

    const valueRow = document.createElement('div');
    valueRow.className = 'nw-tile__value-row';
    const valueMain = document.createElement('div');
    valueMain.className = 'nw-tile__value-main';
    valueMain.textContent = block.description || 'aus SmartHome-Szene generiert';

    const valueUnit = document.createElement('div');
    valueUnit.className = 'nw-tile__value-unit';
    valueUnit.textContent = block.source && block.source.smarthomeId
      ? '#' + block.source.smarthomeId
      : '';

    valueRow.appendChild(valueMain);
    valueRow.appendChild(valueUnit);
    content.appendChild(valueRow);

    const footer = document.createElement('div');
    footer.className = 'nw-tile__footer';
    const footerLeft = document.createElement('div');
    footerLeft.className = 'nw-tile__footer-left';
    footerLeft.textContent = block.enabled === false ? 'deaktiviert' : 'bereit';
    const footerRight = document.createElement('div');
    footerRight.className = 'nw-tile__footer-right';
    footerRight.textContent = block.category || 'Szene';

    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);
    content.appendChild(footer);

    card.appendChild(content);

    if (isScene) {
      card.addEventListener('click', () => {
        nwTriggerScene(block);
      });
    }

    grid.appendChild(card);
  });
}

async function nwTriggerScene(block) {
  if (!block || !block.source || !block.source.smarthomeId) return;
  try {
    const res = await fetch('/api/smarthome/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: block.source.smarthomeId }),
    });
    if (!res.ok) {
      console.error('Scene trigger failed:', res.status, res.statusText);
    }
  } catch (e) {
    console.error('Scene trigger error:', e);
  }
}

async function nwInitLogic() {
  const blocks = await nwFetchLogicBlocks();
  nwRenderLogicBlocks(blocks);
}

document.addEventListener('DOMContentLoaded', () => {
  nwInitLogic();
});


// Topbar menu + EVCS menu visibility
(function(){
  const btn=document.getElementById('menuBtn');
  const dd=document.getElementById('menuDropdown');
  if(btn && dd){
    btn.addEventListener('click', (e)=>{ e.preventDefault(); dd.classList.toggle('hidden'); });
    document.addEventListener('click', (e)=>{ if(!dd.contains(e.target) && e.target!==btn) dd.classList.add('hidden'); });
  }
  fetch('/config').then(r=>r.json()).then(cfg=>{
    const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
    const l=document.getElementById('menuEvcsLink');
    if(l) l.classList.toggle('hidden', c < 2);
    const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);
  }).catch(()=>{});
})();
