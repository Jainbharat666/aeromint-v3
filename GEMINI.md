# 🔒 AEROMINT CORE ENGINE IMMUTABILITY LOCK DIRECTIVE

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS, SUBAGENTS & DEVELOPERS:**
> The core NFT Minting Engine in AeroMint V2 is **FROZEN & IMMUTABLE (LOCKED)**.
> It has been rigorously benchmarked and verified live on-chain with sub-second block confirmation (Block #54199117 & #54205654).
> 
> **DO NOT modify, refactor, rearrange, optimize, or delete ANY part of the core minting pipeline during future UI edits, theme updates, feature additions, or backend modifications.**
> 
> **OVERRIDE PERMISSION:** ONLY modify the core engine if the user explicitly writes:
> **"UNLOCK MINT ENGINE"** or **"CORE MINT ENGINE MODIFY KARO"**.
> Without this explicit phrase, reject or preserve all core mint sections as read-only!

---

## 🛡️ Protected Modules & Exact Invariants

### 1. Technique 2: 6-Key Staggered Laser Pipeline
* **Locations:** `src/App.jsx` & `frontend/src/App.jsx` (`executeMultiWalletMint`)
* **Invariants:**
  * Flight-time lead offset: `Math.max(0, msToT0 - 150)` for Pulse 1 (Key 1) to land at OpenSea at exact T-0.
  * 70ms calibrated phase shift across 6 OpenSea API Keys:
    - Pulse 1: `msToT0 - 150`
    - Pulse 2: `msToT0 - 80`
    - Pulse 3: `msToT0 - 10`
    - Pulse 4: `msToT0 + 60`
    - Pulse 5: `msToT0 + 130`
    - Pulse 6: `msToT0 + 200`
  * First-winner atomic resolution: `checkAllCached()` resolves the promise, clears all timers via `clearTimeout`, and proceeds immediately to mempool dispatch.
  * Failsafe fallback pulser engaged only after `msToT0 + 250ms` at 120ms intervals.
  * Micro-poll interval: 10ms resolution cache check.

### 2. SeaDrop & OpenSea Allowlist Calldata Parser
* **Locations:** `src/App.jsx` & `frontend/src/App.jsx` (`fetchOpenSeaBatchMintData`)
* **Invariants:**
  * 1-Shot Aliased GraphQL queries routed to `/api/opensea/graphql-mint-actions`.
  * Known SeaDrop function selectors:
    - `0x4b61cd6f` (`mintSigned` - allowlist / signed presale)
    - `0x161ac21f` (`mintPublic` - public sale)
    - `0x4300a4e6` (`mintAllowedTokenHolder` - merkle)
  * **NEVER** re-introduce `rawData.includes(walletAddress)` / `walletInCalldata` checks: SeaDrop's `minterIfNotPayer` is `address(0)`, so minter addresses are inside cryptographic signatures, not plaintext ABI!
  * Atomic Compare-and-Set in `signedMintCacheRef`: never overwrite an already secured signature.

### 3. Lockstep Barrier Blast & Mempool Dispatch
* **Locations:** `src/App.jsx` & `frontend/src/App.jsx` (`lockstepBarrierBlast`)
* **Invariants:**
  * Zero-lag mempool broadcast in <1ms (verified at 0.5ms).
  * Simultaneous multi-blast to Top 3 locked RPC nodes.
  * Nonce clearing (`cachedNoncesRef.current.clear()`) immediately following blast execution.
  * Pre-mint quantity-scaled dynamic gas estimation with safety margin.

### 4. Backend High-Speed Proxy & Security
* **Locations:** `backend/server.js`
* **Invariants:**
  * Dedicated low-latency `openseaHttpsAgent` with keep-alive.
  * Robinhood SeaDrop routed exclusively through GraphQL endpoint.
  * 3000ms low-latency request timeout.
  * SSRF domain whitelist, bcrypt password security, rate limiting, and admin auth middleware.
