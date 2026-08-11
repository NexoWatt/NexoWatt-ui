// @runtime-transpile
/**
 * NexoWatt EOS Betriebsstrategien – AppCenter, Ressourcen und Regelbaukasten.
 *
 * Diese Browserkomponente verwaltet ausschließlich die Konfiguration für das
 * modulare Ressourcen-/Strategiemodell. RC54 ergänzt Regelbaukasten und Trockenlauf, bleibt aber strikt im Beobachtungsmodus:
 * Es werden keine Hardware-Sollwerte geschrieben und keine bestehenden Lade-,
 * Speicher- oder Verbraucherregler übernommen.
 */
(function () {
  'use strict';

  type AnyRecord = Record<string, any>;

  const FOUNDATION_VERSION = '0.8.177';
  const RULE_BUILDER_VERSION = '0.8.178';
  const APP_ID = 'operatingStrategies';
  const ROOT_ID = 'nwOperatingStrategiesRoot';

  let setStatus: (message: string, kind?: string) => void = () => {};
  let getEdition: () => string = () => 'none';
  let mountNode: HTMLElement | null = null;
  let fullConfig: AnyRecord = {};
  let workingConfig: AnyRecord = {};
  let appEnabled = false;

  const byId = (id: string): HTMLElement | null => document.getElementById(id);
  const esc = (value: any): string => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const clone = <T>(value: T): T => {
    try { return JSON.parse(JSON.stringify(value)); } catch (_error) { return value; }
  };
  const record = (value: any): AnyRecord => (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
  const list = (value: any): AnyRecord[] => Array.isArray(value) ? value.filter((entry) => entry && typeof entry === 'object') : [];
  const text = (value: any, fallback = ''): string => {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback;
  };
  const bool = (value: any, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
  const number = (value: any, fallback: number, min: number, max: number): number => {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.max(min, Math.min(max, safe));
  };
  const integer = (value: any, fallback: number, min: number, max: number): number => Math.round(number(value, fallback, min, max));
  const safeId = (value: any, fallback: string): string => {
    const raw = text(value).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return raw || fallback;
  };

  function withUniqueIds(items: AnyRecord[], prefix: string): AnyRecord[] {
    const used = new Set<string>();
    return items.map((entry, index) => {
      const base = safeId(entry && entry.id, `${prefix}-${index + 1}`);
      let id = base;
      let suffix = 2;
      while (used.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      return { ...entry, id };
    });
  }
  const edition = (): string => {
    const raw = String(getEdition() || '').trim().toLowerCase();
    if (raw === 'eos' || raw === 'pro') return 'eos';
    if (raw === 'hems' || raw === 'home') return 'hems';
    return 'none';
  };

  const ruleBuilder = (): AnyRecord => record((window as any).NexoWattOperatingStrategiesRuleBuilder);

  function defaultNightReserve(targetSocPct: number): AnyRecord {
    return {
      enabled: true,
      storageResourceId: '',
      targetSocPct,
      absoluteMinSocPct: 10,
      startMode: 'sunset',
      startTime: '18:00',
      endMode: 'sunrise',
      endTime: '07:00',
    };
  }

  function defaultProfiles(): AnyRecord[] {
    return [
      {
        id: 'winter',
        name: 'Winterbetrieb',
        enabled: true,
        season: 'winter',
        nightReserve: defaultNightReserve(40),
      },
      {
        id: 'summer',
        name: 'Sommerbetrieb',
        enabled: true,
        season: 'summer',
        nightReserve: defaultNightReserve(60),
      },
    ];
  }

  function defaultControlContract(): AnyRecord {
    return {
      chargingScope: 'auto-only',
      explicitAutoSourceOptInRequired: true,
      existingChargingModesUntouched: true,
      singleWriterRequired: true,
      fallbackAutoSource: 'standard-auto',
    };
  }

  function defaultConfig(): AnyRecord {
    const builder = ruleBuilder();
    return {
      schemaVersion: 2,
      enabled: false,
      mode: 'observe',
      controlTakeoverEnabled: false,
      writeExecutionEnabled: false,
      autoImportExisting: true,
      activeProfileId: 'winter',
      controlContract: defaultControlContract(),
      resourceLinks: [],
      customResources: [],
      profiles: defaultProfiles(),
      rules: [],
      simulation: typeof builder.defaultSimulation === 'function' ? builder.defaultSimulation('winter') : { activeProfileId: 'winter', resourceStates: {} },
      metadata: {
        foundationVersion: FOUNDATION_VERSION,
        ruleBuilderVersion: RULE_BUILDER_VERSION,
        lastEditedAt: '',
      },
    };
  }

  function normalizeMappings(input: any): AnyRecord {
    const source = record(input);
    const keys = [
      'powerReadId',
      'energyReadId',
      'stateReadId',
      'socReadId',
      'temperatureReadId',
      'alarmReadId',
      'onlineReadId',
      'switchWriteId',
      'switchReadId',
      'setpointWriteId',
      'setpointReadId',
      'capacityReadId',
      'forecastEnergyReadId',
      'surplusPowerReadId',
    ];
    const out: AnyRecord = {};
    keys.forEach((key) => { out[key] = text(source[key]); });
    return out;
  }

  function normalizeCustomResource(input: any, index: number): AnyRecord {
    const source = record(input);
    const resourceTypes = ['consumer', 'thermal', 'chargingPoint', 'storage', 'producer', 'sensor', 'virtualGroup'];
    const controlTypes = ['monitor', 'switch', 'setpoint', 'stepped', 'thermal', 'energyTarget'];
    const failSafePolicies = ['observe-only', 'release', 'safe-on', 'safe-off', 'block-optimization'];
    const powerUnits = ['W', 'kW'];
    const resourceType = resourceTypes.includes(text(source.resourceType)) ? text(source.resourceType) : 'consumer';
    const controlType = controlTypes.includes(text(source.controlType)) ? text(source.controlType) : 'monitor';
    const failSafePolicy = failSafePolicies.includes(text(source.failSafePolicy)) ? text(source.failSafePolicy) : 'observe-only';
    const powerUnit = powerUnits.includes(text(source.powerUnit)) ? text(source.powerUnit) : 'W';
    return {
      id: safeId(source.id, `custom-${index + 1}`),
      name: text(source.name, `Benutzerdefinierte Ressource ${index + 1}`),
      enabled: source.enabled !== false,
      resourceType,
      controlType,
      powerUnit,
      staleTimeoutSec: integer(source.staleTimeoutSec, 60, 1, 86400),
      failSafePolicy,
      usableCapacityKWh: number(source.usableCapacityKWh, 0, 0, 1000000),
      minPowerW: number(source.minPowerW, 0, 0, 1000000000),
      maxPowerW: number(source.maxPowerW, 0, 0, 1000000000),
      efficiencyPct: number(source.efficiencyPct, 92, 1, 100),
      resourceSubtype: text(source.resourceSubtype),
      autoOnly: resourceType === 'chargingPoint' ? true : bool(source.autoOnly, false),
      observeOnly: true,
      writeEnabled: false,
      mappings: normalizeMappings(source.mappings),
    };
  }

  function normalizeProfile(input: any, index: number): AnyRecord {
    const source = record(input);
    const reserve = record(source.nightReserve);
    const seasons = ['winter', 'summer', 'custom'];
    const modes = ['sunset', 'sunrise', 'fixed'];
    const targetSocPct = number(reserve.targetSocPct, index === 0 ? 40 : 60, 0, 100);
    const absoluteMinSocPct = Math.min(targetSocPct, number(reserve.absoluteMinSocPct, 10, 0, 100));
    const startMode = modes.includes(text(reserve.startMode)) ? text(reserve.startMode) : 'sunset';
    const endMode = modes.includes(text(reserve.endMode)) ? text(reserve.endMode) : 'sunrise';
    return {
      id: safeId(source.id, `profile-${index + 1}`),
      name: text(source.name, `Betriebsprofil ${index + 1}`),
      enabled: source.enabled !== false,
      season: seasons.includes(text(source.season)) ? text(source.season) : 'custom',
      nightReserve: {
        enabled: reserve.enabled !== false,
        storageResourceId: text(reserve.storageResourceId),
        targetSocPct,
        absoluteMinSocPct,
        startMode,
        startTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.startTime)) ? text(reserve.startTime) : '18:00',
        endMode,
        endTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(reserve.endTime)) ? text(reserve.endTime) : '07:00',
      },
    };
  }

  function normalizeLink(input: any): AnyRecord | null {
    const source = record(input);
    const sourceId = text(source.sourceId);
    if (!sourceId) return null;
    const roles = ['auto', 'cooling', 'heatPump', 'heatingRod', 'flexConsumer', 'storage', 'chargingPoint'];
    const roleOverride = roles.includes(text(source.roleOverride)) ? text(source.roleOverride) : 'auto';
    return {
      sourceId,
      enabled: source.enabled === true,
      priority: integer(source.priority, 50, 1, 100),
      roleOverride,
      autoOnly: sourceId.startsWith('evcs:') || roleOverride === 'chargingPoint' ? true : bool(source.autoOnly, false),
      observeOnly: true,
      writeEnabled: false,
    };
  }

  function normalizeConfig(input: any): AnyRecord {
    const base = defaultConfig();
    const source = record(input);
    const profiles = withUniqueIds(list(source.profiles).map(normalizeProfile), 'profile');
    const normalizedProfiles = profiles.length ? profiles : defaultProfiles();
    const profileIds = new Set(normalizedProfiles.map((profile) => profile.id));
    const requestedActive = text(source.activeProfileId, 'winter');
    const resourceLinks = list(source.resourceLinks).map(normalizeLink).filter(Boolean) as AnyRecord[];
    const dedupedLinks: AnyRecord[] = [];
    const linkIds = new Set<string>();
    resourceLinks.forEach((entry) => {
      if (linkIds.has(entry.sourceId)) return;
      linkIds.add(entry.sourceId);
      dedupedLinks.push(entry);
    });
    const activeProfileId = profileIds.has(requestedActive) ? requestedActive : (normalizedProfiles[0]?.id || 'winter');
    const builder = ruleBuilder();
    const normalizedRules = typeof builder.normalizeRules === 'function'
      ? builder.normalizeRules(source.rules, Array.from(profileIds))
      : [];
    const simulation = typeof builder.normalizeSimulation === 'function'
      ? builder.normalizeSimulation(source.simulation, activeProfileId)
      : { activeProfileId, resourceStates: {} };
    return {
      ...base,
      ...clone(source),
      schemaVersion: 2,
      enabled: source.enabled === true,
      mode: 'observe',
      controlTakeoverEnabled: false,
      writeExecutionEnabled: false,
      autoImportExisting: source.autoImportExisting !== false,
      activeProfileId,
      controlContract: defaultControlContract(),
      resourceLinks: dedupedLinks,
      customResources: withUniqueIds(list(source.customResources).map(normalizeCustomResource), 'custom'),
      profiles: normalizedProfiles,
      // RC54 speichert Regelbausteine ausschließlich für Planung und Trockenlauf.
      // Jeder Baustein bleibt fail-closed auf simulationOnly=true / executionEnabled=false.
      rules: normalizedRules,
      simulation,
      metadata: {
        ...record(source.metadata),
        foundationVersion: FOUNDATION_VERSION,
        ruleBuilderVersion: RULE_BUILDER_VERSION,
        lastEditedAt: text(record(source.metadata).lastEditedAt),
      },
    };
  }

  function objectDpCount(value: any): number {
    if (!value || typeof value !== 'object') return 0;
    let count = 0;
    Object.entries(value).forEach(([key, entry]) => {
      if (/id$/i.test(key) && text(entry)) count += 1;
      else if (entry && typeof entry === 'object') count += objectDpCount(entry);
    });
    return count;
  }

  function truthyDp(value: any): boolean {
    return !!text(value);
  }

  function deriveStorageFarmResources(config: AnyRecord): AnyRecord[] {
    const app = record(record(record(config.emsApps).apps).storagefarm);
    const farm = record(config.storageFarm);
    const storages = list(farm.storages);
    if (app.installed !== true && storages.length === 0) return [];
    return storages.map((storage, index) => {
      const readCandidates = [
        storage.socId, storage.signedPowerId, storage.chargePowerId,
        storage.dischargePowerId, storage.gridPowerId, storage.pvPowerId,
      ];
      const writeCandidates = [
        storage.feneconGridSetpointId, storage.setSignedPowerId, storage.setChargePowerId,
        storage.setDischargePowerId, storage.maxChargePowerId, storage.maxDischargePowerId,
        storage.chargeEnableId, storage.dischargeEnableId, storage.runWriteId,
      ];
      const reads = readCandidates.filter(truthyDp).length;
      const writes = writeCandidates.filter(truthyDp).length;
      return {
        sourceId: `storagefarm:${index + 1}`,
        name: text(storage.name, `Speicher ${index + 1}`),
        resourceType: 'storage',
        resourceSubtype: 'battery',
        controlType: writes ? 'setpoint' : 'monitor',
        usableCapacityKWh: number(storage.usableCapacityKWh ?? storage.capacityKWh, 0, 0, 1000000),
        efficiencyPct: number(storage.efficiencyPct, 92, 1, 100),
        sourceLabel: `EOS Speicherfarm · Speicher ${index + 1}`,
        sourceTab: 'storagefarm',
        reads,
        writes,
        capabilities: [
          reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig',
          writes ? 'Stellpfad vorhanden – bestehende Speicherfarm bleibt zuständig' : 'Kein Stellpfad erkannt',
          'Nachtenergie-Reserve vorgesehen',
        ],
      };
    });
  }

  function deriveStorageResource(config: AnyRecord): AnyRecord[] {
    const storageApp = record(record(record(config.emsApps).apps).storage);
    const storage = record(config.storage);
    const storageDps = record(storage.datapoints);
    const dps = record(config.datapoints);
    const installed = storageApp.installed === true;
    const readCandidates = [
      storageDps.socObjectId, storageDps.powerObjectId, storageDps.chargePowerObjectId,
      storageDps.dischargePowerObjectId, dps.storageSoc, dps.storagePower,
      dps.storageChargePower, dps.storageDischargePower,
    ];
    const writeCandidates = [
      storageDps.targetPowerObjectId, storageDps.maxChargeObjectId,
      storageDps.maxDischargeObjectId, storageDps.chargeEnableObjectId,
      storageDps.dischargeEnableObjectId, storageDps.runObjectId,
    ];
    if (!installed && !readCandidates.some(truthyDp) && !writeCandidates.some(truthyDp)) return [];
    const reads = readCandidates.filter(truthyDp).length;
    const writes = writeCandidates.filter(truthyDp).length;
    return [{
      sourceId: 'storage:primary',
      name: text(storage.name, 'Speicher'),
      resourceType: 'storage',
      resourceSubtype: 'battery',
      controlType: writes ? 'setpoint' : 'monitor',
      usableCapacityKWh: number(storage.usableCapacityKWh ?? storage.capacityKWh, 0, 0, 1000000),
      efficiencyPct: number(storage.efficiencyPct, 92, 1, 100),
      sourceLabel: 'EOS Speicherregelung',
      sourceTab: 'storageconfig',
      reads,
      writes,
      capabilities: [
        reads ? 'Messwerte vorhanden' : 'Messwerte unvollständig',
        writes ? 'Stellpfad vorhanden – hier gesperrt' : 'Kein Stellpfad erkannt',
        'Nachtenergie-Reserve vorgesehen',
      ],
    }];
  }

  function deriveEvcsResources(config: AnyRecord): AnyRecord[] {
    const settingsConfig = record(config.settingsConfig);
    return list(settingsConfig.evcsList).map((row, index) => {
      const readKeys = ['powerId', 'energyTotalId', 'statusId', 'vehicleConnectedId', 'chargeDemandId', 'heartbeatId', 'vehicleSocId', 'onlineId', 'activeId'];
      const writeKeys = ['setCurrentAId', 'setPowerWId', 'enableWriteId', 'phaseSwitchWriteId'];
      const reads = readKeys.filter((key) => truthyDp(row[key])).length;
      const writes = writeKeys.filter((key) => truthyDp(row[key])).length;
      const stationKey = text(row.stationKey);
      const connectorNo = integer(row.connectorNo, index + 1, 0, 999);
      const summary = [stationKey ? `Station ${stationKey}` : '', connectorNo ? `Connector ${connectorNo}` : '', text(row.chargerType)].filter(Boolean).join(' · ');
      return {
        sourceId: `evcs:lp${index + 1}`,
        name: text(row.name, `Ladepunkt ${index + 1}`),
        resourceType: 'chargingPoint',
        resourceSubtype: 'ev',
        controlType: writes ? 'energyTarget' : 'monitor',
        usableCapacityKWh: number(row.vehicleCapacityKWh ?? row.batteryCapacityKWh, 0, 0, 1000000),
        efficiencyPct: number(row.chargingEfficiencyPct, 92, 1, 100),
        sourceLabel: summary || 'EOS Ladepunkt',
        sourceTab: 'evcs',
        currentMode: text(row.userMode || row.mode, 'Auto/Benutzerauswahl'),
        reads,
        writes,
        enabledAtSource: row.enabled !== false,
        capabilities: [
          reads ? `${reads} Lesebindung${reads === 1 ? '' : 'en'}` : 'Messwerte unvollständig',
          truthyDp(row.vehicleSocId) ? 'Fahrzeug-SoC verfügbar' : 'Fahrzeug-SoC fehlt',
          writes ? 'Stellpfad vorhanden – hier gesperrt' : 'Kein Stellpfad erkannt',
          'Spätere Strategie ausschließlich in Auto',
        ],
      };
    }).filter((entry) => entry.enabledAtSource || entry.reads || entry.writes || entry.name);
  }

  function deriveFlowConsumerResources(config: AnyRecord): AnyRecord[] {
    const flowSlots = record(record(config.vis).flowSlots);
    const dps = record(config.datapoints);
    return list(flowSlots.consumers).map((slot, index) => {
      const ctrl = record(slot.ctrl);
      const powerDp = text(dps[`consumer${index + 1}Power`]);
      const readCandidates = [powerDp, ctrl.switchReadId, ctrl.setpointReadId, ctrl.sgReadyAReadId, ctrl.sgReadyBReadId];
      const writeCandidates = [ctrl.switchWriteId, ctrl.setpointWriteId, ctrl.sgReadyAWriteId, ctrl.sgReadyBWriteId];
      for (let stage = 1; stage <= 12; stage += 1) {
        readCandidates.push(ctrl[`stage${stage}ReadId`]);
        writeCandidates.push(ctrl[`stage${stage}WriteId`]);
      }
      const reads = readCandidates.filter(truthyDp).length;
      const writes = writeCandidates.filter(truthyDp).length;
      const name = text(slot.name);
      if (!name && !reads && !writes) return null;
      const consumerType = text(slot.consumerType, 'generic');
      const inferredCooling = consumerType === 'cooling'
        || /(?:kühl|kuehl|cool|cold|refriger)/i.test(`${name} ${consumerType}`);
      const resourceType = ['heatPump', 'heatingRod', 'cooling'].includes(consumerType) || inferredCooling ? 'thermal' : 'consumer';
      const resourceSubtype = consumerType === 'heatingRod'
        ? 'heatingRod'
        : (consumerType === 'heatPump' ? 'heatPump' : (inferredCooling ? 'cooling' : consumerType));
      return {
        sourceId: `flow-consumer:${index + 1}`,
        name: name || `Energiefluss-Verbraucher ${index + 1}`,
        resourceType,
        resourceSubtype,
        controlType: writes ? (consumerType === 'heatingRod' ? 'stepped' : 'switch') : 'monitor',
        sourceLabel: `Energiefluss · Slot ${index + 1}`,
        sourceTab: 'flow',
        reads,
        writes,
        capabilities: [
          powerDp ? 'Leistungsmessung vorhanden' : 'Leistungsmessung fehlt',
          writes ? 'Steuerzuordnung vorhanden – hier gesperrt' : 'Nur messbar / Steuerung ergänzen',
        ],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveModuleDevices(config: AnyRecord, key: string, label: string, tab: string, resourceType: string): AnyRecord[] {
    const moduleConfig = record(config[key]);
    return list(moduleConfig.devices).map((device, index) => {
      const dpCount = objectDpCount(device);
      const name = text(device.name, `${label} ${index + 1}`);
      if (!name && !dpCount) return null;
      return {
        sourceId: `${key}:${index + 1}`,
        name,
        resourceType,
        resourceSubtype: key === 'heatingRod' ? 'heatingRod' : (key === 'thermal' ? 'thermal' : key),
        controlType: key === 'heatingRod' ? 'stepped' : 'thermal',
        sourceLabel: `${label} · Geräteprofil ${index + 1}`,
        sourceTab: tab,
        reads: dpCount,
        writes: 0,
        capabilities: [
          dpCount ? `${dpCount} Datenpunkt-Zuordnung${dpCount === 1 ? '' : 'en'} erkannt` : 'Zuordnung unvollständig',
          'Bestehende Modulregelung bleibt zuständig',
        ],
      };
    }).filter(Boolean) as AnyRecord[];
  }

  function deriveExistingResources(config: AnyRecord): AnyRecord[] {
    const storageFarmResources = deriveStorageFarmResources(config);
    const combined = [
      ...(storageFarmResources.length ? storageFarmResources : deriveStorageResource(config)),
      ...deriveEvcsResources(config),
      ...deriveFlowConsumerResources(config),
      ...deriveModuleDevices(config, 'thermal', 'Thermisches Gerät', 'thermal', 'thermal'),
      ...deriveModuleDevices(config, 'heatingRod', 'Heizstab', 'heatingrod', 'thermal'),
    ];
    const seen = new Set<string>();
    return combined.filter((entry) => {
      const id = text(entry.sourceId);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function applyRoleOverride(resourceInput: AnyRecord, roleOverride: string): AnyRecord {
    const resource: AnyRecord = { ...clone(resourceInput), roleOverride };
    if (roleOverride === 'cooling') return { ...resource, resourceType: 'thermal', resourceSubtype: 'cooling', controlType: resource.controlType === 'monitor' ? 'thermal' : resource.controlType };
    if (roleOverride === 'heatPump') return { ...resource, resourceType: 'thermal', resourceSubtype: 'heatPump', controlType: resource.controlType === 'monitor' ? 'thermal' : resource.controlType };
    if (roleOverride === 'heatingRod') return { ...resource, resourceType: 'thermal', resourceSubtype: 'heatingRod', controlType: resource.controlType === 'monitor' ? 'stepped' : resource.controlType };
    if (roleOverride === 'flexConsumer') return { ...resource, resourceType: 'consumer', resourceSubtype: 'flexible' };
    if (roleOverride === 'storage') return { ...resource, resourceType: 'storage', resourceSubtype: 'battery' };
    if (roleOverride === 'chargingPoint') return { ...resource, resourceType: 'chargingPoint', resourceSubtype: 'ev', controlType: resource.controlType === 'monitor' ? 'energyTarget' : resource.controlType };
    return resource;
  }

  function strategyResourceCatalog(): AnyRecord[] {
    const linkMap = new Map(list(workingConfig.resourceLinks).map((entry) => [text(entry.sourceId), entry]));
    const existing = deriveExistingResources(fullConfig).map((entry) => {
      const link = record(linkMap.get(text(entry.sourceId)));
      return {
        ...applyRoleOverride(entry, text(link.roleOverride, 'auto')),
        strategyEnabled: link.enabled === true,
      };
    });
    const custom = list(workingConfig.customResources).map((entry, index) => ({
      sourceId: `custom:${text(entry.id, String(index + 1))}`,
      name: text(entry.name, `Benutzerdefinierte Ressource ${index + 1}`),
      resourceType: text(entry.resourceType, 'consumer'),
      resourceSubtype: text(entry.resourceSubtype),
      controlType: text(entry.controlType, 'monitor'),
      usableCapacityKWh: number(entry.usableCapacityKWh, 0, 0, 1000000),
      minPowerW: number(entry.minPowerW, 0, 0, 1000000000),
      maxPowerW: number(entry.maxPowerW, 0, 0, 1000000000),
      efficiencyPct: number(entry.efficiencyPct, 92, 1, 100),
      reads: Object.values(record(entry.mappings)).filter((value) => text(value)).length,
      writes: ['switchWriteId', 'setpointWriteId'].filter((key) => text(record(entry.mappings)[key])).length,
      sourceLabel: 'Benutzerdefinierte Zuordnung',
      sourceTab: '',
      strategyEnabled: entry.enabled !== false,
    }));
    const builder = ruleBuilder();
    const combined = [...existing, ...custom];
    return typeof builder.normalizeCatalog === 'function' ? builder.normalizeCatalog(combined) : combined;
  }

  function linkBySourceId(sourceId: string): AnyRecord {
    const existing = list(workingConfig.resourceLinks).find((entry) => text(entry.sourceId) === sourceId);
    return existing || {
      sourceId,
      enabled: false,
      priority: 50,
      roleOverride: 'auto',
      autoOnly: sourceId.startsWith('evcs:'),
      observeOnly: true,
      writeEnabled: false,
    };
  }

  function resourceTypeLabel(type: string): string {
    const labels: AnyRecord = {
      consumer: 'Verbraucher',
      thermal: 'Thermisch flexibel',
      chargingPoint: 'Ladepunkt',
      storage: 'Speicher',
      producer: 'Erzeuger',
      sensor: 'Sensor / externe Messgröße',
      virtualGroup: 'Virtuelle Gruppe',
    };
    return labels[type] || 'Ressource';
  }

  function controlTypeLabel(type: string): string {
    const labels: AnyRecord = {
      monitor: 'Nur messen',
      switch: 'Ein/Aus',
      setpoint: 'Stufenloser Sollwert',
      stepped: 'Stufig',
      thermal: 'Temperaturgeführt',
      energyTarget: 'Energie-/SoC-Ziel',
    };
    return labels[type] || type;
  }

  function badge(label: string, tone = ''): string {
    return `<span class="nw-os-badge${tone ? ` nw-os-badge--${tone}` : ''}">${esc(label)}</span>`;
  }

  function gotoTabButton(tab: string): string {
    return tab ? `<button type="button" class="nw-btn nw-btn--small" data-os-goto-tab="${esc(tab)}">Zuordnung öffnen</button>` : '';
  }

  function existingResourcesHtml(resources: AnyRecord[]): string {
    if (!resources.length) {
      return '<div class="nw-os-empty">Noch keine vorhandenen EOS-Geräte erkannt. Benutzerdefinierte Ressourcen können darunter angelegt werden.</div>';
    }
    return resources.map((resource) => {
      const link = linkBySourceId(resource.sourceId);
      const modeBadge = resource.resourceType === 'chargingPoint'
        ? badge('Nur Auto → Betriebsstrategie', 'lock')
        : badge('Beobachtung', 'safe');
      const mappingTone = resource.reads > 0 ? 'safe' : 'warn';
      const mappingLabel = resource.reads > 0 ? `${resource.reads} Lesepfad${resource.reads === 1 ? '' : 'e'}` : 'Keine Lesebindung';
      return `
        <div class="nw-os-resource" data-os-existing-resource="${esc(resource.sourceId)}">
          <div class="nw-os-resource__select">
            <label class="nw-field nw-field--switch"><span>Für Strategie vormerken</span><input type="checkbox" data-os-link-enabled="${esc(resource.sourceId)}" ${link.enabled ? 'checked' : ''}></label>
            <label class="nw-field"><span>Priorität</span><input type="number" min="1" max="100" value="${esc(link.priority)}" data-os-link-priority="${esc(resource.sourceId)}"></label>
            <label class="nw-field"><span>Strategierolle</span><select data-os-link-role="${esc(resource.sourceId)}"><option value="auto"${link.roleOverride === 'auto' ? ' selected' : ''}>Automatisch aus EOS</option><option value="cooling"${link.roleOverride === 'cooling' ? ' selected' : ''}>Kühl-/Gefrieranlage</option><option value="heatPump"${link.roleOverride === 'heatPump' ? ' selected' : ''}>Wärmepumpe / thermisch</option><option value="heatingRod"${link.roleOverride === 'heatingRod' ? ' selected' : ''}>Heizstab / stufig</option><option value="flexConsumer"${link.roleOverride === 'flexConsumer' ? ' selected' : ''}>Flexibler Verbraucher</option><option value="storage"${link.roleOverride === 'storage' ? ' selected' : ''}>Speicher</option><option value="chargingPoint"${link.roleOverride === 'chargingPoint' ? ' selected' : ''}>Ladepunkt</option></select></label>
          </div>
          <div class="nw-os-resource__body">
            <div class="nw-os-resource__title">${esc(resource.name)}</div>
            <div class="nw-os-resource__subtitle">${esc(resource.sourceLabel)} · ${esc(resourceTypeLabel(resource.resourceType))}</div>
            <div class="nw-os-badges">${modeBadge}${badge(mappingLabel, mappingTone)}${resource.writes ? badge(`${resource.writes} Stellpfad${resource.writes === 1 ? '' : 'e'} erkannt – gesperrt`, 'lock') : badge('Kein Stellpfad erkannt', 'muted')}</div>
            <ul class="nw-os-capabilities">${(Array.isArray(resource.capabilities) ? resource.capabilities : []).map((entry: any) => `<li>${esc(entry)}</li>`).join('')}</ul>
          </div>
          <div class="nw-os-resource__action">${gotoTabButton(resource.sourceTab)}</div>
        </div>`;
    }).join('');
  }

  function dpInput(resource: AnyRecord, index: number, key: string, label: string, write = false): string {
    const id = `osCustom_${index}_${key}`;
    const current = text(record(resource.mappings)[key]);
    return `
      <label class="nw-field nw-os-dp-field${write ? ' nw-os-dp-field--write' : ''}">
        <span>${esc(label)}${write ? ' · Schreibpfad gesperrt' : ''}</span>
        <div class="nw-os-dp-row">
          <input id="${esc(id)}" type="text" value="${esc(current)}" placeholder="Datenpunkt-ID …" data-os-custom-map-index="${index}" data-os-custom-map-key="${esc(key)}">
          <button type="button" class="nw-btn nw-btn--small" data-browse="${esc(id)}">Auswählen</button>
        </div>
      </label>`;
  }

  function customResourcesHtml(resources: AnyRecord[]): string {
    if (!resources.length) {
      return '<div class="nw-os-empty">Noch keine benutzerdefinierte Ressource. Lege hier Geräte an, die noch nicht in Speicher, Ladepunkten oder Energiefluss zugeordnet sind.</div>';
    }
    return resources.map((resource, index) => `
      <div class="nw-os-custom" data-os-custom-index="${index}">
        <div class="nw-os-custom__header">
          <div>
            <div class="nw-os-custom__title">${esc(resource.name)}</div>
            <div class="nw-os-custom__subtitle">${esc(resourceTypeLabel(resource.resourceType))} · ${esc(controlTypeLabel(resource.controlType))}</div>
          </div>
          <button type="button" class="nw-btn nw-btn--small" data-os-delete-custom="${index}">Löschen</button>
        </div>
        <div class="nw-config-grid">
          <label class="nw-field nw-field--switch"><span>Ressource verwenden</span><input type="checkbox" data-os-custom-index="${index}" data-os-custom-field="enabled" ${resource.enabled !== false ? 'checked' : ''}></label>
          <label class="nw-field"><span>Name</span><input type="text" value="${esc(resource.name)}" data-os-custom-index="${index}" data-os-custom-field="name"></label>
          <label class="nw-field"><span>Ressourcentyp</span><select data-os-custom-index="${index}" data-os-custom-field="resourceType">
            <option value="consumer"${resource.resourceType === 'consumer' ? ' selected' : ''}>Allgemeiner Verbraucher</option>
            <option value="thermal"${resource.resourceType === 'thermal' ? ' selected' : ''}>Thermisch flexibler Verbraucher</option>
            <option value="chargingPoint"${resource.resourceType === 'chargingPoint' ? ' selected' : ''}>Ladepunkt</option>
            <option value="storage"${resource.resourceType === 'storage' ? ' selected' : ''}>Speicher</option>
            <option value="producer"${resource.resourceType === 'producer' ? ' selected' : ''}>Erzeuger</option>
            <option value="sensor"${resource.resourceType === 'sensor' ? ' selected' : ''}>Sensor / externe Messgröße</option>
            <option value="virtualGroup"${resource.resourceType === 'virtualGroup' ? ' selected' : ''}>Virtuelle Gruppe</option>
          </select></label>
          <label class="nw-field"><span>Fähigkeitsprofil</span><select data-os-custom-index="${index}" data-os-custom-field="controlType">
            <option value="monitor"${resource.controlType === 'monitor' ? ' selected' : ''}>Nur messen</option>
            <option value="switch"${resource.controlType === 'switch' ? ' selected' : ''}>Ein/Aus</option>
            <option value="setpoint"${resource.controlType === 'setpoint' ? ' selected' : ''}>Stufenloser Sollwert</option>
            <option value="stepped"${resource.controlType === 'stepped' ? ' selected' : ''}>Stufig</option>
            <option value="thermal"${resource.controlType === 'thermal' ? ' selected' : ''}>Temperaturgeführt</option>
            <option value="energyTarget"${resource.controlType === 'energyTarget' ? ' selected' : ''}>Energie-/SoC-Ziel</option>
          </select></label>
          <label class="nw-field"><span>Leistungseinheit</span><select data-os-custom-index="${index}" data-os-custom-field="powerUnit"><option value="W"${resource.powerUnit === 'W' ? ' selected' : ''}>W</option><option value="kW"${resource.powerUnit === 'kW' ? ' selected' : ''}>kW</option></select></label>
          <label class="nw-field"><span>Maximales Messwertalter</span><input type="number" min="1" max="86400" value="${esc(resource.staleTimeoutSec)}" data-os-custom-index="${index}" data-os-custom-field="staleTimeoutSec"><small>s</small></label>
          <label class="nw-field"><span>Fail-Safe-Vorbereitung</span><select data-os-custom-index="${index}" data-os-custom-field="failSafePolicy">
            <option value="observe-only"${resource.failSafePolicy === 'observe-only' ? ' selected' : ''}>Nur beobachten</option>
            <option value="release"${resource.failSafePolicy === 'release' ? ' selected' : ''}>Später Regelung freigeben</option>
            <option value="safe-on"${resource.failSafePolicy === 'safe-on' ? ' selected' : ''}>Später sicher einschalten</option>
            <option value="safe-off"${resource.failSafePolicy === 'safe-off' ? ' selected' : ''}>Später sicher ausschalten</option>
            <option value="block-optimization"${resource.failSafePolicy === 'block-optimization' ? ' selected' : ''}>Später Optimierung sperren</option>
          </select></label>
        </div>
        <div class="nw-os-section-label">Planungsdaten für Ziel- und Simulationsregeln</div>
        <div class="nw-config-grid">
          <label class="nw-field"><span>Nutzbare Kapazität</span><input type="number" step="0.1" min="0" value="${esc(resource.usableCapacityKWh)}" data-os-custom-index="${index}" data-os-custom-field="usableCapacityKWh"><small>kWh</small></label>
          <label class="nw-field"><span>Minimale Leistung</span><input type="number" step="1" min="0" value="${esc(resource.minPowerW)}" data-os-custom-index="${index}" data-os-custom-field="minPowerW"><small>W</small></label>
          <label class="nw-field"><span>Maximale Leistung</span><input type="number" step="1" min="0" value="${esc(resource.maxPowerW)}" data-os-custom-index="${index}" data-os-custom-field="maxPowerW"><small>W</small></label>
          <label class="nw-field"><span>Wirkungsgrad</span><input type="number" step="0.1" min="1" max="100" value="${esc(resource.efficiencyPct)}" data-os-custom-index="${index}" data-os-custom-field="efficiencyPct"><small>%</small></label>
        </div>
        <div class="nw-os-section-label">Lesedatenpunkte</div>
        <div class="nw-config-grid">
          ${dpInput(resource, index, 'powerReadId', 'Aktuelle Leistung')}
          ${dpInput(resource, index, 'energyReadId', 'Energiezähler')}
          ${dpInput(resource, index, 'stateReadId', 'Betriebszustand')}
          ${dpInput(resource, index, 'socReadId', 'SoC')}
          ${dpInput(resource, index, 'temperatureReadId', 'Temperatur')}
          ${dpInput(resource, index, 'alarmReadId', 'Alarm / Störung')}
          ${dpInput(resource, index, 'onlineReadId', 'Online / Kommunikation')}
          ${dpInput(resource, index, 'capacityReadId', 'Nutzbare Kapazität')}
          ${dpInput(resource, index, 'forecastEnergyReadId', 'Energie-/PV-Prognose')}
          ${dpInput(resource, index, 'surplusPowerReadId', 'Verfügbarer Überschuss')}
        </div>
        <div class="nw-os-section-label">Vorbereitete Stell- und Rückmeldepunkte</div>
        <div class="nw-os-lock-note">Diese Zuordnungen werden gespeichert, aber RC54 führt daraus ausdrücklich keine Schreibbefehle aus.</div>
        <div class="nw-config-grid">
          ${dpInput(resource, index, 'switchWriteId', 'Ein/Aus oder Freigabe', true)}
          ${dpInput(resource, index, 'switchReadId', 'Rückmeldung Ein/Aus')}
          ${dpInput(resource, index, 'setpointWriteId', 'Leistungs-/Sollwertvorgabe', true)}
          ${dpInput(resource, index, 'setpointReadId', 'Rückmeldung Sollwert')}
        </div>
      </div>`).join('');
  }

  function profilesHtml(profiles: AnyRecord[], resources: AnyRecord[]): string {
    const storages = resources.filter((entry) => entry.resourceType === 'storage');
    return profiles.map((profile, index) => {
      const reserve = record(profile.nightReserve);
      const storageOptions = storages.map((storage) => `<option value="${esc(storage.sourceId)}"${reserve.storageResourceId === storage.sourceId ? ' selected' : ''}>${esc(storage.name)}</option>`).join('');
      return `
        <div class="nw-os-profile" data-os-profile-index="${index}">
          <div class="nw-os-custom__header">
            <div>
              <div class="nw-os-custom__title">${esc(profile.name)}</div>
              <div class="nw-os-custom__subtitle">Nachtenergie wird bis zum Nachtbeginn zurückgehalten und darf während der Nacht den Grundverbrauch decken.</div>
            </div>
            ${profiles.length > 1 ? `<button type="button" class="nw-btn nw-btn--small" data-os-delete-profile="${index}">Löschen</button>` : ''}
          </div>
          <div class="nw-config-grid">
            <label class="nw-field nw-field--switch"><span>Profil aktiv</span><input type="checkbox" data-os-profile-index="${index}" data-os-profile-field="enabled" ${profile.enabled !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Name</span><input type="text" value="${esc(profile.name)}" data-os-profile-index="${index}" data-os-profile-field="name"></label>
            <label class="nw-field"><span>Profilart</span><select data-os-profile-index="${index}" data-os-profile-field="season"><option value="winter"${profile.season === 'winter' ? ' selected' : ''}>Winter</option><option value="summer"${profile.season === 'summer' ? ' selected' : ''}>Sommer</option><option value="custom"${profile.season === 'custom' ? ' selected' : ''}>Benutzerdefiniert</option></select></label>
            <label class="nw-field nw-field--switch"><span>Nachtenergie-Reserve verwenden</span><input type="checkbox" data-os-profile-index="${index}" data-os-profile-reserve-field="enabled" ${reserve.enabled !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Zugeordneter Speicher</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="storageResourceId"><option value="">Automatisch / noch zuordnen</option>${storageOptions}</select><small>Nur ausdrücklich vorgemerkte Speicher werden später steuerbar.</small></label>
            <label class="nw-field"><span>SoC-Ziel zum Nachtbeginn</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.targetSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="targetSocPct"><small>%</small></label>
            <label class="nw-field"><span>Absolute Speicheruntergrenze</span><input type="number" min="0" max="100" step="1" value="${esc(reserve.absoluteMinSocPct)}" data-os-profile-index="${index}" data-os-profile-reserve-field="absoluteMinSocPct"><small>%</small></label>
            <label class="nw-field"><span>Nachtbeginn</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="startMode"><option value="sunset"${reserve.startMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option><option value="fixed"${reserve.startMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunrise"${reserve.startMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option></select></label>
            <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.startTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="startTime"></label>
            <label class="nw-field"><span>Nachtende</span><select data-os-profile-index="${index}" data-os-profile-reserve-field="endMode"><option value="sunrise"${reserve.endMode === 'sunrise' ? ' selected' : ''}>Sonnenaufgang</option><option value="fixed"${reserve.endMode === 'fixed' ? ' selected' : ''}>Feste Uhrzeit</option><option value="sunset"${reserve.endMode === 'sunset' ? ' selected' : ''}>Sonnenuntergang</option></select></label>
            <label class="nw-field"><span>Feste Zeit / Rückfall</span><input type="time" value="${esc(reserve.endTime)}" data-os-profile-index="${index}" data-os-profile-reserve-field="endTime"></label>
          </div>
        </div>`;
    }).join('');
  }

  function styleHtml(): string {
    return `<style>
      #${ROOT_ID}{display:grid;gap:16px}
      #${ROOT_ID} .nw-os-hero{border:1px solid rgba(119,185,0,.45);background:rgba(119,185,0,.08);border-radius:14px;padding:16px}
      #${ROOT_ID} .nw-os-hero__title{font-size:1.15rem;font-weight:700;margin-bottom:6px}
      #${ROOT_ID} .nw-os-hero__text{opacity:.86;line-height:1.5}
      #${ROOT_ID} .nw-os-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      #${ROOT_ID} .nw-os-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:.78rem;border:1px solid rgba(255,255,255,.16)}
      #${ROOT_ID} .nw-os-badge--safe{border-color:rgba(119,185,0,.55);background:rgba(119,185,0,.12)}
      #${ROOT_ID} .nw-os-badge--warn{border-color:rgba(255,183,77,.55);background:rgba(255,183,77,.12)}
      #${ROOT_ID} .nw-os-badge--lock{border-color:rgba(100,181,246,.45);background:rgba(100,181,246,.10)}
      #${ROOT_ID} .nw-os-badge--muted{opacity:.68}
      #${ROOT_ID} .nw-os-section{border:1px solid rgba(255,255,255,.11);border-radius:14px;padding:16px;background:rgba(255,255,255,.025)}
      #${ROOT_ID} .nw-os-section__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      #${ROOT_ID} .nw-os-section__title{font-size:1.05rem;font-weight:700}
      #${ROOT_ID} .nw-os-section__subtitle{opacity:.72;margin-top:4px;line-height:1.45}
      #${ROOT_ID} .nw-os-resource{display:grid;grid-template-columns:minmax(180px,240px) minmax(260px,1fr) auto;gap:14px;padding:14px 0;border-top:1px solid rgba(255,255,255,.09)}
      #${ROOT_ID} .nw-os-resource:first-child{border-top:0;padding-top:0}
      #${ROOT_ID} .nw-os-resource__select{display:grid;gap:8px;align-content:start}
      #${ROOT_ID} .nw-os-resource__title,#${ROOT_ID} .nw-os-custom__title{font-weight:700;font-size:1rem}
      #${ROOT_ID} .nw-os-resource__subtitle,#${ROOT_ID} .nw-os-custom__subtitle{opacity:.7;margin-top:3px;line-height:1.4}
      #${ROOT_ID} .nw-os-resource__action{display:flex;align-items:flex-start}
      #${ROOT_ID} .nw-os-capabilities{margin:9px 0 0 18px;padding:0;opacity:.8;line-height:1.45}
      #${ROOT_ID} .nw-os-custom,#${ROOT_ID} .nw-os-profile{border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:14px;margin-top:12px}
      #${ROOT_ID} .nw-os-custom__header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
      #${ROOT_ID} .nw-os-section-label{font-weight:700;margin:16px 0 10px}
      #${ROOT_ID} .nw-os-dp-row{display:flex;gap:7px;align-items:center}
      #${ROOT_ID} .nw-os-dp-row input{min-width:0;flex:1}
      #${ROOT_ID} .nw-os-dp-field--write{border-left:3px solid rgba(100,181,246,.42);padding-left:9px}
      #${ROOT_ID} .nw-os-lock-note{padding:10px 12px;border-radius:9px;background:rgba(100,181,246,.09);border:1px solid rgba(100,181,246,.28);margin-bottom:12px;line-height:1.45}
      #${ROOT_ID} .nw-os-empty{padding:14px;border:1px dashed rgba(255,255,255,.18);border-radius:10px;opacity:.72;line-height:1.5}
      #${ROOT_ID} .nw-os-contract{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
      #${ROOT_ID} .nw-os-contract__item{padding:11px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
      #${ROOT_ID} .nw-os-contract__item strong{display:block;margin-bottom:4px}
      @media(max-width:900px){#${ROOT_ID} .nw-os-resource{grid-template-columns:1fr}#${ROOT_ID} .nw-os-resource__action{justify-content:flex-start}}
    </style>`;
  }

  function renderHtml(): string {
    const resources = deriveExistingResources(fullConfig);
    const cfg = workingConfig;
    const eos = edition() === 'eos';
    const activeProfileOptions = list(cfg.profiles).map((profile) => `<option value="${esc(profile.id)}"${profile.id === cfg.activeProfileId ? ' selected' : ''}>${esc(profile.name)}</option>`).join('');
    const linkedCount = list(cfg.resourceLinks).filter((entry) => entry.enabled === true).length;
    const catalog = strategyResourceCatalog();
    return `${styleHtml()}
      <div id="${ROOT_ID}">
        <div class="nw-os-hero">
          <div class="nw-os-hero__title">Betriebsstrategien · Regelbaukasten und sicherer Trockenlauf</div>
          <div class="nw-os-hero__text">RC54 ergänzt modulare Muss-/Soll-/Kann-Regeln, Prioritätskaskade und einen manuellen Trockenlauf. Die App speichert und simuliert ausschließlich; bestehende Lade-, Speicher-, Heizstab- und Thermikregler bleiben unverändert zuständig.</div>
          <div class="nw-os-badges">
            ${badge('Beobachtungs- und Simulationsmodus', 'safe')}
            ${badge('0 Hardware-Schreibbefehle', 'lock')}
            ${badge('Ladepunkte später nur in Auto', 'lock')}
            ${badge('Single-Writer-Vertrag vorbereitet', 'safe')}
          </div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">App- und Sicherheitsstatus</div><div class="nw-os-section__subtitle">Installiert/Aktiv wird im AppCenter festgelegt. Steuerübernahme und Hardware-Ausführung bleiben in RC54 technisch fest auf „aus“ verriegelt.</div></div>
          </div>
          <div class="nw-config-grid">
            <label class="nw-field"><span>Edition</span><input type="text" value="${eos ? 'EOS Pro' : 'Nicht freigeschaltet'}" disabled></label>
            <label class="nw-field"><span>App-Status</span><input type="text" value="${appEnabled ? 'Aktiviert · nur Konfiguration/Beobachtung' : 'Nicht aktiv'}" disabled></label>
            <label class="nw-field"><span>Betriebsmodus</span><input type="text" value="Beobachtung" disabled></label>
            <label class="nw-field"><span>Steuerübernahme</span><input type="text" value="Gesperrt" disabled></label>
            <label class="nw-field nw-field--switch"><span>Vorhandene EOS-Geräte automatisch anzeigen</span><input id="osAutoImportExisting" type="checkbox" ${cfg.autoImportExisting !== false ? 'checked' : ''}></label>
            <label class="nw-field"><span>Aktives Profil vorbereiten</span><select id="osActiveProfileId">${activeProfileOptions}</select></label>
          </div>
          ${eos ? '' : '<div class="nw-notice nw-notice--warn" style="margin-top:12px">Die Betriebsstrategien-App ist ausschließlich in EOS Pro verfügbar.</div>'}
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Verbindlicher Steuervertrag</div><div class="nw-os-section__subtitle">Diese Regeln verhindern, dass die neue App bestehende Betriebsmodi oder Regler überschreibt.</div></div>
          </div>
          <div class="nw-os-contract">
            <div class="nw-os-contract__item"><strong>Ladepunkte</strong>Spätere Teilnahme nur bei „Auto → Betriebsstrategie“ und ausdrücklicher Freigabe je Ladepunkt.</div>
            <div class="nw-os-contract__item"><strong>Andere Lademodi</strong>Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben vollständig eigenständig.</div>
            <div class="nw-os-contract__item"><strong>Ausführung</strong>Die Strategie liefert später nur Ziele; das bestehende Lademanagement bleibt Echtzeitregler.</div>
            <div class="nw-os-contract__item"><strong>Rückfall</strong>Bei Ausfall ist für Ladepunkte die bestehende Standard-Automatik vorgesehen.</div>
          </div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Vorhandene EOS-Ressourcen</div><div class="nw-os-section__subtitle">Speicher, Ladepunkte und Energiefluss-Verbraucher werden aus ihrer bestehenden Zuordnung gelesen; es entstehen keine doppelten Geräte. Vorgemerkt: ${linkedCount}.</div></div>
          </div>
          <div id="osExistingResources">${cfg.autoImportExisting !== false ? existingResourcesHtml(resources) : '<div class="nw-os-empty">Automatische Anzeige ist deaktiviert. Bereits gespeicherte Verknüpfungen bleiben erhalten.</div>'}</div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Benutzerdefinierte Ressourcen</div><div class="nw-os-section__subtitle">Für Geräte, die noch nicht in NexoWatt EOS angelegt sind. Lese- und spätere Stellpfade können bereits vollständig zugeordnet werden.</div></div>
            <button id="osAddCustomResource" type="button" class="nw-btn nw-btn--primary">Ressource hinzufügen</button>
          </div>
          <div id="osCustomResources">${customResourcesHtml(list(cfg.customResources))}</div>
        </div>

        <div class="nw-os-section">
          <div class="nw-os-section__header">
            <div><div class="nw-os-section__title">Saison- und Nachtreserveprofile</div><div class="nw-os-section__subtitle">Der Ziel-SoC wird bis zum Nachtbeginn geschützt. Während der Nacht darf diese Energie den allgemeinen Nachtverbrauch decken; nur die absolute Untergrenze bleibt gesperrt.</div></div>
            <button id="osAddProfile" type="button" class="nw-btn nw-btn--primary">Profil hinzufügen</button>
          </div>
          <div id="osProfiles">${profilesHtml(list(cfg.profiles), catalog)}</div>
        </div>

        ${typeof ruleBuilder().render === 'function'
          ? ruleBuilder().render(cfg, catalog)
          : '<div class="nw-os-section"><div class="nw-os-section__title">Regelbaukasten nicht geladen</div><div class="nw-os-section__subtitle">Die Ressourcen- und Profilgrundlage bleibt verfügbar; Steuerung bleibt gesperrt.</div></div>'}

        <div class="nw-os-section">
          <div class="nw-os-section__title">Nächste sichere Kopplungsstufe</div>
          <div class="nw-os-section__subtitle">Erst nach Feldtest und separater Freigabe werden simulierte Zielanforderungen über Auto → Betriebsstrategie an den zentralen Stellwertverteiler übergeben. Bestehende Auto-, Boost-, PV-, Min+PV-, Zeit-Ziel-, Speicher- und Safety-Regler werden nicht ersetzt.</div>
        </div>
      </div>`;
  }

  function syncLinksFromDom(): void {
    const out: AnyRecord[] = [];
    document.querySelectorAll<HTMLInputElement>('[data-os-link-enabled]').forEach((checkbox) => {
      const sourceId = text(checkbox.getAttribute('data-os-link-enabled'));
      if (!sourceId) return;
      const priorityInput = Array.from(document.querySelectorAll<HTMLInputElement>('[data-os-link-priority]'))
        .find((entry) => text(entry.getAttribute('data-os-link-priority')) === sourceId);
      const roleInput = Array.from(document.querySelectorAll<HTMLSelectElement>('[data-os-link-role]'))
        .find((entry) => text(entry.getAttribute('data-os-link-role')) === sourceId);
      const roleOverride = text(roleInput?.value, 'auto');
      out.push({
        sourceId,
        enabled: checkbox.checked,
        priority: integer(priorityInput?.value, 50, 1, 100),
        roleOverride,
        autoOnly: sourceId.startsWith('evcs:') || roleOverride === 'chargingPoint',
        observeOnly: true,
        writeEnabled: false,
      });
    });
    const renderedIds = new Set(out.map((entry) => entry.sourceId));
    list(workingConfig.resourceLinks).forEach((entry) => {
      if (renderedIds.has(text(entry.sourceId))) return;
      const normalized = normalizeLink(entry);
      if (normalized) out.push(normalized);
    });
    workingConfig.resourceLinks = out.filter(Boolean);
  }

  function syncCustomFromDom(): void {
    const resources = list(workingConfig.customResources).map((entry) => clone(entry));
    document.querySelectorAll<HTMLElement>('[data-os-custom-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-custom-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-custom-field'));
      if (index < 0 || !resources[index] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') resources[index][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) resources[index][field] = node.value;
    });
    document.querySelectorAll<HTMLInputElement>('[data-os-custom-map-key]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-custom-map-index'), -1, -1, 10000);
      const key = text(node.getAttribute('data-os-custom-map-key'));
      if (index < 0 || !resources[index] || !key) return;
      resources[index].mappings = record(resources[index].mappings);
      resources[index].mappings[key] = text(node.value);
    });
    workingConfig.customResources = resources.map(normalizeCustomResource);
  }

  function syncProfilesFromDom(): void {
    const profiles = list(workingConfig.profiles).map((entry) => clone(entry));
    document.querySelectorAll<HTMLElement>('[data-os-profile-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-profile-field'));
      if (index < 0 || !profiles[index] || !field) return;
      if (node instanceof HTMLInputElement && node.type === 'checkbox') profiles[index][field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) profiles[index][field] = node.value;
    });
    document.querySelectorAll<HTMLElement>('[data-os-profile-reserve-field]').forEach((node) => {
      const index = integer(node.getAttribute('data-os-profile-index'), -1, -1, 10000);
      const field = text(node.getAttribute('data-os-profile-reserve-field'));
      if (index < 0 || !profiles[index] || !field) return;
      profiles[index].nightReserve = record(profiles[index].nightReserve);
      if (node instanceof HTMLInputElement && node.type === 'checkbox') profiles[index].nightReserve[field] = node.checked;
      else if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) profiles[index].nightReserve[field] = node.value;
    });
    workingConfig.profiles = profiles.map(normalizeProfile);
    const active = (byId('osActiveProfileId') as HTMLSelectElement | null)?.value;
    if (text(active)) workingConfig.activeProfileId = text(active);
  }

  function syncFromDom(): void {
    if (!byId(ROOT_ID)) return;
    const autoImport = byId('osAutoImportExisting') as HTMLInputElement | null;
    if (autoImport) workingConfig.autoImportExisting = autoImport.checked;
    syncLinksFromDom();
    syncCustomFromDom();
    syncProfilesFromDom();
    const builder = ruleBuilder();
    if (typeof builder.syncFromDom === 'function') workingConfig = builder.syncFromDom(workingConfig, strategyResourceCatalog());
    workingConfig = normalizeConfig(workingConfig);
  }

  function rerender(): void {
    if (!mountNode) return;
    mountNode.innerHTML = renderHtml();
    bindEvents();
  }

  function bindEvents(): void {
    const autoImport = byId('osAutoImportExisting') as HTMLInputElement | null;
    if (autoImport) autoImport.addEventListener('change', () => {
      syncFromDom();
      rerender();
    });

    const activeProfile = byId('osActiveProfileId') as HTMLSelectElement | null;
    if (activeProfile) activeProfile.addEventListener('change', () => {
      workingConfig.activeProfileId = text(activeProfile.value);
    });

    const addResource = byId('osAddCustomResource');
    if (addResource) addResource.addEventListener('click', () => {
      syncFromDom();
      const index = list(workingConfig.customResources).length;
      workingConfig.customResources.push(normalizeCustomResource({
        id: `custom-${Date.now()}`,
        name: `Neue Ressource ${index + 1}`,
        resourceType: 'consumer',
        controlType: 'monitor',
        mappings: {},
      }, index));
      rerender();
      setStatus('Benutzerdefinierte Ressource angelegt. Datenpunkte können jetzt zugeordnet werden.', 'ok');
    });

    const addProfile = byId('osAddProfile');
    if (addProfile) addProfile.addEventListener('click', () => {
      syncFromDom();
      const index = list(workingConfig.profiles).length;
      const profile = normalizeProfile({
        id: `profile-${Date.now()}`,
        name: `Betriebsprofil ${index + 1}`,
        enabled: true,
        season: 'custom',
        nightReserve: defaultNightReserve(50),
      }, index);
      workingConfig.profiles.push(profile);
      workingConfig.activeProfileId = profile.id;
      rerender();
      setStatus('Neues Betriebsprofil angelegt.', 'ok');
    });

    document.querySelectorAll<HTMLElement>('[data-os-delete-custom]').forEach((button) => button.addEventListener('click', () => {
      syncFromDom();
      const index = integer(button.getAttribute('data-os-delete-custom'), -1, -1, 10000);
      if (index < 0 || index >= workingConfig.customResources.length) return;
      workingConfig.customResources.splice(index, 1);
      rerender();
      setStatus('Benutzerdefinierte Ressource aus der Betriebsstrategien-Konfiguration entfernt.', 'ok');
    }));

    document.querySelectorAll<HTMLElement>('[data-os-delete-profile]').forEach((button) => button.addEventListener('click', () => {
      syncFromDom();
      const index = integer(button.getAttribute('data-os-delete-profile'), -1, -1, 10000);
      if (index < 0 || index >= workingConfig.profiles.length || workingConfig.profiles.length <= 1) return;
      const removed = workingConfig.profiles.splice(index, 1)[0];
      if (removed && removed.id === workingConfig.activeProfileId) workingConfig.activeProfileId = workingConfig.profiles[0].id;
      rerender();
      setStatus('Betriebsprofil entfernt.', 'ok');
    }));

    document.querySelectorAll<HTMLElement>('[data-os-goto-tab]').forEach((button) => button.addEventListener('click', () => {
      const tab = text(button.getAttribute('data-os-goto-tab'));
      const target = tab ? document.querySelector<HTMLElement>(`.nw-tab[data-tab="${tab}"]`) : null;
      if (target) target.click();
    }));

    document.querySelectorAll<HTMLElement>('[data-os-link-enabled],[data-os-link-priority],[data-os-link-role],[data-os-custom-field],[data-os-custom-map-key],[data-os-profile-field],[data-os-profile-reserve-field]')
      .forEach((node) => node.addEventListener('change', () => {
        syncFromDom();
      }));

    const builder = ruleBuilder();
    if (typeof builder.bindEvents === 'function') builder.bindEvents({
      getConfig: () => workingConfig,
      updateConfig: (next: AnyRecord) => { workingConfig = normalizeConfig(next); },
      getResources: () => strategyResourceCatalog(),
      syncAll: () => syncFromDom(),
      rerender,
      setStatus,
    });
  }

  async function render(mount: HTMLElement | null, config: AnyRecord = {}, enabled = false): Promise<void> {
    if (!mount) return;
    mountNode = mount;
    fullConfig = record(config);
    appEnabled = enabled === true;
    workingConfig = normalizeConfig(fullConfig.operatingStrategies);
    const builder = ruleBuilder();
    if (typeof builder.resetSimulationResult === 'function') builder.resetSimulationResult();
    rerender();
  }

  function apply(config: AnyRecord = {}, selectedEdition?: string): void {
    if (selectedEdition) getEdition = () => selectedEdition;
    const app = record(record(record(config.emsApps).apps)[APP_ID]);
    render(
      document.getElementById('operatingStrategiesConfigSlot'),
      config,
      app.installed === true && app.enabled === true,
    ).catch(() => undefined);
  }

  function collect(existing: AnyRecord = {}, enabled = false, selectedEdition?: string): AnyRecord {
    if (selectedEdition) getEdition = () => selectedEdition;
    if (byId(ROOT_ID)) syncFromDom();
    else workingConfig = normalizeConfig(existing);
    const eos = edition() === 'eos';
    const out = normalizeConfig(workingConfig);
    out.enabled = eos && enabled === true;
    out.mode = 'observe';
    out.controlTakeoverEnabled = false;
    out.writeExecutionEnabled = false;
    out.controlContract = defaultControlContract();
    const builder = ruleBuilder();
    out.rules = typeof builder.normalizeRules === 'function'
      ? builder.normalizeRules(out.rules, list(out.profiles).map((profile) => text(profile.id)))
      : [];
    out.rules = list(out.rules).map((entry) => ({ ...entry, simulationOnly: true, executionEnabled: false }));
    out.simulation = typeof builder.normalizeSimulation === 'function'
      ? builder.normalizeSimulation(out.simulation, out.activeProfileId)
      : { activeProfileId: out.activeProfileId, resourceStates: {} };
    out.resourceLinks = list(out.resourceLinks).map((entry) => {
      const normalized = normalizeLink(entry);
      if (!normalized) return null;
      return {
        ...normalized,
        observeOnly: true,
        writeEnabled: false,
        autoOnly: normalized.autoOnly === true,
      };
    }).filter(Boolean);
    out.customResources = list(out.customResources).map((entry, index) => {
      const normalized = normalizeCustomResource(entry, index);
      return {
        ...normalized,
        observeOnly: true,
        writeEnabled: false,
        autoOnly: normalized.autoOnly === true,
      };
    });
    out.metadata = {
      ...record(out.metadata),
      foundationVersion: FOUNDATION_VERSION,
      ruleBuilderVersion: RULE_BUILDER_VERSION,
      lastEditedAt: new Date().toISOString(),
    };
    workingConfig = out;
    return clone(out);
  }

  function setup(options: AnyRecord = {}): void {
    if (typeof options.setStatus === 'function') setStatus = options.setStatus;
    if (typeof options.getEdition === 'function') getEdition = options.getEdition;
  }

  (window as any).NexoWattOperatingStrategiesAppCenter = {
    setup,
    render,
    apply,
    collect,
    deriveExistingResources,
    strategyResourceCatalog,
    normalizeConfig,
    simulate: (config: AnyRecord, resources?: AnyRecord[]) => {
      const builder = ruleBuilder();
      return typeof builder.simulate === 'function' ? builder.simulate(config, resources || strategyResourceCatalog(), config.simulation) : null;
    },
  };
})();
