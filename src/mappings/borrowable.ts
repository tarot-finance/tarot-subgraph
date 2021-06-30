import { BigInt } from "@graphprotocol/graph-ts";
import {
  Sync,
  AccrueInterest,
  Borrow,
  Liquidate,
  CalculateKinkBorrowRate,
  CalculateBorrowRate,
  NewReserveFactor,
  NewKinkUtilizationRate,
  NewBorrowTracker,
  Transfer
} from "../types/templates/Borrowable/Borrowable";
import { Borrowable, Token, FarmingPool } from "../types/schema";
import { FarmingPool as FarmingPoolTemplate } from "../types/templates";
import {
  convertTokenToDecimal,
  BI_18,
  ADDRESS_ZERO,
  updateLendingPoolUSD,
  fetchBorrowableExchangeRate,
  fetchFarmingPoolClaimable,
  fetchFarmingPoolEpochAmount,
  fetchFarmingPoolEpochBegin,
  fetchFarmingPoolSegmentLength,
  fetchFarmingPoolVestingBegin,
  fetchDistributorSharePercentage,
  loadOrCreateDistributor,
  loadOrCreateSupplyPosition,
  loadOrCreateBorrowPosition
} from "./helpers";

function getDecimals(borrowable: Borrowable | null): BigInt {
  return Token.load(borrowable.underlying).decimals;
}

export function handleSync(event: Sync): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.totalBalance = convertTokenToDecimal(
    event.params.totalBalance,
    getDecimals(borrowable)
  );
  borrowable.exchangeRate = fetchBorrowableExchangeRate(event.address);
  borrowable.save();
  updateLendingPoolUSD(borrowable.lendingPool);
}

export function handleAccrueInterest(event: AccrueInterest): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.totalBorrows = convertTokenToDecimal(
    event.params.totalBorrows,
    getDecimals(borrowable)
  );
  borrowable.borrowIndex = convertTokenToDecimal(
    event.params.borrowIndex,
    BI_18
  );
  borrowable.accrualTimestamp = event.block.timestamp;
  borrowable.save();
}

export function handleBorrow(event: Borrow): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.totalBorrows = convertTokenToDecimal(
    event.params.totalBorrows,
    getDecimals(borrowable)
  );
  borrowable.save();

  let borrowPosition = loadOrCreateBorrowPosition(
    event.address,
    event.params.borrower
  );
  borrowPosition.borrowBalance = convertTokenToDecimal(
    event.params.accountBorrows,
    getDecimals(borrowable)
  );
  borrowPosition.borrowIndex = borrowable.borrowIndex;
  borrowPosition.save();
}

export function handleLiquidate(event: Liquidate): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.totalBorrows = convertTokenToDecimal(
    event.params.totalBorrows,
    getDecimals(borrowable)
  );
  borrowable.save();

  let borrowPosition = loadOrCreateBorrowPosition(
    event.address,
    event.params.borrower
  );
  borrowPosition.borrowBalance = convertTokenToDecimal(
    event.params.accountBorrows,
    getDecimals(borrowable)
  );
  borrowPosition.borrowIndex = borrowable.borrowIndex;
  borrowPosition.save();
}

export function handleCalculateKinkBorrowRate(
  event: CalculateKinkBorrowRate
): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.kinkBorrowRate = convertTokenToDecimal(
    event.params.kinkBorrowRate,
    BI_18
  );
  borrowable.save();
}

export function handleCalculateBorrowRate(event: CalculateBorrowRate): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.borrowRate = convertTokenToDecimal(event.params.borrowRate, BI_18);
  borrowable.save();
}

export function handleNewReserveFactor(event: NewReserveFactor): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.reserveFactor = convertTokenToDecimal(
    event.params.newReserveFactor,
    BI_18
  );
  borrowable.save();
}

export function handleNewKinkUtilizationRate(
  event: NewKinkUtilizationRate
): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.kinkUtilizationRate = convertTokenToDecimal(
    event.params.newKinkUtilizationRate,
    BI_18
  );
  borrowable.save();
}

export function handleNewBorrowTracker(event: NewBorrowTracker): void {
  let farmingPoolAddress = event.params.newBorrowTracker;
  let borrowable = Borrowable.load(event.address.toHexString());
  borrowable.farmingPool = farmingPoolAddress.toHexString();
  borrowable.save();
  if (farmingPoolAddress.toHexString() === ADDRESS_ZERO) return;
  let farmingPool = FarmingPool.load(farmingPoolAddress.toHexString());
  if (farmingPool === null) {
    let distributorAddress = fetchFarmingPoolClaimable(farmingPoolAddress);
    let distributor = loadOrCreateDistributor(distributorAddress);
    farmingPool = new FarmingPool(farmingPoolAddress.toHexString());
    farmingPool.borrowable = borrowable.id;
    farmingPool.distributor = distributor.id;
    farmingPool.epochAmount = fetchFarmingPoolEpochAmount(farmingPoolAddress);
    farmingPool.epochBegin = fetchFarmingPoolEpochBegin(farmingPoolAddress);
    farmingPool.segmentLength = fetchFarmingPoolSegmentLength(
      farmingPoolAddress
    );
    farmingPool.vestingBegin = fetchFarmingPoolVestingBegin(farmingPoolAddress);
    farmingPool.sharePercentage = fetchDistributorSharePercentage(
      distributorAddress,
      farmingPoolAddress
    );
    farmingPool.save();
    FarmingPoolTemplate.create(farmingPoolAddress);
  }
}

export function handleTransfer(event: Transfer): void {
  let borrowable = Borrowable.load(event.address.toHexString());
  let fromSupplyPosition = loadOrCreateSupplyPosition(
    event.address,
    event.params.from
  );
  let toSupplyPosition = loadOrCreateSupplyPosition(
    event.address,
    event.params.to
  );
  let value = convertTokenToDecimal(
    event.params.value,
    getDecimals(borrowable)
  );
  fromSupplyPosition.balance = fromSupplyPosition.balance.minus(value);
  toSupplyPosition.balance = toSupplyPosition.balance.plus(value);
  fromSupplyPosition.save();
  toSupplyPosition.save();
}
