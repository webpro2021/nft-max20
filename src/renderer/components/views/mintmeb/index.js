import { useEffect, useState } from "react";
import {
  connectWallet,
  getCurrentWalletConnected,
} from "../../../../utils/interact";
import {chainId, contractAddress, ownerAddress} from '../../../../constants/address';
import { ethers } from 'ethers'
import Web3 from "web3";
import { toast, ToastContainer } from 'react-toastify'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'

const Minter = () => {
  const [walletAddress, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [balance, setBalance] = useState(0)

  const [mintLoading, setMintLoading] = useState(false)
  const [bearNumber, setBearNumber] = useState(1)
  const [currentTotal, setCurrentTotal] = useState(0)
  const [mintedNew, setMintedNew] = useState(false)
  const [mintedId, setMintedId] = useState("")

  useEffect(async () => {
    const { address, status } = await getCurrentWalletConnected();
    addWalletListener();

    window.web3 = new Web3(window.ethereum)
    const contractABI = require("../../../../constants/contract-abi.json")
    const contract = new window.web3.eth.Contract(contractABI, contractAddress)
    
    const totalSupply = await contract.methods.totalSupply().call()
    setCurrentTotal(totalSupply)
    setWallet(address);
    setStatus(status);
    if(address) {
      const walletBalance = await window.web3.eth.getBalance(address.toLowerCase())
      setBalance(walletBalance)
    }
  }, []);

  const addWalletListener = () => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          window.web3 = new Web3(window.ethereum)
          window.web3.eth.getBalance(accounts[0].toLowerCase()).then(res => {
            setBalance(res)
          })
          setStatus("👆🏽 You can mint new pack now.");
        } else {
          setWallet("");
          setBalance(0)
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
    window.web3 = new Web3(window.ethereum)
    if(walletResponse.address) {
      const walletBalance = await window.web3.eth.getBalance(walletResponse.address.toLowerCase())
      setBalance(walletBalance)
    } else {
      setBalance(0)
    }
    const contractABI = require("../../../../constants/contract-abi.json")
    const contract = new window.web3.eth.Contract(contractABI, contractAddress)

    const totalSupply = await contract.methods.totalSupply().call()
    setCurrentTotal(totalSupply)
  };

  const onMintPressed = async () => {
    setMintLoading(true)

    const contractABI = require("../../../../constants/contract-abi.json")
    window.web3 = new Web3(window.ethereum)
    const contract = new window.web3.eth.Contract(contractABI, contractAddress)

    const totalSupply = await contract.methods.totalSupply().call()
    setCurrentTotal(totalSupply)

    if((10000 - totalSupply) < bearNumber) {
      alert("mint number must be lower than limit")
      setMintLoading(false)
      return
    }

    if(bearNumber === 0) {
      setMintLoading(false)
      return
    }

    var mintArr = []
    var tokenURI = []
    var pinataResponseArr = []
    if(bearNumber > 20) {
      alert('max mint number is 20')
      setMintLoading(false)
      return
    }

    if(walletAddress.toLocaleLowerCase() === ownerAddress.toLocaleLowerCase()) {
      var currentOwnerSupply = await contract.methods.ownerSupply().call()
      var numm = parseInt(currentOwnerSupply) + 1
      for(var j=numm ; j< numm+bearNumber; j++) {
        mintArr.push(j)
        var pinataResponsee = getMultiHash(j)
        pinataResponseArr.push(pinataResponsee)
      }
    } else {
      for(var i=0; i< bearNumber; i++) {
        var num = getRndInteger(500, 10000) //getRndInteger(500, 10000)
        var ImgStatus = await contract.methods.ImgStatus(num).call()
  
        if (!ImgStatus && !mintArr.includes(num)) {
          mintArr.push(num)
        } else {
          num = getRndInteger(500, 10000) //getRndInteger(500, 10000)
          ImgStatus = await contract.methods.ImgStatus(num).call()
  
          while(ImgStatus || mintArr.includes(num)) {
            num = getRndInteger(500, 10000) //getRndInteger(500, 10000)
            ImgStatus = await contract.methods.ImgStatus(num).call()
          }
          mintArr.push(num)
        }
        var pinataResponse = getMultiHash(num)
        pinataResponseArr.push(pinataResponse)
      }
    }

    tokenURI = pinataResponseArr
    console.log(mintArr);
    console.log(tokenURI);
    
    const price = await contract.methods.price(bearNumber).call()
    const amountIn = ethers.BigNumber.from(price.toString()).toHexString();

    let ABI = ["function mintPack(string[] memory tokenURI, uint256[] memory mintedImg)"]
    let iface = new ethers.utils.Interface(ABI)
    let dataParam = iface.encodeFunctionData("mintPack", [ tokenURI, mintArr])

    var transactionParameters = {}
    if(walletAddress.toLocaleLowerCase() === ownerAddress.toLocaleLowerCase()) {
      transactionParameters = {
        to: contractAddress, // Required except during contract publications.
        from: walletAddress, // must match user's active address.
        data: dataParam,
      }
    } else {
      transactionParameters = {
        to: contractAddress, // Required except during contract publications.
        from: walletAddress, // must match user's active address.
        data: dataParam,
        value: amountIn,
      }
    }

    contract.events.MintPack({toblock: 'latest'}, async (error, event) => {
      const totalSupply = await contract.methods.totalSupply().call()
      setCurrentTotal(totalSupply)
      const walletBalance = await window.web3.eth.getBalance(walletAddress  .toLowerCase())
      setBalance(walletBalance)
      toast.info('Minted successfully', {
        position: "top-center",
        autoClose: 3000,
        // hideProgressBar: true,
      })
      var mintedNum = ""
      for(var i=bearNumber-1; i >= 0; i--) {
        mintedNum += totalSupply - i
        mintedNum += ', '
      }

      setMintedId(mintedNum.substring(0, mintedNum.length - 2))
      setMintedNew(true)
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

  const getRndInteger = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
  }

  return (
    <>
      <div className="walletConnect">
        <button id="walletButton" onClick={connectWalletPressed} className="butn">
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
            <h2>Eth Balance <span style={{float: "right"}}>{(balance/1e18).toFixed(4)} ETH </span></h2>
          </div>
            <h2 style={{textAlign: 'center'}}>
              <span style={{float: "left"}}>Amount</span>
              <span>
                <input type="button" className="incDecButton" value="-" onClick={() => (bearNumber > 1) && setBearNumber(bearNumber - 1)} />
                {bearNumber}
                <input type="button" className="incDecButton" value="+" onClick={() => (bearNumber < 20) && setBearNumber(bearNumber + 1)} />
              </span>
              <input type="button" className="maxButton" style={{float: "right"}} value="MAX" onClick={() => setBearNumber(20)} />
            </h2>
          </div>
          <div style={{padding: '10px 0px'}}>
            <h2>Total Balance <span style={{float: "right"}}>{(0.1 * bearNumber).toFixed(1)} ETH </span></h2>
          </div>
          {mintedNew && <div style={{padding: '10px 0px'}}>
            <h2>New Meb ID <span style={{float: "right"}}>{mintedId}</span></h2>
          </div>
          }
          {/* <p>Max mint number is 20...</p> */}
          { mintLoading?
            "Loading.."
            :
            <button id="mintButton" onClick={onMintPressed} className="butn2 btn-custom-button">
              Mint
            </button>
          }
        
          <br></br>

          <p />

          <p id="status" style={{ color: "white" }}>
            {status}
          </p>
        </div>
      </div>
      <ToastContainer pauseOnFocusLoss={false} />
    </>
  );
};

export default Minter;