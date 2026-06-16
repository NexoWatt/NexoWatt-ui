/**
 * Code-Teil: TypeScript-Smoke-Test der ersten Verträge.
 * Zweck: Diese Datei erzeugt bewusst keine Laufzeitlogik. Sie prüft nur, ob die
 *        wichtigsten Vertrags-Typen zusammen verwendbar sind.
 * Zusammenhang: Wenn wir später echte JS-Logik nach TypeScript migrieren,
 *        werden aus diesen Beispielen konkrete Unit-/Regression-Tests.
 */
import type { EnergyFlowSnapshot, StorageFlowResult } from '../../src-ts/contracts/energy-flow';
import type { FeatureVisibilityState } from '../../src-ts/contracts/features';
import type { AiAdvisorSuggestion } from '../../src-ts/contracts/ai-advisor';
import type { LicenseValidationResult } from '../../src-ts/contracts/license';

const storageFlowExample: StorageFlowResult = {
  chargeW: 0,
  dischargeW: 0,
  signedW: 0,
  socPct: 44,
  source: 'split-dp',
  signedConvention: 'positive-discharge',
  hasConfiguredStorageDp: true,
  diagnosticText: 'getrennte Lade-/Entlade-DPs',
};

const energyFlowExample: EnergyFlowSnapshot = {
  ts: Date.now(),
  pvW: 2500,
  buildingLoadW: 700,
  grid: { importW: 0, exportW: 1800, signedW: -1800, source: 'split-dp' },
  storage: storageFlowExample,
  evcsW: 0,
  heatingRodW: 0,
  thermalW: 0,
  residualLoadW: null,
};

const featureExample: FeatureVisibilityState = {
  hasEvcs: false,
  hasStorageFarm: false,
  hasSmartHome: false,
  hasAiAdvisor: true,
  hasWeather: true,
};

const suggestionExample: AiAdvisorSuggestion = {
  id: 'example',
  category: 'plan',
  severity: 'info',
  priority: 10,
  icon: '🧭',
  title: 'Beispiel',
  text: 'Dieser TypeScript-Smoke-Test erzeugt keine Runtime-Logik.',
  action: 'Keine Aktion notwendig.',
  window: 'Test',
  impact: 'Typvertrag',
  confidence: 100,
};

const licenseExample: LicenseValidationResult = {
  ok: true,
  status: 'valid',
  tier: 'home',
};

void energyFlowExample;
void featureExample;
void suggestionExample;
void licenseExample;
