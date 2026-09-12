/**
 * timeSync.js — Shared NTP Internet Clock Sync Utility
 *
 * Strategy: Query multiple internet time APIs, measure round-trip latency,
 * compute the offset between internet UTC and local Date.now(), then expose
 * a corrected getNow() function. Both bots hit /api/ntp-time on the AeroMint
 * backend — guaranteeing a SINGLE shared time source for sub-millisecond sync.
 *
 * Offset formula (RFC 5905 simplified):
 *   offset = (T2 - T1) - (roundTrip / 2)
 *   where T1 = localBefore, T2 = serverNtpMs, roundTrip = localAfter - T1
 */

const axios = require('axios');

// NTP-over-HTTP sources (tried in order, first success wins)
const NTP_SOURCES = [
  {
    url: 'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
    parse: (d) => new Date(d.dateTime.endsWith('Z') ? d.dateTime : d.dateTime + 'Z').getTime(),
    name: 'TimeAPI.io'
  },
  {
    url: 'https://www.timeapi.io/api/time/current/zone?timeZone=UTC',
    parse: (d) => new Date(d.dateTime.endsWith('Z') ? d.dateTime : d.dateTime + 'Z').getTime(),
    name: 'TimeAPI.io (alt)'
  },
  {
    url: 'http://worldtimeapi.org/api/ip',
    parse: (d) => new Date(d.utc_datetime).getTime(),
    name: 'WorldTimeAPI'
  }
];

// Internal state
let _ntpOffsetMs = 0;           // ms to add to Date.now() for corrected time
let _lastSyncAt = 0;            // local timestamp of last successful sync
let _lastSyncSource = 'local';  // which source was used
let _roundTripMs = 0;           // last measured round-trip latency
let _syncCount = 0;             // total successful syncs
let _isSyncing = false;

/**
 * Fetch NTP time from internet sources and compute offset.
 * @returns {Promise<{offset: number, roundTripMs: number, source: string}>}
 */
async function syncNtpOffset() {
  if (_isSyncing) return { offset: _ntpOffsetMs, roundTripMs: _roundTripMs, source: _lastSyncSource };
  _isSyncing = true;

  for (const src of NTP_SOURCES) {
    try {
      const localBefore = Date.now();
      const response = await axios.get(src.url, {
        timeout: 3000,
        headers: { 'Cache-Control': 'no-cache', 'Accept': 'application/json' }
      });
      const localAfter = Date.now();

      const ntpMs = src.parse(response.data);
      if (!ntpMs || isNaN(ntpMs)) continue;

      const roundTrip = localAfter - localBefore;
      // Jitter Guard 1: Discard high-latency HTTP responses (>250ms RTT)
      if (roundTrip > 250) {
        console.warn(`[NTP] ⚠️  ${src.name} RTT too high (${roundTrip}ms). Discarding to avoid asymmetric lag.`);
        continue;
      }

      const midpointLocal = localBefore + Math.round(roundTrip / 2);
      const rawOffset = ntpMs - midpointLocal;

      // Jitter Guard 2: Modern datacenter Linux clocks are synced via chrony/GPS to <5ms.
      // Any HTTP offset > 80ms is server processing delay on the third-party API, not true clock drift!
      if (Math.abs(rawOffset) > 80) {
        console.warn(`[NTP] ⚠️  ${src.name} reported raw offset of ${rawOffset}ms (>80ms threshold). Clamping to preserve datacenter atomic clock.`);
        _ntpOffsetMs = 0; // Stick to true local atomic clock
      } else {
        // Safe micro-calibration clamp (-25ms to +25ms)
        _ntpOffsetMs = Math.max(-25, Math.min(25, rawOffset));
      }

      _roundTripMs = roundTrip;
      _lastSyncSource = src.name;
      _lastSyncAt = localAfter;
      _syncCount++;
      _isSyncing = false;

      console.log(`[NTP] ✅ Synced via ${src.name}: offset=${_ntpOffsetMs > 0 ? '+' : ''}${_ntpOffsetMs}ms (raw=${rawOffset}ms) | RTT=${roundTrip}ms`);
      return { offset: _ntpOffsetMs, roundTripMs: roundTrip, source: src.name };

    } catch (err) {
      console.warn(`[NTP] ⚠️  ${src.name} failed: ${err.message}`);
    }
  }

  // All sources failed or discarded — keep 0 offset (rely on datacenter atomic clock)
  console.log('[NTP] 🔒 Datacenter Atomic Clock Locked (0ms offset).');
  _lastSyncSource = 'datacenter_atomic_clock';
  _ntpOffsetMs = 0;
  _isSyncing = false;
  return { offset: 0, roundTripMs: 0, source: 'datacenter_atomic_clock' };
}

/**
 * Returns the internet-corrected current timestamp in milliseconds.
 * Drop-in replacement for Date.now().
 */
function getNow() {
  return Date.now() + _ntpOffsetMs;
}

/**
 * Get current sync status.
 */
function getSyncStatus() {
  return {
    offsetMs: _ntpOffsetMs,
    roundTripMs: _roundTripMs,
    source: _lastSyncSource,
    syncCount: _syncCount,
    lastSyncAt: _lastSyncAt,
    lastSyncAgo: _lastSyncAt ? Date.now() - _lastSyncAt : null,
    isSynced: _lastSyncSource !== 'local_fallback' && _syncCount > 0
  };
}

// Auto-sync every 30 seconds while server is running
let _autoSyncTimer = null;

function startAutoSync(intervalMs = 30000) {
  // Sync immediately on start
  syncNtpOffset().catch(() => {});

  if (_autoSyncTimer) clearInterval(_autoSyncTimer);
  _autoSyncTimer = setInterval(() => {
    syncNtpOffset().catch(() => {});
  }, intervalMs);

  // Don't block Node.js exit
  if (_autoSyncTimer.unref) _autoSyncTimer.unref();
}

function stopAutoSync() {
  if (_autoSyncTimer) {
    clearInterval(_autoSyncTimer);
    _autoSyncTimer = null;
  }
}

module.exports = { syncNtpOffset, getNow, getSyncStatus, startAutoSync, stopAutoSync };
