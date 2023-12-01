import React, { useEffect, useState } from "react";
import { VenomConnect } from "venom-connect";
import { Address, ProviderRpcClient } from "everscale-inpage-provider";

// we will user bignumber library to operate with deposit values (remember about decimals multiply)
import BigNumber from "bignumber.js";

// Importing of our contract ABI from smart-contract build action. Of cource we need ABI for contracts calls.
import stakingAbi from "../abi/Staking.abi.json";
import tokenRootAbi from "../abi/TokenRoot.abi.json";
import tokenWalletAbi from "../abi/TokenWallet.abi.json";

import AddTokenImg from "../styles/img/add_token.svg";

type Props = {
  balance: string | undefined;
  getBalance: (wallet: string) => void;
  venomConnect: VenomConnect | undefined;
  address: string | undefined;
  provider: ProviderRpcClient | undefined;
};

function StakingForm({ venomConnect, address, provider }: Props) {
  const [tokenAmount, setTokenAmount] = useState<number | undefined>();
  const [stakingContract, setStakingContract] = useState<any>();
  const [tokenRootContract, setTokenRootContract] = useState<any>();
  const [tokenWalletContract, setTokenWalletContract] = useState<any>();
  const [tvl, setTvl] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [stakingAddress, setStakingAddress] = useState("0:0372833938b0d03d53428563e6f970cc5cc808323a5ba93ec9a0ebd8d4690b47");
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const onChangeAmount = (e: string) => {
    if (e === "") setTokenAmount(undefined);
    setTokenAmount(Number(e));
  };

  useEffect(()=> {
    if(provider) {
      const contractAddress = new Address(stakingAddress); // Our Staking contract address
      const contractInstance = new provider.Contract(stakingAbi, contractAddress);
      setStakingContract(contractInstance);

      const tokenRootAddress = new Address("0:4e73ec103bc5c4998e7d92473fdd17ee7d4941fd681f07f6610085119a90ce1c"); // Our token root address
      const tokenRootInstance = new provider.Contract(tokenRootAbi, tokenRootAddress);
      setTokenRootContract(tokenRootInstance);
    }
  }, [provider])

  useEffect(()=> {
    if(provider && address && tokenRootContract) {
      (async() => {
        try {
          const tokenWalletAddress = (await tokenRootContract.methods.walletOf({answerId: 0, walletOwner: address}).call()).value0;
          const tokenWalletInstance = new provider.Contract(tokenWalletAbi, tokenWalletAddress);
          setTokenWalletContract(tokenWalletInstance);
        } catch (error) {
          console.log(error)
        }
      })();
    }
  }, [provider, address, tokenRootContract])
  
  const getStakingInfo = async () => {
    try {
      const { value0 } = await stakingContract.methods
      .getStakedInfo({staker: address})
      .call({});
      setStakedAmount(parseFloat(value0.amount)/(10**9));
      setClaimedAmount(parseFloat(value0.claimedAmount)/(10**9));
      const { totalStakedAmount } = await stakingContract.methods
      .totalStakedAmount({})
      .call({});
      setTvl(parseFloat(totalStakedAmount)/(10**9));
      const tokenBal = await tokenWalletContract.methods.balance({answerId: 0} as never).call();
      setTokenBalance(parseFloat((tokenBal.value0/(10**9)).toFixed(2)));
    } catch (error) {
      console.log(error, "GREAT")
    }
  }

  useEffect(()=> {
    if(stakingContract && address) {
      getStakingInfo();
    }
  }, [stakingContract, address])
  

  // handler that helps us to ask user about adding our token to the user's venom wallet
  const onTokenAdd = () => {
    console.log(provider?.addAsset({
      account: new Address(address as string), // user's wallet address
      params: {
        rootContract: new Address("0:91470b9a77ada682c9f9aee5ae0a4e2ea549ee51f7b0f2cba5182ffec2eb233f"), // TokenRoot address
      },
      type: "tip3_token", // tip3 - is a standart we use
    }))
  }

  const claimTokens = async () => {
    if(!stakingContract || !address) return;
    try {
      setIsClaiming(true);
      const result = await stakingContract.methods
        .claim({})
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully claimed token!");
        setIsClaiming(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsClaiming(false);
      console.error(e);
    }
  }

  const stakeTokens = async () => {
    if (!venomConnect || !address || !tokenAmount || !provider || !tokenWalletContract) return;
    const amount = new BigNumber(tokenAmount).multipliedBy(10 ** 9).toString(); // Contract"s rate parameter is 1 venom = 10 tokens
    try {
      setIsStaking(true);
      const result = await tokenWalletContract.methods
        .transfer({
          amount,
          recipient: stakingAddress,
          deployWalletValue: "0",
          remainingGasTo: address,
          notify: true,
          payload: null
        })
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully staked token!");
        setIsStaking(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsStaking(false);
      console.error(e);
    }
  };
  const unstakeTokens = async () => {
    if (!venomConnect || !address || !tokenAmount || !provider || !tokenWalletContract) return;
    const amount = new BigNumber(tokenAmount).multipliedBy(10 ** 9).toString(); // Contract"s rate parameter is 1 venom = 10 tokens
    try {
      setIsUnstaking(true);
      const result = await stakingContract.methods
        .unstake({amount:amount})
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully unstaked token!");
        setIsUnstaking(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsUnstaking(false);
      console.error(e);
    }
  };
  return (
    <>
      <h1>Stake & Claim VenomPumpy</h1>
      <div className="tvl_apy">
        <div className="item-info">
          <div style={{textAlign:"center"}}>
            <b>TVL</b><br />
            <b>{tvl}</b>
          </div>
          <div style={{textAlign:"center"}}>
            <b>APY</b><br />
            <b>{"50%"}</b>
          </div>
        </div>
      </div>
      <div className="balance">
        <div className="item-info item-info-balance">
          <div style={{textAlign:"center", fontSize: 30}}>
            <b>{tokenBalance}</b><br />
            <b style={{fontSize: 17}}>VenomPumpy Owned</b>
          </div>
        </div>
      </div>
      <div className="staked_reward">
        <div className="item-info">
          <div style={{textAlign:"center"}}>
            <b>STAKED</b><br />
            <b>{stakedAmount}</b>
          </div>
          <div style={{textAlign:"center"}}>
            <b>REWARD</b><br />
            <b>{claimedAmount}</b>
          </div>
        </div>
      </div>
      <div className="number">
        <input
          type="number"
          min={0}
          value={tokenAmount !== undefined ? tokenAmount : ""}
          style={{textAlign: "right"}}
          placeholder="Enter amount to stake or unstake"
          onChange={(e) => {
            onChangeAmount(e.target.value);
          }}
        />
      </div>
      <div className="card__amount">
        <a className={(!tokenAmount || isStaking ) ? "btn disabled" : "btn"} onClick={stakeTokens}>
          Stake
        </a>
        <a className={(!tokenAmount || tokenAmount>=stakedAmount) || isUnstaking ? "btn btn btn_unstake disabled" : "btn btn_unstake"} onClick={unstakeTokens}>
          Unstake
        </a>
      </div>
      <div className="card__amount">
        <a className={isClaiming || stakedAmount==0 ? "btn btn_claim disabled" : "btn btn_claim"} onClick={claimTokens}>
          Claim
        </a>
      </div>
    </>
  );
}

export default StakingForm;
