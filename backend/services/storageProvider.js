/**
 * Chooses the object-storage backend at startup.
 *
 * Cloudflare R2 is preferred when configured; Google Cloud Storage remains
 * supported so an existing deployment keeps working untouched, and so a
 * migration can happen without a flag day.
 *
 * Both services expose an identical surface (uploadJSON, uploadFile,
 * downloadJSON, downloadFile, deleteFile, listFiles, getSignedUrl, plus the
 * financial-domain helpers), so callers depend on this module rather than on a
 * concrete backend and never branch on which one is active.
 *
 * Selection is explicit via STORAGE_PROVIDER, otherwise whichever backend has
 * credentials wins - R2 first, because a deployment that has configured both is
 * migrating towards R2.
 */

const logger = require('../utils/logger');
const r2StorageService = require('./r2StorageService');
const gcpStorageService = require('./gcpStorageService');

let active = null;
let activeName = 'none';

/**
 * A stand-in used when nothing is configured.
 *
 * Every method throws a message naming the variables to set, rather than
 * returning undefined and failing somewhere unrelated three frames later.
 */
const unconfigured = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'isAvailable') return () => false;
    if (prop === 'initialize') return () => false;
    if (prop === 'providerName') return 'none';
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'inspect') return undefined;
    return () => {
      throw Object.assign(
        new Error(
          'Cloud storage is not configured. Set R2_ENDPOINT, R2_BUCKET, '
          + 'R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (or the GCP_* equivalents).'
        ),
        { status: 503 }
      );
    };
  }
});

/** Initialises the selected backend. Safe to call more than once. */
function initialize() {
  if (active) return active.isAvailable();

  const preferred = (process.env.STORAGE_PROVIDER || '').toLowerCase();

  const tryR2 = () => (r2StorageService.initialize() ? r2StorageService : null);
  const tryGcp = () => (gcpStorageService.initialize() ? gcpStorageService : null);

  let chosen = null;
  if (preferred === 'r2' || preferred === 's3') {
    chosen = tryR2();
    if (!chosen) logger.error('STORAGE_PROVIDER=r2 but the R2_* variables are incomplete');
  } else if (preferred === 'gcp' || preferred === 'gcs') {
    chosen = tryGcp();
    if (!chosen) logger.error('STORAGE_PROVIDER=gcp but the GCP_* variables are incomplete');
  } else {
    chosen = tryR2() || tryGcp();
  }

  if (chosen) {
    active = chosen;
    activeName = chosen === r2StorageService ? 'r2' : 'gcp';
    logger.info(`🗄️  Cloud storage provider: ${activeName}`);
  } else {
    active = unconfigured;
    activeName = 'none';
    logger.warn('⚠️  No cloud storage configured — backups, reports and document uploads are disabled');
  }

  return active.isAvailable();
}

function getStorage() {
  if (!active) initialize();
  return active;
}

function providerName() {
  if (!active) initialize();
  return activeName;
}

/**
 * Delegates every call to the active backend.
 *
 * A Proxy rather than a hand-written list of forwarders: the two services share
 * a surface of roughly twenty methods, and a manual list is one more place to
 * forget to update when a method is added.
 */
const storage = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'providerName') return providerName();
    if (prop === 'initialize') return initialize;
    if (prop === 'getStorage') return getStorage;

    const target = getStorage();
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  },
  has(_target, prop) {
    return prop in getStorage();
  }
});

module.exports = storage;
module.exports.initialize = initialize;
module.exports.getStorage = getStorage;
module.exports.providerName = providerName;
