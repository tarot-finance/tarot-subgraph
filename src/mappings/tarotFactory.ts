import { BigDecimal } from "@graphprotocol/graph-ts";
import { LendingPoolInitialized } from "../types/TarotFactory/TarotFactory";
import { TAROT_FACTORY_ADDRESS } from "./constants";
import {
  TarotFactory,
  LendingPool,
  Collateral,
  Borrowable
} from "../types/schema";
import {
  Borrowable as BorrowableTemplate,
  Collateral as CollateralTemplate
} from "../types/templates";
import { ONE_BD, ZERO_BD, loadOrCreatePair } from "./helpers";

export function handleLendingPoolInitialized(
  event: LendingPoolInitialized
): void {
  let tarotFactory = TarotFactory.load(TAROT_FACTORY_ADDRESS);
  if (tarotFactory === null) {
    tarotFactory = new TarotFactory(TAROT_FACTORY_ADDRESS);
    tarotFactory.totalBalanceUSD = ZERO_BD;
    tarotFactory.totalSupplyUSD = ZERO_BD;
    tarotFactory.totalBorrowsUSD = ZERO_BD;
  }
  tarotFactory.save();

  let pair = loadOrCreatePair(event.params.uniswapV2Pair);

  // collateral
  let collateral = new Collateral(event.params.collateral.toHexString());
  collateral.underlying = pair.id;
  collateral.totalBalance = ZERO_BD;
  collateral.safetyMargin = BigDecimal.fromString("2.5");
  collateral.liquidationIncentive = BigDecimal.fromString("1.04");
  collateral.exchangeRate = ONE_BD;
  collateral.totalBalanceUSD = ZERO_BD;

  // borrowable
  let borrowable0 = new Borrowable(event.params.borrowable0.toHexString());
  let borrowable1 = new Borrowable(event.params.borrowable1.toHexString());

  borrowable0.underlying = pair.token0;
  borrowable0.totalBalance = ZERO_BD;
  borrowable0.totalBorrows = ZERO_BD;
  borrowable0.borrowRate = ZERO_BD;
  borrowable0.reserveFactor = BigDecimal.fromString("0.1");
  borrowable0.kinkBorrowRate = BigDecimal.fromString("0.1");
  borrowable0.kinkUtilizationRate = BigDecimal.fromString("0.7");
  borrowable0.borrowIndex = ONE_BD;
  borrowable0.accrualTimestamp = event.block.timestamp;
  borrowable0.exchangeRate = ONE_BD;
  borrowable0.totalBalanceUSD = ZERO_BD;
  borrowable0.totalSupplyUSD = ZERO_BD;
  borrowable0.totalBorrowsUSD = ZERO_BD;

  borrowable1.underlying = pair.token1;
  borrowable1.totalBalance = ZERO_BD;
  borrowable1.totalBorrows = ZERO_BD;
  borrowable1.borrowRate = ZERO_BD;
  borrowable1.reserveFactor = BigDecimal.fromString("0.1");
  borrowable1.kinkBorrowRate = BigDecimal.fromString("0.1");
  borrowable1.kinkUtilizationRate = BigDecimal.fromString("0.7");
  borrowable1.borrowIndex = ONE_BD;
  borrowable1.accrualTimestamp = event.block.timestamp;
  borrowable1.exchangeRate = ONE_BD;
  borrowable1.totalBalanceUSD = ZERO_BD;
  borrowable1.totalSupplyUSD = ZERO_BD;
  borrowable1.totalBorrowsUSD = ZERO_BD;

  // lendingPool
  let lendingPool = new LendingPool(event.params.uniswapV2Pair.toHexString());
  lendingPool.pair = pair.id;
  lendingPool.collateral = collateral.id;
  lendingPool.borrowable0 = borrowable0.id;
  lendingPool.borrowable1 = borrowable1.id;
  lendingPool.totalBalanceUSD = ZERO_BD;
  lendingPool.totalSupplyUSD = ZERO_BD;
  lendingPool.totalBorrowsUSD = ZERO_BD;

  collateral.lendingPool = lendingPool.id;
  borrowable0.lendingPool = lendingPool.id;
  borrowable1.lendingPool = lendingPool.id;

  // save
  collateral.save();
  borrowable0.save();
  borrowable1.save();
  lendingPool.save();

  // create the tracked contract based on the template
  CollateralTemplate.create(event.params.collateral);
  BorrowableTemplate.create(event.params.borrowable0);
  BorrowableTemplate.create(event.params.borrowable1);
}
