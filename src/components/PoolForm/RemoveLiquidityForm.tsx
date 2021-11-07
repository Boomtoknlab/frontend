import { FC, Dispatch, SetStateAction } from "react";
import PoolFormSlider from "./PoolFormSlider";
import { onboard } from "utils";
import { useConnection } from "state/hooks";
import {
  RemoveAmount,
  RemovePercentButtonsWrapper,
  RemovePercentButton,
  RemoveFormButton,
  RemoveFormButtonWrapper,
  FeesBlockWrapper,
  FeesBlock,
  FeesValues,
  FeesBoldInfo,
  FeesInfo,
  FeesPercent,
} from "./RemoveLiquidityForm.styles";
import { ethers } from "ethers";
import { toWeiSafe } from "utils/weiMath";
import { poolClient } from "state/poolsApi";
import { addEtherscan } from "utils/notify";
import * as umaSdk from "@uma/sdk";
import { formatUnits } from "utils";

const { previewRemoval } = umaSdk.across.clients.bridgePool;

const toBN = ethers.BigNumber.from;

interface Props {
  removeAmount: number;
  setRemoveAmount: Dispatch<SetStateAction<number>>;
  bridgeAddress: string;
  lpTokens: ethers.BigNumber;
  decimals: number;
  symbol: string;
  setShowSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  setDepositUrl: React.Dispatch<React.SetStateAction<string>>;
  balance: ethers.BigNumber;
  position: ethers.BigNumber;
  totalPosition: ethers.BigNumber;
  feesEarned: ethers.BigNumber;
  wrongNetwork?: boolean;
  // refetch balance
  refetchBalance: () => void;
}
const RemoveLiqudityForm: FC<Props> = ({
  removeAmount,
  setRemoveAmount,
  bridgeAddress,
  lpTokens,
  decimals,
  symbol,
  setShowSuccess,
  setDepositUrl,
  position,
  feesEarned,
  wrongNetwork,
  totalPosition,
}) => {
  const { init } = onboard;
  const { isConnected, provider, signer, notify } = useConnection();

  function buttonMessage() {
    if (!isConnected) return "Connect wallet";
    if (wrongNetwork) return "Switch to Ethereum Mainnet";
    return "Remove liquidity";
  }

  const handleButtonClick = async () => {
    if (!provider) {
      init();
    }
    if (isConnected && removeAmount > 0 && signer) {
      const scaler = toBN("10").pow(decimals);

      const removeAmountToWei = toWeiSafe(
        (removeAmount / 100).toString(),
        decimals
      );

      const weiAmount = lpTokens.mul(removeAmountToWei).div(scaler);

      try {
        let txId;
        if (symbol === "ETH") {
          txId = await poolClient.removeEthliquidity(
            signer,
            bridgeAddress,
            weiAmount
          );
        } else {
          txId = await poolClient.removeTokenLiquidity(
            signer,
            bridgeAddress,
            weiAmount
          );
        }
        const transaction = poolClient.getTx(txId);

        if (transaction.hash) {
          const { emitter } = notify.hash(transaction.hash);
          emitter.on("all", addEtherscan);

          emitter.on("txConfirmed", (tx) => {
            if (transaction.hash) notify.unsubscribe(transaction.hash);
            const url = `https://etherscan.io/tx/${transaction.hash}`;
            setShowSuccess(true);
            setDepositUrl(url);
          });
          emitter.on("txFailed", () => {
            if (transaction.hash) notify.unsubscribe(transaction.hash);
          });
        }
        return transaction;
      } catch (err) {
        console.error("err in RemoveLiquidity call", err);
      }
    }
  };

  const preview = isConnected
    ? previewRemoval(
        { totalDeposited: position, feesEarned, positionValue: totalPosition },
        removeAmount / 100
      )
    : null;

  return (
    <>
      <RemoveAmount>
        Amount: <span>{removeAmount}%</span>
      </RemoveAmount>
      <PoolFormSlider value={removeAmount} setValue={setRemoveAmount} />
      <RemovePercentButtonsWrapper>
        <RemovePercentButton onClick={() => setRemoveAmount(25)}>
          25%
        </RemovePercentButton>
        <RemovePercentButton onClick={() => setRemoveAmount(50)}>
          50%
        </RemovePercentButton>
        <RemovePercentButton onClick={() => setRemoveAmount(75)}>
          75%
        </RemovePercentButton>
        <RemovePercentButton onClick={() => setRemoveAmount(100)}>
          MAX
        </RemovePercentButton>
      </RemovePercentButtonsWrapper>

      {isConnected && (
        <>
          <FeesBlockWrapper>
            <FeesBlock>
              <FeesBoldInfo>
                Remove amount<FeesPercent>({removeAmount}%)</FeesPercent>
              </FeesBoldInfo>
              <FeesInfo>Left in pool</FeesInfo>
            </FeesBlock>
            <FeesBlock>
              <FeesValues>
                {preview && formatUnits(preview.position.recieve, decimals)}{" "}
                {symbol}
              </FeesValues>
              <FeesValues>
                {preview && formatUnits(preview.position.remain, decimals)}
                {symbol}
              </FeesValues>
            </FeesBlock>
          </FeesBlockWrapper>
          <FeesBlockWrapper>
            <FeesBlock>
              <FeesBoldInfo>Fees earned</FeesBoldInfo>
              <FeesInfo>Left in pool</FeesInfo>
            </FeesBlock>
            <FeesBlock>
              <FeesValues>
                {preview && formatUnits(preview.fees.recieve, decimals)}{" "}
                {symbol}
              </FeesValues>
              <FeesValues>
                {preview && formatUnits(preview.fees.remain, decimals)} {symbol}
              </FeesValues>
            </FeesBlock>
          </FeesBlockWrapper>
          <FeesBlockWrapper>
            <FeesBlock>
              <FeesBoldInfo>You will get</FeesBoldInfo>
            </FeesBlock>
            <FeesBlock>
              <FeesValues>
                {preview && formatUnits(preview.total.recieve, decimals)}
                {symbol}
              </FeesValues>
            </FeesBlock>
          </FeesBlockWrapper>
        </>
      )}
      <RemoveFormButtonWrapper>
        <RemoveFormButton onClick={handleButtonClick} disabled={wrongNetwork}>
          {buttonMessage()}
        </RemoveFormButton>
      </RemoveFormButtonWrapper>
    </>
  );
};

export default RemoveLiqudityForm;
