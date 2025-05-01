// Debug function to show messages in the UI
function debugLog(message) {
    const debugConsole = document.getElementById('debugConsole');
    debugConsole.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    console.log(message);
}

// Verify ethers is available immediately
if (typeof ethers === 'undefined') {
    debugLog("CRITICAL: Ethers.js not available");
    throw new Error("Ethers.js not loaded");
} else {
    debugLog(`Ethers.js v${ethers.version} loaded successfully`);
}

// Mock data for local development
async function getMockScore(address) {
    const mockScores = {
        "0x123...abc": 100,
        "0x456...def": 200
    };
    return mockScores[address] || 0;
}

// Contract details
const contractAddress = "0x909C83D6D63A7E1a6318Dadc5c847dFc41cFDAF8";
const abi = [
    "function vote(uint256 weight) public",
    "function getVote(address user) public view returns (uint256)",
];

// Global variables
let provider, signer, contract, userAddress;

// DOM elements
const connectBtn = document.getElementById("connectBtn");
const voteBtn = document.getElementById("voteBtn");
const statusEl = document.getElementById("status");
const userInfoEl = document.getElementById("userInfo");
const userAddressEl = document.getElementById("userAddress");
const userScoreEl = document.getElementById("userScore");
const votingStatusEl = document.getElementById("votingStatus");

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    debugLog("Page loaded, initializing...");
    initApp();
});

async function initApp() {
    // Check for MetaMask
    if (typeof window.ethereum === 'undefined') {
        showError("MetaMask not detected! Please install it.");
        connectBtn.disabled = true;
        return;
    }

    debugLog("MetaMask detected");
    
    // Set up event listeners
    connectBtn.addEventListener("click", connectWallet);
    voteBtn.addEventListener("click", vote);
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    
    // Listen for chain changes
    window.ethereum.on('chainChanged', () => {
        debugLog("Chain changed, reloading...");
        window.location.reload();
    });

    // Try to connect automatically if already authorized
    if (window.ethereum.selectedAddress) {
        debugLog("Already connected, initializing...");
        await initializeProvider();
    }
}

function showError(message) {
    statusEl.textContent = message;
    statusEl.className = "error";
    debugLog(message);
}

function showSuccess(message) {
    statusEl.textContent = message;
    statusEl.className = "success";
    debugLog(message);
}
async function connectWallet() {
    try {
        debugLog("Starting connection...");
        connectBtn.disabled = true;
        statusEl.textContent = "Connecting...";
        
        // Verify both libraries are available
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask not detected");
        }
        if (typeof ethers === 'undefined') {
            throw new Error("Ethers.js not loaded - please refresh");
        }
        debugLog("Both libraries verified");
        
        // Request accounts
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts?.length) throw new Error("No accounts returned");
        
        debugLog(`Accounts received: ${accounts.length}`);
        
        // Initialize provider with error handling
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            debugLog("Provider initialized");
            
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
            debugLog(`Connected to: ${userAddress}`);
            
            contract = new ethers.Contract(contractAddress, abi, signer);
            debugLog("Contract initialized");
            
            // Update UI
            statusEl.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            statusEl.className = "success";
            userInfoEl.style.display = "block";
            userAddressEl.textContent = userAddress;
            voteBtn.disabled = false;
            
            await updateUserInfo();
            
        } catch (providerError) {
            console.error("Provider initialization failed:", providerError);
            throw new Error("Failed to initialize provider");
        }
        
    } catch (error) {
        console.error("Connection failed:", error);
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.className = "error";
        connectBtn.disabled = false;
        
        if (error.code === 4001) {
            statusEl.textContent = "Connection rejected by user";
        }
    }
}

async function initializeProvider() {
    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, abi, signer);
        userAddress = await signer.getAddress();
        
        // Update UI
        userInfoEl.style.display = "block";
        userAddressEl.textContent = userAddress;
        voteBtn.disabled = false;
        
        await updateUserInfo();
    } catch (error) {
        showError(`Initialization error: ${error.message}`);
    }
}

function handleAccountsChanged(accounts) {
    debugLog(`Accounts changed: ${accounts.length} accounts`);
    if (accounts.length === 0) {
        // MetaMask is locked or user disconnected all accounts
        debugLog("MetaMask locked or disconnected");
        resetUI();
        showError("Please connect your wallet");
    } else {
        userAddress = accounts[0];
        debugLog(`Account changed to: ${userAddress}`);
        updateUserInfo();
    }
}

async function updateUserInfo() {
    try {
        // Get score from Ethercalc
        const score = await getScoreFromEthercalc(userAddress);
        userScoreEl.textContent = score > 0 ? score : "No score found";
        
        // Check voting status if contract is initialized
        if (contract) {
            const hasVoted = await contract.getVote(userAddress);
            votingStatusEl.textContent = hasVoted > 0 ? "Already voted" : "Can vote";
            voteBtn.disabled = hasVoted > 0 || score <= 0;
        }
        
    } catch (error) {
        debugLog(`Error updating user info: ${error.message}`);
        userScoreEl.textContent = "Error loading score";
        votingStatusEl.textContent = "Error checking status";
    }
}

async function getScoreFromEthercalc(address) {
    try {
        const ethercalcURL = "https://ethercalc.net/khmftn67k9xt.csv"; 
        const response = await fetch(ethercalcURL);
        const text = await response.text();
        console.log("📥 Raw CSV data:\n", text); // Log to check format

        const rows = text.trim().split("\n");
        for (let row of rows) {
            if (!row.includes(",")) continue; // skip empty/invalid lines
        
            const [addr, val] = row.split(",").map(s => s.trim());
            console.log("🔍 Checking:", addr, val);
        
            if (addr.toLowerCase() === address.toLowerCase()) {
                const score = parseInt(val);
                return isNaN(score) ? 0 : score;
            }
        }
        


        console.log("❌ Address not found in Ethercalc");
        return 0;
    } catch (err) {
        console.error("⚠️ Error fetching score from Ethercalc:", err);
        return 0;
    }
}

async function vote() {
    try {
        const voteBtn = document.getElementById("voteBtn");
        voteBtn.disabled = true;
        voteBtn.textContent = "Voting...";
        
        const score = await getScoreFromEthercalc(userAddress);
        if (score <= 0) {
            throw new Error("Score not found or invalid");
        }
        
        showSuccess("Sending transaction...");
        const tx = await contract.vote(score);
        
        showSuccess("Waiting for confirmation...");
        await tx.wait();
        
        showSuccess("Vote successful!");
        voteBtn.textContent = "Voted ✅";
        votingStatusEl.textContent = "Already voted";
        
        // Update user info after voting
        await updateUserInfo();
        
    } catch (error) {
        voteBtn.disabled = false;
        voteBtn.textContent = "Vote";
        showError(`Voting failed: ${error.message}`);
        debugLog(`Vote error: ${error.stack}`);
    }
}



function resetUI() {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect Wallet";
    voteBtn.disabled = true;
    voteBtn.textContent = "Vote";
    statusEl.textContent = "Connect your wallet to vote";
    statusEl.className = "";
    userInfoEl.style.display = "none";
    userAddress = null;
    provider = null;
    signer = null;
    contract = null;
}