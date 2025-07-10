# Ree L2 App Demo

REE can be used to run both Bitcoin L1 DApps and L2 DApps. For L2 DApps, the role of REE is fixed: it serves as the embedded bridge of the DApp, enabling autonomous custody of Bitcoin assets and facilitating BTC and Runes deposit and withdrawal. Here is the implementation of a MVP REE L2 Dapp.

Unlike Ethereum and other smart contract platforms, Bitcoin's scripting language is not Turing complete, making it extremely challenging—if not impossible—to develop complex applications like AMM protocols directly on the Bitcoin network using BTC scripts and the UTXO model.

REE overcomes this limitation by leveraging the powerful Chain Key technology of the Internet Computer Protocol (ICP) and Bitcoin's Partially Signed Bitcoin Transactions (PSBT) to extend the programmability of Bitcoin's Rune assets.

Ree L2 App Demo is an example Play-to-Earn project base [REE](https://www.omnity.network/ree) and [SIWB](https://github.com/AstroxNetwork/ic-siwb).

## User Cases

![img](./images/user_cases.jpg)

## Implementation

### Init

![img](./images/init.jpg)

### Register

![img](./images/register.jpg)

![img](./images/register_psbt.jpg)

### Play Game

![img](./images/play_game.jpg)

### Add Liquidity

![img](./images/add_liquidity.jpg)

![img](./images/add_lq_psbt.jpg)

### Withdraw

![img](./images/withdraw.jpg)

![img]()

## Siwb

[ic-siwb](https://github.com/AstroxNetwork/ic-siwb)

![img](./images/get_delegation.jpg)

## Frontend

[The frontend repo](https://github.com/octopus-network/ree-game-demo/tree/main/ree-cookie-frontend)
