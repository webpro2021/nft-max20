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
  const [csvData, setCsvData] = useState([])
  const [bearNumber, setBearNumber] = useState(0)
  const [individualNum, setIndividualNum] = useState(0)
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

    try {
      window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      })
      .then(async(data)=>{
      
        contract.on("MintPack(address,uint256)", async(to, newId) => {
          setMintLoading(false)
          if ( to === ethers.utils.getAddress(walletAddress) ) {
            let tokenId = ethers.BigNumber.from(newId).toNumber()
            setNewMint([tokenId])
          }
        })
        const totalSupply = await contract.methods.totalSupply().call()
        setCurrentTotal(totalSupply)
        setBearNumber()
      })
      .catch(async(error) => {
        const totalSupply = await contract.methods.totalSupply().call()
        setCurrentTotal(totalSupply)
        setMintLoading(false)
      })
    } catch (error) {
        setStatus("😥 Something went wrong: " + error.message)
        setMintLoading(false)
    }
  }

  return (
    <div className="Minter">
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

      <h2>Current Total is {currentTotal} of 30</h2>
      <input type="text" placeholder="Number to mint..." onChange={(e) => setBearNumber(parseInt(e.target.value))} />
      {/* <p>Max mint number is 20...</p> */}
      { mintLoading? 
        "Loading.."
        :
        <button id="mintButton" onClick={onMintPressed}>
          Mint NFT
        </button>
      }

     
      <br></br>

      <p />

      <p id="status" style={{ color: "red" }}>
        {status}
      </p>

      {/* <p />

      <WHONETFileReader handleSetCsvData={handleSetCsvData} />
      <p />
      <DataTable csvData={csvData}/> */}
    </div>
  );
};

export default Minter;