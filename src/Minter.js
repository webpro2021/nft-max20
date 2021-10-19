import { useEffect, useState } from "react";
import {
  connectWallet,
  getCurrentWalletConnected,
} from "./util/interact.js";
import {chainId, contractAddress} from './constants/address';
import { ethers } from 'ethers'
import Web3 from "web3";

const Minter = (props) => {
  const [walletAddress, setWallet] = useState("");
  const [status, setStatus] = useState("");

  const [mintLoading, setMintLoading] = useState(false)

  // const [metaData, setMetaData] = useState([])
  const [newMint, setNewMint] = useState([])
  const [bearNumber, setBearNumber] = useState(0)
  const [currentTotal, setCurrentTotal] = useState(0)

  useEffect(async () => {
    const { address, status } = await getCurrentWalletConnected();

    const contractABI = require("./contract-abi.json")
    window.web3 = new Web3(window.ethereum)
    const contract = new window.web3.eth.Contract(contractABI, contractAddress)

    const totalSupply = await contract.methods.totalSupply().call()
    setCurrentTotal(totalSupply)
    setWallet(address);
    setStatus(status);

    addWalletListener();
  }, []);

  function addWalletListener() {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          setStatus("👆🏽 You can mint new pack now.");
        } else {
          setWallet("");
          setStatus("🦊 Connect to Metamask using the top right button.");
        }
      });
      window.ethereum.on("chainChanged", (chain) => {
        connectWalletPressed()
        if (chain !== chainId) {
        }
      });
    } else {
      setStatus(
        <p>
          {" "}
          🦊{" "}
          {/* <a target="_blank" href={`https://metamask.io/download.html`}> */}
            You must install Metamask, a virtual Ethereum wallet, in your
            browser.(https://metamask.io/download.html)
          {/* </a> */}
        </p>
      );
    }
  }

  const getMultiHash = (j) => {
    return `${j}.json`
  }

  const connectWalletPressed = async () => {
    const walletResponse = await connectWallet();
    setStatus(walletResponse.status);
    setWallet(walletResponse.address);
  };

  const onMintPressed = async () => {
    setMintLoading(true)

    const contractABI = require("./contract-abi.json")
    window.web3 = new Web3(window.ethereum)
    const contract = new window.web3.eth.Contract(contractABI, contractAddress)

    const totalSupply = await contract.methods.totalSupply().call()
    setCurrentTotal(totalSupply)

    if((30 - totalSupply) < bearNumber) {
      alert("mint number must be lower than limit")
      setMintLoading(false)
      return
    }

    if(bearNumber === 0) {
      setMintLoading(false)
      return
    }

    var mintArr = []
    var pinataResponseArr = []
    if(bearNumber > 20) {
      alert('max mint number is 20')
      setMintLoading(false)
      return
    }

    console.log(bearNumber);

    for(var i=0; i< bearNumber; i++) {
      var num = parseInt(Math.random()* 30)
      var ImgStatus = await contract.methods.ImgStatus(num).call()

      if (!ImgStatus && !mintArr.includes(num) && num != 0) {
        mintArr.push(num)
      } else {
        num = parseInt(Math.random()* 30)
        ImgStatus = await contract.methods.ImgStatus(num).call()

        while(ImgStatus || mintArr.includes(num) || num == 0) {
          num = parseInt(Math.random()* 30)
          ImgStatus = await contract.methods.ImgStatus(num).call()
        }
        mintArr.push(num)
      }
      var pinataResponse = getMultiHash(num)
      pinataResponseArr.push(pinataResponse)
    }

    const tokenURI = pinataResponseArr
    console.log(mintArr);
    console.log(tokenURI);
    
    const price = await contract.methods.price(bearNumber).call()
    // const price = 1e14 * bearNumber
    const amountIn = ethers.BigNumber.from(price.toString()).toHexString();

    console.log(amountIn/ 1e18);

    let ABI = ["function mintPack(string[] memory tokenURI, uint256[] memory mintedImg)"]
    let iface = new ethers.utils.Interface(ABI)
    let dataParam = iface.encodeFunctionData("mintPack", [ tokenURI, mintArr])

    const transactionParameters = {
      to: contractAddress, // Required except during contract publications.
      from: walletAddress, // must match user's active address.
      data: dataParam,
      value: amountIn,
    }

    contract.events.MintPack({toblock: 'latest'}, async (error, event) => {
      const totalSupply = await contract.methods.totalSupply().call()
      setCurrentTotal(totalSupply)
    })

    try {
      window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      })
      .then(async(data)=>{
        contract.on("MintPack(address,uint256)", async(to, newId) => {
          setMintLoading(false)
          const totalSupply = await contract.methods.totalSupply().call()
          setCurrentTotal(totalSupply)
          if ( to === ethers.utils.getAddress(walletAddress) ) {
            let tokenId = ethers.BigNumber.from(newId).toNumber()
            setNewMint([tokenId])
          }
        })
        setBearNumber()
      })
      .catch(async(error) => {
        setMintLoading(false)
      })
    } catch (error) {
        setStatus("😥 Something went wrong: " + error.message)
        setMintLoading(false)
    }
  }

  return (
    <>
      <div className="walletConnect">
        <button id="walletButton" onClick={connectWalletPressed}>
            {walletAddress.length > 0 ? (
              "Connected: " +
              String(walletAddress).substring(0, 6) +
              "..." +
              String(walletAddress).substring(38)
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
      </div>

      <div className="Minter">
        <div>
          <h1>Mint</h1>
          <h2>Instant Reveal Dropping on 18th Oct at 2pm EST</h2>
          <h2>You'll be able to mint a maximum of 20 Llama Lottery NFTs</h2>
        </div>

        <div className="mintArea">
          <h2>Total Minted: {currentTotal} / 30</h2>
          <div className="progress">
            <span className="progress-bar" style={{width: `${currentTotal * 100 / 30}%`}}></span>
          </div>
          <div>
          <div style={{padding: '10px 0px'}}>
            <h2>ETH BALANCE <span style={{float: "right"}}>0 ETH </span></h2>
          </div>
            <h2 style={{textAlign: 'center'}}>
              <span style={{float: "left"}}>AMOUNT</span>
              <span>
                <input type="button" className="incDecButton" value="-" onClick={() => (bearNumber > 0) && setBearNumber(bearNumber - 1)} />
                {bearNumber}
                <input type="button" className="incDecButton" value="+" onClick={() => (bearNumber < 20) && setBearNumber(bearNumber + 1)} />
              </span>
              <input type="button" className="maxButton" style={{float: "right"}} value="MAX" onClick={() => setBearNumber(20)} />
            </h2>
          </div>
          <div style={{padding: '10px 0px'}}>
            <h2>TOTAL BALANCE <span style={{float: "right"}}>{(0.1 * bearNumber).toFixed(1)} ETH </span></h2>
          </div>
          {/* <p>Max mint number is 20...</p> */}
          { mintLoading?
            "Loading.."
            :
            <button id="mintButton" onClick={onMintPressed}>
              Mint
            </button>
          }

        
          <br></br>

          <p />

          <p id="status" style={{ color: "red" }}>
            {status}
          </p>
        </div>
      </div>
    </>
  );
};

export default Minter;