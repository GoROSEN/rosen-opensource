# Rosen Open Source

## 🌹 ROSEN APP

The Revolutionary Social Trading App
Seamless cross-border connections, powered by PYUSD & Google Cloud’s Blockchain RPC

- MIT License

- GCP Blockchain RPC

- PYUSD

- Gasless Seamless

## 🏆 Why ROSEN?

ROSEN is the first social trading platform powered by Google Cloud and PayPal PYUSD, designed to:

Break language barriers: AI-powered real-time multilingual chat

Remove payment borders: Fee-free, instant PYUSD transactions

Empower global earnings: Connect, explore, and earn worldwide

## For Users

✨ Polished Frontend: A user-friendly UX designed for non-crypto natives – no seed phrases, no gas fees, just Gmail login and go!

🌐 Cross-border focus: Break down language barriers, unlock potential and opportunities for global social economy.

🔥 Gasless, seamless & instant transfers: Send PYUSD without paying gas (ROSEN covers fees!) to anyone in chat, just like sending a message!

🔒 Accessible & compliant: Live on the App Store and Google Play Store with a focus on compliant stablecoins

## For Hackathon Judges

✅ PYUSD + GCP RPC: Leverages Google Cloud’s Ethereum mainnet RPC for reliable, scalable transactions.

## 🎮 Key Features

Feature | Tech Stack | Competitive Edge
------- | ---------- | -------------------
1-Click PYUSD Onboarding | WalletConnect, Wallet auto-generating | No crypto jargon – just Gmail + PayPal!
| Gasless Social Trading | GCP RPC | Users pay zero gas for in-app transfers
Social trading |  AI Translation + P2P transfer in chat | Transfer stablecoins to anyone in chat, just like sending a message
Multi-Chain Dashboard |  React + Ethers.js | Unified view for ETH/SOL/PYUSD (coming soon)

## ⚙️ GCP Blockchain RPC Integration

How We Use Google Cloud:

- Ethereum Mainnet RPC:
  - Endpoint: https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY (Switched to GCP post-submission)
  - Used for: PYUSD deposit/withdrawal transactions (low-latency confirmations).

- Future Plans:

 Example: Trace PYUSD flows (post-hackathon)

from gcp_blockchain import debug_traceTransaction

- debug_traceTransaction(tx_hash="0x...", pyusd_contract=True)

## 🛠️ Setup & Run

Prerequisites

- GCP Account: Free Tier (for RPC access).

- PYUSD: Get test tokens here.

1. Run Client (Web)

```
cd client
npm install
npm run dev # Uses GCP RPC for TX broadcasting
```

2. Run Server (Backend)

```
cd server-contract
go mod download
go build
```

### Edit config.yaml to add GCP RPC URL

```
./rosen-apiserver server --config config.yaml --migratedb yes
```

3. Connect PYUSD on Ethereum

4. Visit https://www-stag.gorosen.xyz/profile.

5. Deposit PYUSD via GCP-backed RPC (Ethereum mainnet).

## 📈 Future Roadmap

- GCP-Powered Analytics:
  - Real-time PYUSD dashboards (BigQuery + Colab).
  - MEV monitoring via trace_transaction.

- PayPal API: Direct PYUSD withdrawals.

## 📜 License

MIT © ROSEN Team.

**Judges, see our submission video here for a gasless PYUSD trade demo!**
