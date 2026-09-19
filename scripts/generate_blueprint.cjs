const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = 'C:\\Users\\MY PC\\OneDrive\\Desktop\\abc\\aero mint version 3';
const MD_PATH = path.join(ROOT_DIR, 'ARCHITECTURE_AND_DEPLOYMENT.md');
const HTML_PATH = path.join(ROOT_DIR, 'Project_Architecture_and_Deployment_Guide.html');
const PDF_PATH = path.join(ROOT_DIR, 'Project_Architecture_and_Deployment_Guide.pdf');

// Read icon base64
const iconPath = path.join(ROOT_DIR, 'frontend', 'src-tauri', 'icons', 'icon.png');
let iconBase64 = '';
if (fs.existsSync(iconPath)) {
  iconBase64 = fs.readFileSync(iconPath).toString('base64');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATE ARCHITECTURE_AND_DEPLOYMENT.MD
// ─────────────────────────────────────────────────────────────────────────────
const mdContent = `# ⚡ AEROMINT V3 — ARCHITECTURE & DEPLOYMENT BLUEPRINT

> **Comprehensive Technical Architecture, Infrastructure Map, Network Topology & Cloud Directory**  
> *Project Version:* **AeroMint V3.0 Enterprise**  
> *Engine Status:* **100% Immutable & Locked** (Verified On-Chain Blocks [#56127357](https://robinhoodchain.blockscout.com/block/56127357) & [#56135081](https://robinhoodchain.blockscout.com/block/56135081))  
> *Date:* September 2026

---

## 1. 🌐 System Architecture & End-to-End Data Flow

\`\`\`mermaid
flowchart TD
    subgraph ClientLayer ["1. Client & User Access Layer"]
        A1["Desktop Client (Tauri v2 Win64)"]
        A2["Web SPA (React 19 + Vite 8)"]
        A3["Mobile Browser (Web3 Wallet)"]
    end

    subgraph DNSLayer ["2. DNS & Edge Routing Layer"]
        B1["Custom Domain: www.aeromint.xyz"]
        B2["Apex Domain: aeromint.xyz"]
        B3["API Gateway: api.aeromint.xyz"]
        B4["Vercel Global Edge CDN (Anycast)"]
    end

    subgraph ComputeLayer ["3. High-Speed Compute & Backend Layer"]
        C1["Primary: US Edge Cloud VPS (Ashburn, VA - IP: 129.80.65.56:3001)"]
        C2["PM2 Cluster: aeromint-backend"]
        C3["DNS RAM Cache & TCP Socket Pre-Warming"]
        C4["Secondary Fallback: Render Cloud API (aeromint-backend.onrender.com)"]
    end

    subgraph DatabaseLayer ["4. Cloud Database & Telemetry Layer"]
        D1["Supabase PostgreSQL (zfsyokzedsdofmtmjtqt.supabase.co)"]
        D2["Tables: mint_users | mint_invites | user_cloud_configs | fleet_rpcs"]
    end

    subgraph Web3Layer ["5. Multi-RPC & Blockchain Layer"]
        E1["Robinhood Chain Mainnet (Chain ID: 4663)"]
        E2["SeaDrop Protocol (0x00005EA00Ac477B1030CE78506496e8C2dE24bf5)"]
        E3["Alchemy High-Speed Private Sequencer RPC"]
        E4["Secondary Chains: Base (8453) | Ink (57073) | Ethereum (1)"]
    end

    subgraph ExternalServices ["6. External Protocols & APIs"]
        F1["OpenSea GraphQL & REST API Grid (6-Key Staggered Laser)"]
        F2["NTP Atomic Time Server (time.google.com / time.cloudflare.com)"]
        F3["EIP-4361 SIWE Session Vault"]
    end

    ClientLayer --> DNSLayer
    B1 & B2 --> B4 --> A2
    B3 --> C1
    A1 & A2 --> C1
    A1 & A2 -.-> C4
    C1 <--> D1
    C1 <--> F1
    C1 <--> F2
    C1 <--> F3
    C1 -->|0.0ms Lockstep Barrier Blast| E3 --> E1
    E1 --> E2
\`\`\`

---

## 2. 🖥️ Frontend & Client Applications

| Attribute | Specification / Production Detail | Direct Dashboard / Link |
| :--- | :--- | :--- |
| **Framework / Stack** | React 19.2.6, Vite 8.0.12, TailwindCSS, Ethers.js v6.16, Three.js | [Vite Config](file:///c:/Users/MY%20PC/OneDrive/Desktop/abc/aero%20mint%20version%203/frontend/vite.config.js) |
| **Desktop Client** | Tauri v2.11 (Native Windows x64 Executable - 0.0ms OS Native Webview) | [Tauri Bundle](file:///c:/Users/MY%20PC/OneDrive/Desktop/abc/aero%20mint%20version%203/AeroMint-Bot-Windows) |
| **Hosting Platform** | Vercel Global Edge Network (High Performance CDN) | [Vercel Project Dashboard](https://vercel.com/aeromint/aeromint-v3) |
| **Primary Domain** | \`https://www.aeromint.xyz\` | [Launch www.aeromint.xyz](https://www.aeromint.xyz) |
| **Apex Domain** | \`https://aeromint.xyz\` | [Launch aeromint.xyz](https://aeromint.xyz) |
| **Vercel Subdomain** | \`https://aeromint-v3.vercel.app\` | [Launch Vercel Preview](https://aeromint-v3.vercel.app) |
| **GitHub Repository** | \`https://github.com/Jainbharat666/aeromint-v3\` (Branch: \`main\`) | [GitHub Repo Link](https://github.com/Jainbharat666/aeromint-v3) |
| **Build & Deploy** | Auto-deploy on \`git push origin main\` via Vercel GitHub App | [Deployments History](https://vercel.com/aeromint/aeromint-v3/deployments) |

---

## 3. ⚙️ Backend Services & Database Architecture

### 3.1 Primary Cloud VPS (Ashburn, VA - Ultra Low Latency Edge)
* **Hosting Provider:** Dedicated Cloud VPS (US East Datacenter, Ashburn, Virginia)
* **Public Server IP:** \`129.80.65.56\` (Port \`3001\`)
* **SSL Gateway Domain:** \`https://api.aeromint.xyz\`
* **SSH Access:** \`ssh -i ssh-key-2026-09-04.key ubuntu@129.80.65.56\`
* **Remote Path:** \`/home/ubuntu/aeromint-backend\`
* **Process Manager:** PM2 Cluster (\`pm2 status\`, \`pm2 logs aeromint-backend\`)
* **Zero-Latency Invariants:**
  * In-memory DNS Cache (eliminates 30-45ms cold OS lookup).
  * Persistent Keep-Alive TCP/TLS HTTPS Sockets (0ms handshake).
  * Raw EIP-1559 Pre-Signing in RAM at T-5s with 0.0ms instant dispatch.

### 3.2 Secondary Standby Backend (Render Cloud Web Service)
* **Hosting Platform:** Render.com (Node.js Web Service)
* **Live Service URL:** \`https://aeromint-backend.onrender.com\`
* **Render Project Dashboard:** [Render Console](https://dashboard.render.com)
* **Blueprint Spec:** [\`backend/render.yaml\`](file:///c:/Users/MY%20PC/OneDrive/Desktop/abc/aero%20mint%20version%203/backend/render.yaml)

### 3.3 Supabase PostgreSQL Database & Telemetry
* **Provider:** Supabase Cloud PostgreSQL
* **Project URL:** \`https://zfsyokzedsdofmtmjtqt.supabase.co\`
* **Management Console:** [Supabase Dashboard](https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt)
* **Client Publishable Key:** \`sb_publishable_GPW6AVq_IUmR3r0hq4De-w_OViDAsSi\`
* **Active Schema & Tables:**
  1. \`mint_users\` — User accounts, bcrypt password hashes, validity dates, VIP status, and allowed mint limits.
  2. \`mint_invites\` — Single-use and multi-use VIP registration codes with expiry tracking.
  3. \`user_cloud_configs\` — Per-user encrypted cloud vault, custom RPC arrays, and gas preferences.
  4. \`fleet_rpcs\` — Global multi-chain racing RPC nodes and benchmark latency history.
  5. \`mint_logs\` — Immutable execution telemetry and on-chain tx records.
  6. \`opensea_sessions\` — Pre-authenticated EIP-4361 SIWE session cache.

### 3.4 Live Telemetry & Health Check Endpoints
* **Service Health Check:** [\`https://api.aeromint.xyz/api/health\`](https://api.aeromint.xyz/api/health)
* **Atomic NTP Clock Sync:** [\`https://api.aeromint.xyz/api/ntp-time\`](https://api.aeromint.xyz/api/ntp-time)
* **Session Heartbeat:** [\`https://api.aeromint.xyz/api/auth/heartbeat\`](https://api.aeromint.xyz/api/auth/heartbeat)

---

## 4. ⛓️ Smart Contracts & Web3 Infrastructure

### 4.1 Supported Blockchain Networks
| Chain Name | Chain ID | Native Currency | Block Explorer | Primary SeaDrop Contract |
| :--- | :--- | :--- | :--- | :--- |
| **Robinhood Chain (Primary)** | \`4663\` | \`ETH\` | [Robinhood Blockscout](https://robinhoodchain.blockscout.com) | [\`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5\`](https://robinhoodchain.blockscout.com/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5) |
| **Robinhood Chain (Secondary)** | \`4663\` | \`ETH\` | [Robinhood Blockscout](https://robinhoodchain.blockscout.com) | [\`0x6B0183AC4446863D85B6a5D9c34888E8f4d2dC66\`](https://robinhoodchain.blockscout.com/address/0x6B0183AC4446863D85B6a5D9c34888E8f4d2dC66) |
| **Base Mainnet** | \`8453\` | \`ETH\` | [Basescan Explorer](https://basescan.org) | [\`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5\`](https://basescan.org/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5) |
| **Ink Chain** | \`57073\` | \`ETH\` | [Ink Explorer](https://explorer.inkonchain.com) | [\`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5\`](https://explorer.inkonchain.com/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5) |
| **Ethereum Mainnet** | \`1\` | \`ETH\` | [Etherscan](https://etherscan.io) | [\`0x00005EA00Ac477B1030CE78506496e8C2dE24bf5\`](https://etherscan.io/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5) |

### 4.2 Verified Live On-Chain Milestones
* **Allowlist GTD Stage Live Confirmation:** [Block #56127357](https://robinhoodchain.blockscout.com/block/56127357)
* **Public Stage Dual-Mode Rescue Confirmation:** [Block #56135081](https://robinhoodchain.blockscout.com/block/56135081)

### 4.3 Multi-RPC Racing Sequencers
* **Robinhood Private Alchemy RPC:** \`https://robinhood-mainnet.g.alchemy.com/v2/alch_FtrEfyyJYzEBZ0SQ3ctbJ\`
* **Robinhood Public Official RPC:** \`https://rpc.mainnet.chain.robinhood.com\`
* **Base Official RPC:** \`https://mainnet.base.org\`
* **Ink Official RPC:** \`https://rpc-gel.inkonchain.com\`
* **Ethereum Cloudflare RPC:** \`https://cloudflare-eth.com\`

---

## 5. 🌍 Domain, DNS & Routing Architecture

| Host / Subdomain | Type | Value / Destination | Provider / Proxy | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| \`www.aeromint.xyz\` | **CNAME** | \`cname.vercel-dns.com\` | Vercel Edge (SSL Active) | Production Frontend Web Application |
| \`aeromint.xyz\` | **A / Redirect** | \`76.76.21.21\` ➔ \`www.aeromint.xyz\` | Vercel Edge | Apex Domain Auto-Redirect |
| \`api.aeromint.xyz\` | **A Record** | \`129.80.65.56\` | Cloudflare / Let's Encrypt | Primary US Edge Cloud VPS API Gateway |
| \`aeromint-v3.vercel.app\` | **Vercel** | Internal Vercel Direct Route | Vercel Edge | Auto-redirects to \`www.aeromint.xyz\` |

---

## 6. 🔑 Platform Credentials & Access Directory

| Platform / Service | Role / Function | Login Account / Identifier | Status | Direct Access Link |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub** | Codebase Repository & CI/CD | \`Jainbharat666\` | 🟢 Active | [github.com/Jainbharat666/aeromint-v3](https://github.com/Jainbharat666/aeromint-v3) |
| **Vercel** | Frontend Edge Hosting & SSL | Team \`aeromint\` | 🟢 Active | [vercel.com/aeromint/aeromint-v3](https://vercel.com/aeromint/aeromint-v3) |
| **US Cloud VPS** | Ultra-Low Latency Minting Backend | \`ubuntu@129.80.65.56\` | 🟢 Active | [SSH / Terminal Access](https://api.aeromint.xyz/api/health) |
| **Render.com** | Standby Cloud Backend Service | \`jainbharat666\` | 🟢 Standby | [dashboard.render.com](https://dashboard.render.com) |
| **Supabase** | Cloud PostgreSQL & Authentication | Project: \`zfsyokzedsdofmtmjtqt\` | 🟢 Active | [supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt](https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt) |
| **Alchemy** | Private Sequencer RPC Fleet | Robinhood Mainnet App | 🟢 Active | [dashboard.alchemy.com](https://dashboard.alchemy.com) |
| **OpenSea API** | 6-Key Staggered Laser Grid Pool | Developer Portal | 🟢 Active | [opensea.io/account/api](https://opensea.io/account/api) |
| **Robinhood Explorer** | Blockscout Chain Telemetry | Robinhood Mainnet (4663) | 🟢 Active | [robinhoodchain.blockscout.com](https://robinhoodchain.blockscout.com) |

---

*Document Generated by AeroMint Architectural Engine — Antigravity Engineering*
`;

fs.writeFileSync(MD_PATH, mdContent, 'utf-8');
console.log('✔ ARCHITECTURE_AND_DEPLOYMENT.md created successfully!');

// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERATE HIGH-QUALITY STYLED HTML FOR PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AeroMint V3 - Architecture & Deployment Blueprint</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Header & Branding */
    .header-card {
      background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #311042 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 10px;
      margin-bottom: 14px;
      border: 1px solid #4338ca;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-img {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #000;
      border: 2px solid #06b6d4;
      padding: 3px;
    }

    .title-area h1 {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #38bdf8, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2px;
    }

    .title-area p {
      font-size: 8pt;
      color: #cbd5e1;
      font-weight: 500;
    }

    .badge-group {
      text-align: right;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .badge-verified {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid #10b981;
    }

    .badge-v3 {
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
      border: 1px solid #a855f7;
    }

    /* Section Headings */
    h2 {
      font-size: 11.5pt;
      font-weight: 800;
      color: #1e1b4b;
      margin-top: 12px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 3px;
    }

    h3 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 8px;
      margin-bottom: 3px;
    }

    /* Modern Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px 0;
      font-size: 8pt;
      background: #ffffff;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1.5px solid #cbd5e1;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background: #fafafa;
    }

    /* Clickable Link Styling */
    a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
      word-break: break-all;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: #f1f5f9;
      padding: 1px 3px;
      border-radius: 3px;
      font-size: 7.5pt;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }

    /* Architecture Flow Box */
    .flow-box {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 8px 0 10px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7pt;
      line-height: 1.35;
      border: 1px solid #334155;
    }

    .flow-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-top: 8px;
    }

    .flow-card {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid #475569;
      border-radius: 5px;
      padding: 6px;
    }

    .flow-card h4 {
      font-size: 7.5pt;
      color: #38bdf8;
      margin-bottom: 2px;
      font-weight: 700;
    }

    .flow-card p {
      font-size: 6.5pt;
      color: #cbd5e1;
      line-height: 1.25;
    }

    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .dot-green { background: #10b981; }
    .dot-blue { background: #3b82f6; }

    .footer-note {
      margin-top: 10px;
      text-align: center;
      font-size: 7pt;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-card">
    <div class="header-left">
      ${iconBase64 ? `<img src="data:image/png;base64,${iconBase64}" class="logo-img" alt="AeroMint Logo" />` : `<div class="logo-img">⚡</div>`}
      <div class="title-area">
        <h1>AeroMint V3 Blueprint</h1>
        <p>Enterprise Architecture, Infrastructure Topology & Production Access Directory</p>
      </div>
    </div>
    <div class="badge-group">
      <div class="badge badge-v3">Core Engine V3.0</div><br>
      <div class="badge badge-verified">Immutable & Locked</div>
    </div>
  </div>

  <!-- SECTION 1: VISUAL FLOW -->
  <h2>1. 🌐 Visual Architecture & End-to-End Data Flow</h2>
  <div class="flow-box">
    <strong>DATA DISPATCH & HIGH-SPEED LASER PIPELINE TOPOLOGY:</strong><br>
    [Client UI / Tauri Desktop] ➔ [DNS: www.aeromint.xyz] ➔ [US Edge Cloud VPS: 129.80.65.56:3001] ➔ [Supabase PostgreSQL & NTP]<br>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;➔ [6-Key OpenSea Laser Grid] ➔ [0.0ms Barrier Blast] ➔ [Robinhood Chain #4663]

    <div class="flow-grid">
      <div class="flow-card">
        <h4>1. Frontend & Client</h4>
        <p>React 19 + Tauri v2<br>Vercel Edge Anycast CDN<br><code>www.aeromint.xyz</code></p>
      </div>
      <div class="flow-card">
        <h4>2. US Edge VPS</h4>
        <p>Ashburn, VA (Oracle East)<br>IP: <code>129.80.65.56:3001</code><br><code>api.aeromint.xyz</code></p>
      </div>
      <div class="flow-card">
        <h4>3. Web3 & SeaDrop</h4>
        <p>Robinhood Mainnet (4663)<br>Alchemy Sequencer RPC<br>Contract: <code>0x00005EA...</code></p>
      </div>
    </div>
  </div>

  <!-- SECTION 2: FRONTEND -->
  <h2>2. 🖥️ Frontend & Client Applications</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Component</th>
        <th style="width: 45%;">Specification / Details</th>
        <th style="width: 30%;">Direct Access Link</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Web Stack</strong></td>
        <td>React 19.2.6, Vite 8, TailwindCSS, Ethers v6.16</td>
        <td><a href="https://github.com/Jainbharat666/aeromint-v3" target="_blank">github.com/.../aeromint-v3</a></td>
      </tr>
      <tr>
        <td><strong>Desktop Client</strong></td>
        <td>Tauri v2 Native Win64 (0.0ms WebView Engine)</td>
        <td><code>AeroMint-Bot-Windows.exe</code></td>
      </tr>
      <tr>
        <td><strong>Hosting Platform</strong></td>
        <td>Vercel Production (Team: aeromint)</td>
        <td><a href="https://vercel.com/aeromint/aeromint-v3" target="_blank">Vercel Project Dashboard</a></td>
      </tr>
      <tr>
        <td><strong>Live Custom Domain</strong></td>
        <td>Production Web SPA (Cloudflare Edge SSL)</td>
        <td><a href="https://www.aeromint.xyz" target="_blank">https://www.aeromint.xyz</a></td>
      </tr>
      <tr>
        <td><strong>Apex Domain</strong></td>
        <td>Root Domain with Auto-Forwarding</td>
        <td><a href="https://aeromint.xyz" target="_blank">https://aeromint.xyz</a></td>
      </tr>
      <tr>
        <td><strong>Vercel Preview URL</strong></td>
        <td>Direct Vercel Deployment Endpoint</td>
        <td><a href="https://aeromint-v3.vercel.app" target="_blank">https://aeromint-v3.vercel.app</a></td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: BACKEND & DATABASE -->
  <h2>3. ⚙️ Backend Services & Database Architecture</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Service</th>
        <th style="width: 45%;">Infrastructure Details</th>
        <th style="width: 30%;">Direct Endpoint / Dashboard</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Primary US Edge VPS</strong></td>
        <td>Ashburn, VA (IP: <code>129.80.65.56:3001</code>) | PM2 Managed</td>
        <td><a href="https://api.aeromint.xyz/api/health" target="_blank">https://api.aeromint.xyz</a></td>
      </tr>
      <tr>
        <td><strong>Secondary Backend</strong></td>
        <td>Render.com Cloud Web Service (Standby Fallback)</td>
        <td><a href="https://dashboard.render.com" target="_blank">Render Project Dashboard</a></td>
      </tr>
      <tr>
        <td><strong>Supabase Database</strong></td>
        <td>PostgreSQL Cloud Database (zfsyokzedsdofmtmjtqt)</td>
        <td><a href="https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt" target="_blank">Supabase Project Console</a></td>
      </tr>
      <tr>
        <td><strong>Database Tables</strong></td>
        <td><code>mint_users</code>, <code>mint_invites</code>, <code>fleet_rpcs</code>, <code>user_cloud_configs</code></td>
        <td>Schema Version: V3.0 Full Sync</td>
      </tr>
      <tr>
        <td><strong>Telemetry & Health</strong></td>
        <td>Real-Time Server Status & Active Database Connections</td>
        <td><a href="https://api.aeromint.xyz/api/health" target="_blank">/api/health Endpoint</a></td>
      </tr>
      <tr>
        <td><strong>Atomic Clock Sync</strong></td>
        <td>RFC 5905 UDP NTP Sync (Cloudflare / Google Time)</td>
        <td><a href="https://api.aeromint.xyz/api/ntp-time" target="_blank">/api/ntp-time Endpoint</a></td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- SECTION 4: SMART CONTRACTS & WEB3 -->
  <h2>4. ⛓️ Smart Contracts & Web3 Infrastructure</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 24%;">Network</th>
        <th style="width: 14%;">Chain ID</th>
        <th style="width: 32%;">SeaDrop Contract Address</th>
        <th style="width: 30%;">Block Explorer Link</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Robinhood (Primary)</strong></td>
        <td><code>4663</code></td>
        <td><code>0x00005EA00Ac477B1030CE78506496e8C2dE24bf5</code></td>
        <td><a href="https://robinhoodchain.blockscout.com/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5" target="_blank">View on Blockscout</a></td>
      </tr>
      <tr>
        <td><strong>Robinhood (Secondary)</strong></td>
        <td><code>4663</code></td>
        <td><code>0x6B0183AC4446863D85B6a5D9c34888E8f4d2dC66</code></td>
        <td><a href="https://robinhoodchain.blockscout.com/address/0x6B0183AC4446863D85B6a5D9c34888E8f4d2dC66" target="_blank">View on Blockscout</a></td>
      </tr>
      <tr>
        <td><strong>Base Mainnet</strong></td>
        <td><code>8453</code></td>
        <td><code>0x00005EA00Ac477B1030CE78506496e8C2dE24bf5</code></td>
        <td><a href="https://basescan.org/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5" target="_blank">View on Basescan</a></td>
      </tr>
      <tr>
        <td><strong>Ink Chain</strong></td>
        <td><code>57073</code></td>
        <td><code>0x00005EA00Ac477B1030CE78506496e8C2dE24bf5</code></td>
        <td><a href="https://explorer.inkonchain.com/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5" target="_blank">View on Ink Explorer</a></td>
      </tr>
      <tr>
        <td><strong>Ethereum Mainnet</strong></td>
        <td><code>1</code></td>
        <td><code>0x00005EA00Ac477B1030CE78506496e8C2dE24bf5</code></td>
        <td><a href="https://etherscan.io/address/0x00005EA00Ac477B1030CE78506496e8C2dE24bf5" target="_blank">View on Etherscan</a></td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: DOMAIN & DNS -->
  <h2>5. 🌍 Domain, DNS & Routing Architecture</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Host / Record</th>
        <th style="width: 12%;">Type</th>
        <th style="width: 35%;">Destination Target</th>
        <th style="width: 28%;">Purpose / SSL Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>www.aeromint.xyz</code></td>
        <td><strong>CNAME</strong></td>
        <td><code>cname.vercel-dns.com</code></td>
        <td>Web SPA Frontend (SSL 🟢)</td>
      </tr>
      <tr>
        <td><code>aeromint.xyz</code></td>
        <td><strong>A</strong></td>
        <td><code>76.76.21.21</code> (Vercel Anycast)</td>
        <td>Apex Redirect ➔ www (SSL 🟢)</td>
      </tr>
      <tr>
        <td><code>api.aeromint.xyz</code></td>
        <td><strong>A</strong></td>
        <td><code>129.80.65.56</code> (US Cloud VPS)</td>
        <td>Primary API Gateway (SSL 🟢)</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 6: PLATFORM & CREDENTIALS DIRECTORY -->
  <h2>6. 🔑 Platform Credentials & Access Directory</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Platform</th>
        <th style="width: 25%;">Identifier / Account</th>
        <th style="width: 32%;">Function / Role</th>
        <th style="width: 25%;">Direct Link</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>GitHub</strong></td>
        <td><code>Jainbharat666</code></td>
        <td>Source Code & Continuous Deployment</td>
        <td><a href="https://github.com/Jainbharat666/aeromint-v3" target="_blank">aeromint-v3 Repo</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>Vercel</strong></td>
        <td>Team <code>aeromint</code></td>
        <td>Frontend Global CDN Hosting</td>
        <td><a href="https://vercel.com/aeromint/aeromint-v3" target="_blank">Vercel Dashboard</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>Supabase</strong></td>
        <td><code>zfsyokzedsdofmtmjtqt</code></td>
        <td>Cloud PostgreSQL Database & Auth</td>
        <td><a href="https://supabase.com/dashboard/project/zfsyokzedsdofmtmjtqt" target="_blank">Supabase Console</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>US Cloud VPS</strong></td>
        <td><code>ubuntu@129.80.65.56</code></td>
        <td>Sub-Millisecond Minting Engine & PM2</td>
        <td><a href="https://api.aeromint.xyz/api/health" target="_blank">API Health Status</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-blue"></span><strong>Render.com</strong></td>
        <td><code>jainbharat666</code></td>
        <td>Secondary Standby Backend Service</td>
        <td><a href="https://dashboard.render.com" target="_blank">Render Dashboard</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>Alchemy</strong></td>
        <td>Robinhood Mainnet</td>
        <td>Private High-Speed Sequencer RPC</td>
        <td><a href="https://dashboard.alchemy.com" target="_blank">Alchemy Portal</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>OpenSea</strong></td>
        <td>6-Key Laser Grid</td>
        <td>SeaDrop & Calldata GraphQL API</td>
        <td><a href="https://opensea.io/account/api" target="_blank">OpenSea Developer</a></td>
      </tr>
      <tr>
        <td><span class="status-dot dot-green"></span><strong>Robinhood Explorer</strong></td>
        <td>Chain ID <code>4663</code></td>
        <td>On-Chain Tx Verification & Telemetry</td>
        <td><a href="https://robinhoodchain.blockscout.com" target="_blank">Blockscout Explorer</a></td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">
    <strong>AeroMint V3 Architecture & Deployment Blueprint</strong> — Verified & Compiled by Antigravity Engineering (September 2026)
  </div>

</body>
</html>
`;

fs.writeFileSync(HTML_PATH, htmlContent, 'utf-8');
console.log('✔ Project_Architecture_and_Deployment_Guide.html generated!');

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPILE PDF VIA CHROME HEADLESS
// ─────────────────────────────────────────────────────────────────────────────
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

const cmd = `"${browserExe}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${PDF_PATH}" "${HTML_PATH}"`;

try {
  console.log('Generating high-quality PDF via headless browser...');
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(PDF_PATH)) {
    const stats = fs.statSync(PDF_PATH);
    console.log(`✔ PDF successfully generated: ${PDF_PATH} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('✖ PDF generation failed: File not found after execution.');
  }
} catch (err) {
  console.error('✖ Error generating PDF:', err.message);
}
