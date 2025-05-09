﻿# Rosen Open Source

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
  - Endpoint: https://blockchain.googleapis.com/v1/projects/YOUR_PROJECT_AND_KEY_HERE
  - Used for: PYUSD deposit/withdrawal transactions (low-latency confirmations).

- Future Plans:

 Example: Trace PYUSD flows (post-hackathon)

from gcp_blockchain import debug_traceTransaction

- debug_traceTransaction(tx_hash="0x...", pyusd_contract=True)

## 🛠️ Setup & Run

### Architecture

![arch_img](./images/arch.png)

### Build & Run Client

```
cd client
npm i
npm run dev
```

### Build & Run Server

1. requirements: 

  - golang >= 1.23.4
  - mysql >= 8.0
  - redis

2. build

```
cd server-contract
go mod download
go build
```

2. Edit ```config.yaml``` with your favorate editor. e.g. ```vim```

```
vim config.yaml
```

3. Launch for first time.

```
./rosen-apiserver server --config config.yaml --migratedb yes
```

## 📈 Future Roadmap

- GCP-Powered Analytics:
  - Real-time PYUSD dashboards (BigQuery + Colab).
  - MEV monitoring via trace_transaction.

- PayPal API: Direct PYUSD withdrawals.

## 📜 License

MIT © ROSEN Team.
