# Assignment 1: Get started
In these series of assignments, you will use Solidity to create synthetic assets and develop a decentralized trading platform to enable exchanges among these assets on the Ethereum testnet. In what follows, we explain our final goal and deploy a few simple smart contracts.

# Part 1: Overview
**Synthetic assets** are tokenized derivatives that produce the same value as another asset. It enables you to trade some assets without holding the asset itself. For instance, on Ethereum, you can trade synthetic assets representing fiat currencies (e.g. synthetic USD), other cryptocurrencies like BTC, even stocks (e.g. synthetic TSLA), which behave like the underlying asset by tracking its price using **data oracles** (will be explained in Part 1). 

We want to create a decentralized system to mint, manage, exchange synthetic assets, here are several example use cases to illustrate the application:

1. Mary wants to invest in Tesla stock with Ethereum, she mints synthetic Tesla (sTSLA) tokens by sending EUSD (ethereum stable coin) as collateral.
2. Linda owns lots of synthetic Binance Coins (sBNB) and sTSLA tokens and puts these tokens in a liquidity pool for rewards.
3. Tom owns lots of sBNB and wants to exchange them for sTSLA.


## Participants

In the above examples, three people involved represent three participants in our system, they are

* **Minter**: create Collateralized debt positions (CDP) in order to obtain newly minted tokens of a synthetic asset. CDPs can accept collateral in the form of EUSD and must maintain a collateral ratio above the minimum rate.
* **Liquidity provider**: add tokens to the corresponding pool, which increases liquidity for that market. 
* **Trader**: buy and sell synthetic tokens through a Uniswap-like protocol

*Do not worry if you can not fully understand the role of each participant and some terminologies now, they will be introduced in more detail in subsequent parts.* 

## Tokens

As suggested in the examples, three tokens will be used in our system. (ETH is not listed, but will also be used to pay gas fees.)

| Token Name | Token Symbol | Function | Type |
| -------- | -------- | -------- | -------- |
|Ethereum USD| EUSD | stable coin | ERC20 token|
|Synthetic Binance| sBNB | synthetic asset | ERC20 token|
|Synthetic TSLA| sTSLA| synthetic asset | ERC20 token|

## Smart Contracts

The whole system consists of three smart contracts, each for one part.

| Contract | Function |  |
| -------- | -------- |-------- |
| PriceFeed     | An interface to get prices for synthetic assets from oracle     | Part 1|
|Mint | For CDP creation, management, and liquidation |Part 2|
|SynthSwap | A Uniswap-like automated market maker (AMM) protocol |Part 3

## Testnet and wallet
To deploy our contracts, we will use a public blockchain. In this part, we need to create some public accounts in **Sepolia Testnet** and use **Metamask** to manage them.

0. You have done steps 1 to 3 already for your lab, just make sure they check out.
1. Install [MetaMask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) on Chrome, follow the instructions on the app to create a new wallet. After entering the correct phrases, a new account will be created automatically. You can create any number of accounts by clicking the upper right icon and *Create Account*.
2. Switch to Sepolia Testnet: click the *Ethereum Mainnet* at the top right corner of the wallet page and turn on the testnet list by setting *Show/hide test networks*. Switch the network to *Sepolia Testnet*.
3. Get some free ETH: go to a [faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) and enter your address, you will get 0.05 ETH for testing.
4. Open [Remix](https://remix.ethereum.org/) in Chrome as well, in the *Deploy & run transactions* tab, set the environment to *Injected Web3*. This will launch a popup page to connect with your wallet.



## Deploy Token Contracts
In this part, you need to create three tokens introduced before. These tokens all follow the ERC20 standards and use the interface provided by [OpenZeppelin](https://docs.openzeppelin.com/contracts/4.x/erc20). The smart contracts are provided in the following files:
```
contracts/EUSD.sol
contracts/sAsset.sol
```
1. Open [Remix](https://remix.ethereum.org/) in your web browser, this is an online IDE where you will write, test and deploy your smart contracts.
2. Add provided contracts in Remix and compile them in the *Solidity compiler* tab on the left. 
3. Create EUSD by deploying `EUSD.sol`, this will create a contract deployment transaction. The information and status of the transaction will be displayed in the terminal. Deployment is done using the *Deploy and run transactions* tab on the left. Make sure you connect your Metamask wallet by selecting your *Environment* to be *Injected provider - Metamask*.
4. Create sBNB and sTSLA by deploying `sAsset.sol` with corresponding parameters ``(name, symbol, initialSupply)``, `name` and `symbol` are provided in the token table in the section above, `initialSupply = 0`.
5. After a contract is successfully deployed, you can see the instance under *Deployed Contracts*, where you can get your contract address and interact with the contract manually (e.g. if you call the `balanceOf` function of EUSD and enter your account address, you will get the number of EUSD tokens as output). 
 
# Part 2: Creating price feeds

To reflect the value of other assets, we need to first obtain price feeds before minting synthetic assets. While everyone can get the latest price of a stock on NASDAQ and put it on the chain, data consumers may not want to trust any single data provider.

**Data oracles** provide a decentralized and trustworthy way for blockchains to access external data sources. Resources external to the blockchain are considered "off-chain" while data stored on the blockchain is considered on-chain. Oracle is an additional piece of infrastructure to bridge the two environments.

In this part, we will use one of the most popular oracle solutions, [Chainlink](https://docs.chain.link/), to create price feeds for our synthetic tokens.



## Price feed interface
We have provided the interface of the price feed smart contract in `interfaces/IPriceFeed.sol`, you need to implement your `PriceFeed.sol` and deploy one instance for each synthetic asset to provide their prices with respect to USD. You can refer to [this tutorial](https://docs.chain.link/docs/get-the-latest-price/) for help. The proxy addresses of each asset in Sepolia are provided below:

```
TSLA / USD: 0xC32f0A9D70A34B9E7377C10FDAd88512596f61EA
BNB / USD: 0x8A6af2B75F23831ADc973ce6288e5329F63D86c6
```
1. There is only one function defined in the interface, you are required to implement it to provide the requested information. You can design other parts of the contract as you like.
2. Deploy the price feed contract for each asset, test the interface and copy their addresses. Once the deployment transactions are confirmed, you are able to find the deployed contracts in [etherscan](https://sepolia.etherscan.io/) with https://sepolia.etherscan.io/address/{:your_contract_address}.

# Submission

You will need to submit the addresses of your deployed contracts. Please make sure you deploy and interact with your contract using the public address you had provided to us at the start of the class. **Make sure you verify your contract on etherscan**- this would make it easier for you to interact with it and for us to check it. Verifying the contract makes the contract code show up in high level Solidity as opposed to low level Bytecode on Etherscan. To verify the contracts follow these steps:
1. Get an Etherscan API key [from here](https://docs.etherscan.io/getting-started/viewing-api-usage-statistics).
2. Use the key to verify your contract using the [Remix contract verification plugin](https://remix-ide.readthedocs.io/en/latest/contract_verification.html).

Because this code will be used in later parts, make sure you are able to interact with your smart contracts via Remix or Etherscan. Test the main functionalities of the tokens like `transfer`, `transferFrom`, and `mint`, `burn` for sAsset. Note that we use [Access Control](https://docs.openzeppelin.com/contracts/4.x/access-control) in sAsset to govern who can mint and burn tokens. The contract creator can grant minter and burner roles to other accounts by calling the `grantRole` function. You can select different accounts under *Account* to test these functions.

Submit the etherscan links to the 5 contracts to this form : [SUBMISSION FORM](https://forms.gle/NBkHJzxqA9Tiuvkx7)
