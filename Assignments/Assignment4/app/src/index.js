import Web3 from "web3";
import EUSDArtifact from "../../build/contracts/EUSD.json";
import sTSLAArtifact from "../../build/contracts/sTSLA.json";
import sBNBArtifact from "../../build/contracts/sBNB.json";
import MintArtifact from "../../build/contracts/Mint.json";
import SwapArtifact from "../../build/contracts/Swap.json";
import BNBPFArtifact from "../../build/contracts/BNBPriceFeed.json";
import TSLAPFArtifact from "../../build/contracts/TSLAPriceFeed.json";

const App = {
    web3: null,
    account: null,
    meta: null,

    start: async function() {
        const { web3 } = this;

        try {
            const networkId = await web3.eth.net.getId();

            const contracts_to_deploy = ['EUSD', 'sBNB', 'sTSLA', 'Mint', 'Swap', 'BNBPriceFeed', 'TSLAPriceFeed']
            var deployedNetworks = {}
            deployedNetworks['EUSD'] = EUSDArtifact.networks[networkId];
            deployedNetworks['sBNB'] = sBNBArtifact.networks[networkId];
            deployedNetworks['sTSLA'] = sTSLAArtifact.networks[networkId];
            deployedNetworks['Mint'] = MintArtifact.networks[networkId];
            deployedNetworks['Swap'] = SwapArtifact.networks[networkId];
            deployedNetworks['BNBPriceFeed'] = BNBPFArtifact.networks[networkId];
            deployedNetworks['TSLAPriceFeed'] = TSLAPFArtifact.networks[networkId];

            var contractABI = {}
            contractABI['EUSD'] = EUSDArtifact.abi;
            contractABI['sBNB'] = sBNBArtifact.abi;
            contractABI['sTSLA'] = sTSLAArtifact.abi;
            contractABI['Mint'] = MintArtifact.abi;
            contractABI['Swap'] = SwapArtifact.abi;
            contractABI['BNBPriceFeed'] = BNBPFArtifact.abi;
            contractABI['TSLAPriceFeed'] = TSLAPFArtifact.abi;

            this.meta = {};
            for (name of contracts_to_deploy) {
                this.meta[name] = new web3.eth.Contract(
                    contractABI[name],
                    deployedNetworks[name].address,
                );
            }

            const accounts = await web3.eth.getAccounts();
            this.accounts = accounts;

            this.setup()
            this.refreshBalance();
        } catch (error) {
            console.error(error)
            console.error("Could not connect to contract or chain.");
        }
    },

    grantRoles: async function(contractName) {
        let minterRole = await this.meta[contractName].methods.MINTER_ROLE().call();
        let burnerRole = await this.meta[contractName].methods.BURNER_ROLE().call();
        let minterGranted = await this.meta[contractName].methods.hasRole(minterRole, this.meta['Mint'].options.address).call();
        if (!minterGranted) {
            await this.meta[contractName].methods.grantRole(minterRole, this.meta['Mint'].options.address).send({from: this.accounts[0]});
            await this.meta[contractName].methods.grantRole(burnerRole, this.meta['Mint'].options.address).send({from: this.accounts[0]});
        }
    },

    registerAsset: async function(contractName, priceFeed)  {
        let registered = await this.meta['Mint'].methods.checkRegistered(this.meta[contractName].options.address).call();
        if (!registered) {
            await this.meta['Mint'].methods.registerAsset(
            this.meta[contractName].options.address, 
            2, 
            this.meta[priceFeed].options.address
            ).send({from: this.accounts[0]});
        }
    },

    setup: async function() {
        this.grantRoles('sBNB');
        this.grantRoles('sTSLA');
        this.registerAsset('sBNB', 'BNBPriceFeed');
        this.registerAsset('sTSLA', 'TSLAPriceFeed');
    },

    refreshBalance: async function() {
        this.refreshBalanceEUSD();
        this.refreshBalancesBNB();
        this.refreshBalancesTSLA();
        this.refreshReserves();
    },

    refreshBalanceEUSD: async function() {
        const balance = await this.meta['EUSD'].methods.balanceOf(this.accounts[0]).call();

        const balanceElement = document.getElementsByClassName("balanceEUSD")[0];
        balanceElement.innerHTML = (balance / 10**8).toFixed(8);
    },

    refreshBalancesTSLA: async function() {
        const balance = await this.meta['sTSLA'].methods.balanceOf(this.accounts[0]).call();

        const balanceElement = document.getElementsByClassName("balancesTSLA");
        for (let i = 0; i < 3; i += 1) {
            balanceElement[i].innerHTML = (balance / 10**8).toFixed(8);
        }
    },

    refreshBalancesBNB: async function() {
        const balance = await this.meta['sBNB'].methods.balanceOf(this.accounts[0]).call();

        const balanceElement = document.getElementsByClassName("balancesBNB");
        for (let i = 0; i < 3; i += 1) {
            balanceElement[i].innerHTML = (balance / 10**8).toFixed(8);
        }
    },

    refreshReserves: async function() {
        const reserves = await this.meta['Swap'].methods.getReserves().call();

        const reserve0Element = document.getElementsByClassName("reservesBNB");
        reserve0Element[0].innerHTML = (reserves[0] / 10**8).toFixed(8);
        reserve0Element[1].innerHTML = (reserves[0] / 10**8).toFixed(8);
        const reserve1Element = document.getElementsByClassName("reservesTSLA");
        reserve1Element[0].innerHTML = (reserves[1] / 10**8).toFixed(8);
        reserve1Element[1].innerHTML = (reserves[1] / 10**8).toFixed(8);
    },

    approve: async function(contractName, to, amount) {
        await this.meta[contractName].methods.approve(to, amount).send({from: this.accounts[0]});
    },

    init: async function() {
        this.setStatus("Initiating transaction... (please wait)");
        const liquidity0 = parseInt(document.getElementById("liquidity0").value * 10**8).toString();
        const liquidity1 = parseInt(document.getElementById("liquidity1").value * 10**8).toString();

        await this.approve('sBNB', this.meta['Swap'].options.address, liquidity0);
        await this.approve('sTSLA', this.meta['Swap'].options.address, liquidity1);
        
        await this.meta['Swap'].methods.init(liquidity0, liquidity1).send({ from: this.accounts[0] });
        
        this.refreshBalance();
        this.setStatus("Transaction complete!");
        
    },

    checkShares: async function() {
        const shares = await this.meta['Swap'].methods.getShares(this.accounts[0]).call();
        const balanceElement = document.getElementsByClassName("shares")[0];
        balanceElement.innerHTML = shares;
    },

    checkPrice: async function() {
        const sAsset = document.getElementById("sAsset").value;
        const priceFeed = sAsset.slice(1) + 'PriceFeed';
        console.log(sAsset, priceFeed);
        const price = await this.meta[priceFeed].methods.getLatestPrice().call();
        const priceElement = document.getElementsByClassName("price")[0];
        priceElement.innerHTML = (price[0] / 10**8).toFixed(8);
    },

    setStatus: function(message) {
        const status = document.getElementById("status");
        status.innerHTML = message;
    },

    /* Mint tab */
    openPosition: async function() {
        console.log("openPosition called");
        this.setStatus("Initiating transaction... (please wait)");
    
        try {
            const sAsset = document.getElementById("sAsset").value;
            const deposit = parseInt(document.getElementById("deposit").value * 10**8).toString();
            // const CR = parseInt(document.getElementById("CR").value * 10**8).toString();
            const CR = parseInt(document.getElementById("CR").value).toString();
    
            console.log("Minting:", sAsset, "Deposit:", deposit, "CR:", CR);
    
            // Ensure sAsset is valid
            if (!this.meta[sAsset]) {
                throw new Error(`Invalid asset selected: ${sAsset}`);
            }
    
            const assetAddress = this.meta[sAsset].options.address;
            console.log("Resolved asset address:", assetAddress);
    
            // Check if assetAddress is a valid Ethereum address
            if (!this.web3.utils.isAddress(assetAddress)) {
                throw new Error(`Invalid Ethereum address for asset: ${assetAddress}`);
            }

            console.log("Asset address is valid:", assetAddress);
    
            // Check user balance before approving
            const userBalance = await this.meta['EUSD'].methods.balanceOf(this.accounts[0]).call();
            if (BigInt(userBalance) < BigInt(deposit)) {
                throw new Error("Insufficient EUSD balance!");
            }

            console.log("User balance is sufficient:", userBalance, "Deposit:", deposit);
    
            // Approve EUSD for deposit
            await this.approve('EUSD', this.meta['Mint'].options.address, deposit);
            
        console.log("Deposit approved for Mint contract");

            // ✅ Correcting parameter order here
            await this.meta['Mint'].methods.openPosition(
                deposit, // Correct order
                assetAddress, 
                CR
            ).send({ from: this.accounts[0] });
    
            this.refreshBalance();
            this.setStatus("Transaction complete!");
        } catch (err) {
            console.error("Error in openPosition:", err.message);
            this.setStatus("Transaction failed. Check console for details.");
        }
    },

    addLiquidity: async function () {
        this.setStatus("Initiating transaction... (please wait)");
    
        try {
            const liquidity0 = parseInt(document.getElementById("liquidity0").value * 10 ** 8).toString();
            const reserves = await this.meta['Swap'].methods.getReserves().call();
    
            if (BigInt(reserves[0]) === 0n || BigInt(reserves[1]) === 0n) {
                throw new Error("Pool not initialized. Call init() first.");
            }
    
            // Calculate token1Amount using pool ratio
            const token1Amount = (BigInt(reserves[1]) * BigInt(liquidity0)) / BigInt(reserves[0]);
    
            // Approve both tokens
            await this.approve('sBNB', this.meta['Swap'].options.address, liquidity0);
            await this.approve('sTSLA', this.meta['Swap'].options.address, token1Amount.toString());
    
            console.log("Approvals done:", liquidity0, token1Amount.toString());
    
            // Call addLiquidity with token0Amount
            await this.meta['Swap'].methods.addLiquidity(liquidity0)
                .send({ from: this.accounts[0] });
    
            this.refreshBalance();
            this.setStatus("Liquidity added successfully!");
        } catch (err) {
            console.error("Error in addLiquidity:", err.message);
            this.setStatus("Transaction failed. Check console for details.");
        }
    },       

    removeLiquidity: async function() {
        this.setStatus("Initiating transaction... (please wait)");
    
        try {
            const shares = parseInt(document.getElementById("shares").value).toString();
    
            console.log("Removing liquidity: Shares:", shares);
    
            // Ensure valid input
            if (BigInt(shares) <= 0n) {
                throw new Error("Shares must be greater than zero.");
            }
    
            // Check user's current share balance
            const userShares = await this.meta['Swap'].methods.getShares(this.accounts[0]).call();
            if (BigInt(userShares) < BigInt(shares)) {
                throw new Error("Insufficient shares to remove!");
            }
    
            // Call `removeLiquidity()` on the contract
            await this.meta['Swap'].methods.removeLiquidity(shares)
                .send({ from: this.accounts[0] });
    
            this.refreshBalance();
            this.setStatus("Liquidity removed successfully!");
        } catch (err) {
            console.error("Error in removeLiquidity:", err.message);
            this.setStatus("Transaction failed. Check console for details.");
        }
    },    

    token0To1: async function() {
        this.setStatus("Initiating transaction... (please wait)");
    
        try {
            const amount = parseInt(document.getElementById("swap0").value * 10**8).toString();
    
            console.log("Swapping sBNB -> sTSLA, Amount:", amount);
    
            // Ensure valid input
            if (BigInt(amount) <= 0n) {
                throw new Error("Swap amount must be greater than zero.");
            }
    
            // Check user's sBNB balance
            const userBalance = await this.meta['sBNB'].methods.balanceOf(this.accounts[0]).call();
            if (BigInt(userBalance) < BigInt(amount)) {
                throw new Error("Insufficient sBNB balance!");
            }
    
            // Check liquidity pool reserves
            const reserves = await this.meta['Swap'].methods.getReserves().call();
            if (BigInt(reserves[1]) === 0n) {
                throw new Error("Insufficient liquidity for swap!");
            }
    
            // Approve sBNB transfer for Swap contract
            await this.approve('sBNB', this.meta['Swap'].options.address, amount);
    
            // Execute swap
            await this.meta['Swap'].methods.token0To1(amount)
                .send({ from: this.accounts[0] });
    
            this.refreshBalance();
            this.setStatus("Swap successful!");
        } catch (err) {
            console.error("Error in token0To1:", err.message);
            this.setStatus("Transaction failed. Check console for details.");
        }
    },    

    token1To0: async function() {
        this.setStatus("Initiating transaction... (please wait)");
    
        try {
            const amount = parseInt(document.getElementById("swap1").value * 10**8).toString();
    
            console.log("Swapping sTSLA -> sBNB, Amount:", amount);
    
            // Ensure valid input
            if (BigInt(amount) <= 0n) {
                throw new Error("Swap amount must be greater than zero.");
            }
    
            // Check user's sTSLA balance
            const userBalance = await this.meta['sTSLA'].methods.balanceOf(this.accounts[0]).call();
            if (BigInt(userBalance) < BigInt(amount)) {
                throw new Error("Insufficient sTSLA balance!");
            }
    
            // Check liquidity pool reserves
            const reserves = await this.meta['Swap'].methods.getReserves().call();
            if (BigInt(reserves[0]) === 0n) {
                throw new Error("Insufficient liquidity for swap!");
            }
    
            // Approve sTSLA transfer for Swap contract
            await this.approve('sTSLA', this.meta['Swap'].options.address, amount);
    
            // Execute swap
            await this.meta['Swap'].methods.token1To0(amount)
                .send({ from: this.accounts[0] });
    
            this.refreshBalance();
            this.setStatus("Swap successful!");
        } catch (err) {
            console.error("Error in token1To0:", err.message);
            this.setStatus("Transaction failed. Check console for details.");
        }
    },    
};

window.App = App;

window.addEventListener("load", async function() {
    if (window.ethereum) {
        try {
            App.web3 = new Web3(window.ethereum);
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            App.accounts = accounts; // Store connected accounts
            console.log("Connected Account:", App.accounts[0]);
        } catch (error) {
            console.error("User denied account access:", error);
        }
    } else {
        console.warn("No web3 detected. Falling back to http://127.0.0.1:8545.");
        App.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
    }

    // Ensure start() is only called when accounts are available
    if (App.accounts && App.accounts.length > 0) {
        App.start();
    } else {
        console.error("No accounts available. MetaMask connection failed.");
    }

    console.log("Accounts from MetaMask:", App.accounts);
});




