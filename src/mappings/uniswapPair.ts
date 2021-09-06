import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { Pair, Token } from "../types/schema";
import { UniswapFactory as UniswapFactoryContract } from "../types/TarotFactory/UniswapFactory";
import { UniswapRouter as UniswapRouterContract } from "../types/TarotFactory/UniswapRouter";
import {
  Pair as PairContract,
  Sync as Sync1
} from "../types/templates/Pair/Pair";
import {
  VaultToken as VaultTokenContract,
  Sync as Sync2
} from "../types/templates/VaultToken/VaultToken";
import { getEthPriceInUSD, findEthPerToken } from "./pricing";
import {
  convertTokenToDecimal,
  ONE_BI,
  ZERO_BD,
  BI_18,
  ZERO_BI
} from "./helpers";

export function handleSync1(event: Sync1): void {
  if (event.block.number.lt(BigInt.fromI32(12000000))) {
    return;
  }
  let pair = Pair.load(event.address.toHex()) as Pair;
  let pairContract = PairContract.bind(event.address);
  let uniswapFactoryAddress = pairContract.factory();
  let uniswapFactory = UniswapFactoryContract.bind(uniswapFactoryAddress);
  let reserves = pairContract.getReserves();
  let totalSupply = pairContract.totalSupply();
  _handleSync(
    uniswapFactory,
    pair,
    reserves.value0,
    reserves.value1,
    totalSupply
  );
}

export function handleSync2(event: Sync2): void {
  if (event.block.number.lt(BigInt.fromI32(12000000))) {
    return;
  }
  let pair = Pair.load(event.address.toHex()) as Pair;
  let vaultTokenContract = VaultTokenContract.bind(event.address);
  let uniswapRouterAddress = vaultTokenContract.router();
  let uniswapRouter = UniswapRouterContract.bind(uniswapRouterAddress);
  let uniswapFactoryAddress = uniswapRouter.factory();
  let uniswapFactory = UniswapFactoryContract.bind(uniswapFactoryAddress);
  let reserve0 = ZERO_BI;
  let reserve1 = ZERO_BI;
  let reservesResult = vaultTokenContract.try_getReserves();
  if (!reservesResult.reverted) {
    reserve0 = reservesResult.value.value0;
    reserve1 = reservesResult.value.value1;
  }
  let totalSupply = vaultTokenContract.totalSupply();
  _handleSync(uniswapFactory, pair, reserve0, reserve1, totalSupply);
}

function _handleSync(
  uniswapFactoryContract: UniswapFactoryContract,
  pair: Pair,
  reserve0: BigInt,
  reserve1: BigInt,
  totalSupply: BigInt
): void {
  pair.syncCount = pair.syncCount.plus(ONE_BI);

  let token0 = Token.load(pair.token0);
  let token1 = Token.load(pair.token1);

  // faster sync
  //pair.save();
  /*
  if (
    (pair.syncCount as i32) % 500 !== 1 &&
    token0.derivedUSD.notEqual(ZERO_BD) &&
    token1.derivedUSD.notEqual(ZERO_BD) &&
    pair.derivedUSD.notEqual(ZERO_BD) &&
    pair.totalSupply.notEqual(ZERO_BD)
  )
    return;
  */

  pair.reserve0 = convertTokenToDecimal(reserve0, token0.decimals);
  pair.reserve1 = convertTokenToDecimal(reserve1, token1.decimals);

  if (pair.reserve1.notEqual(ZERO_BD))
    pair.token0Price = pair.reserve0.div(pair.reserve1);
  else pair.token0Price = ZERO_BD;
  if (pair.reserve0.notEqual(ZERO_BD))
    pair.token1Price = pair.reserve1.div(pair.reserve0);
  else pair.token1Price = ZERO_BD;

  pair.save();

  let ethPrice = getEthPriceInUSD(uniswapFactoryContract);

  token0.derivedETH = findEthPerToken(uniswapFactoryContract, token0 as Token);
  token1.derivedETH = findEthPerToken(uniswapFactoryContract, token1 as Token);
  token0.derivedUSD = token0.derivedETH.times(ethPrice);
  token1.derivedUSD = token1.derivedETH.times(ethPrice);
  token0.save();
  token1.save();

  // use derived amounts within pair
  pair.reserveETH = pair.reserve0
    .times(token0.derivedETH as BigDecimal)
    .plus(pair.reserve1.times(token1.derivedETH as BigDecimal));
  pair.reserveUSD = pair.reserveETH.times(ethPrice);
  pair.save();

  // update total supply
  pair.totalSupply = convertTokenToDecimal(totalSupply, BI_18);
  pair.save();

  // update LP price
  if (pair.totalSupply.notEqual(ZERO_BD))
    pair.derivedETH = pair.reserveETH.div(pair.totalSupply);
  else pair.derivedETH = ZERO_BD;
  if (pair.totalSupply.notEqual(ZERO_BD))
    pair.derivedUSD = pair.reserveUSD.div(pair.totalSupply);
  else pair.derivedUSD = ZERO_BD;

  // save entities
  pair.save();
  token0.save();
  token1.save();

  // update lendingPool usd values
  //updateLendingPoolUSD(pair.id);
}
