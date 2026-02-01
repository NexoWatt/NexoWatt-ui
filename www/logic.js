/* NexoLogic – Logic-/Szenen-Übersicht (wertiger, A10) */

let nwLogicAllBlocks = [];
let nwLogicRoomFilter = 'alle';
let nwLogicSearch = '';

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

function nwNormStr(s) {
  return String(s ?? '').toLowerCase().trim();
}

function nwGetBlockRoom(block) {
  const r = String(block && block.room ? block.room : '').trim();
  return r || 'Ohne Raum';
}

function nwBuildRoomList(blocks) {
  const set = new Set();
  blocks.forEach(b => set.add(nwGetBlockRoom(b)));
  const rooms = Array.from(set);
  rooms.sort((a, b) => a.localeCompare(b, 'de'));
  return rooms;
}

function nwRenderLogicRoomChips(blocks) {
  const wrap = document.getElementById('nw-logic-room-chips');
  if (!wrap) return;

  const rooms = nwBuildRoomList(blocks);

  const mkChip = (label, value) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip' + (nwLogicRoomFilter === value ? ' nw-sh-chip--active' : '');
    b.textContent = label;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      nwLogicRoomFilter = value;
      nwRenderLogicRoomChips(nwLogicAllBlocks);
      nwRenderLogicBlocks(nwApplyLogicFilters(nwLogicAllBlocks));
    });
    return b;
  };

  wrap.innerHTML = '';
  wrap.appendChild(mkChip('Alle', 'alle'));
  rooms.forEach(r => wrap.appendChild(mkChip(r, r)));
}

function nwApplyLogicFilters(blocks) {
  const q = nwNormStr(nwLogicSearch);
  const rf = nwLogicRoomFilter;

  return blocks.filter(b => {
    if (rf !== 'alle' && nwGetBlockRoom(b) !== rf) return false;

    if (q) {
      const hay = [
        b.name,
        b.id,
        b.type,
        b.category,
        b.room,
        b.function,
        b.description,
        (b.source && b.source.smarthomeId) ? String(b.source.smarthomeId) : '',
      ].map(nwNormStr).join(' | ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function nwBuildLogicTile(block) {
  const isScene = block.type === 'scene' && block.source && block.source.smarthomeId;
  const enabled = block.enabled !== false;

  const tile = document.createElement('div');
  tile.className = [
    'nw-tile',
    'nw-tile--size-m',
    (block.type === 'scene' ? 'nw-tile--type-scene' : 'nw-tile--type-sensor'),
    enabled ? 'nw-tile--state-ok' : 'nw-tile--state-off',
    isScene ? '' : 'nw-tile--readonly',
  ].filter(Boolean).join(' ');

  if (isScene) {
    tile.style.cursor = 'pointer';
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
  } else {
    tile.style.cursor = 'default';
  }

  // --- Top ---
  const top = document.createElement('div');
  top.className = 'nw-tile__top';

  const iconCircle = document.createElement('div');
  iconCircle.className = 'nw-tile__icon-circle';
  const ico = (block.icon || (block.type === 'scene' ? '🎬' : '⚙')).toString();
  iconCircle.textContent = ico.length > 2 ? ico.slice(0, 2) : ico;

  const titles = document.createElement('div');
  titles.style.flex = '1';
  titles.style.marginLeft = '8px';
  titles.style.minWidth = '0';

  const alias = document.createElement('div');
  alias.className = 'nw-tile__alias';
  alias.style.whiteSpace = 'nowrap';
  alias.style.overflow = 'hidden';
  alias.style.textOverflow = 'ellipsis';
  alias.textContent = block.name || block.id || 'Logikblock';

  const room = document.createElement('div');
  room.className = 'nw-tile__room';
  room.style.whiteSpace = 'nowrap';
  room.style.overflow = 'hidden';
  room.style.textOverflow = 'ellipsis';

  const roomLabel = nwGetBlockRoom(block);
  const typeLabel = block.type === 'scene' ? 'Szene' : (block.type || 'Logik');
  const cat = String(block.category || '').trim();
  room.textContent = cat ? `${roomLabel} • ${cat}` : `${roomLabel} • ${typeLabel}`;

  titles.appendChild(alias);
  titles.appendChild(room);

  const badge = document.createElement('div');
  badge.className = 'nw-tile__badge';
  badge.textContent = typeLabel;

  top.appendChild(iconCircle);
  top.appendChild(titles);
  top.appendChild(badge);

  // --- Middle ---
  const mid = document.createElement('div');
  mid.className = 'nw-tile__middle';

  const value = document.createElement('div');
  value.className = 'nw-tile__value';
  value.textContent = isScene ? 'Ausführen' : 'Info';

  const unit = document.createElement('div');
  unit.className = 'nw-tile__unit';
  unit.textContent = enabled ? (isScene ? 'Tippen' : 'Nur Anzeige') : 'Deaktiviert';

  mid.appendChild(value);
  mid.appendChild(unit);

  // --- Bottom ---
  const bottom = document.createElement('div');
  bottom.className = 'nw-tile__bottom';

  const left = document.createElement('span');
  left.className = 'muted';
  left.textContent = block.description ? String(block.description) : '—';

  const right = document.createElement('span');
  right.className = 'muted';
  right.textContent = (block.source && block.source.smarthomeId)
    ? '#' + block.source.smarthomeId
    : (block.id ? String(block.id) : '');

  bottom.appendChild(left);
  bottom.appendChild(right);

  tile.appendChild(top);
  tile.appendChild(mid);
  tile.appendChild(bottom);

  if (isScene) {
    tile.addEventListener('click', () => nwTriggerScene(block));
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nwTriggerScene(block);
      }
    });
  }

  return tile;
}

function nwRenderLogicBlocks(blocks) {
  const grid = document.getElementById('nw-logic-grid');
  const empty = document.getElementById('nw-logic-empty');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!blocks.length) {
    empty.style.display = 'block';
    empty.textContent = nwLogicAllBlocks.length
      ? 'Keine Treffer (Filter/ Suche anpassen).'
      : 'Keine Logik‑Blöcke gefunden.';
    return;
  }
  empty.style.display = 'none';

  blocks.forEach(block => grid.appendChild(nwBuildLogicTile(block)));
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
  nwLogicAllBlocks = await nwFetchLogicBlocks();

  // filters
  const inp = document.getElementById('nw-logic-search');
  if (inp) {
    inp.addEventListener('input', () => {
      nwLogicSearch = inp.value || '';
      nwRenderLogicBlocks(nwApplyLogicFilters(nwLogicAllBlocks));
    });
  }

  nwRenderLogicRoomChips(nwLogicAllBlocks);
  nwRenderLogicBlocks(nwApplyLogicFilters(nwLogicAllBlocks));
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
