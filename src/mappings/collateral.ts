import {
  Sync,
  NewSafetyMargin,
  NewLiquidationIncentive,
  Transfer
} from "../types/templates/Collateral/Collateral";
import { Collateral } from "../types/schema";
import {
  convertTokenToDecimal,
  BI_18,
  fetchCollateralExchangeRate,
  updateLendingPoolUSD,
  loadOrCreateCollateralPosition
} from "./helpers";

export function handleSync(event: Sync): void {
  let collateral = Collateral.load(event.address.toHexString());
  collateral.totalBalance = convertTokenToDecimal(
    event.params.totalBalance,
    BI_18
  );
  collateral.exchangeRate = fetchCollateralExchangeRate(event.address);
  collateral.save();
  updateLendingPoolUSD(collateral.lendingPool);
}

export function handleNewSafetyMargin(event: NewSafetyMargin): void {
  let collateral = Collateral.load(event.address.toHexString());
  let safetyMarginSqrt = convertTokenToDecimal(
    event.params.newSafetyMarginSqrt,
    BI_18
  );
  collateral.safetyMargin = safetyMarginSqrt.times(safetyMarginSqrt);
  collateral.save();
}

export function handleNewLiquidationIncentive(
  event: NewLiquidationIncentive
): void {
  let collateral = Collateral.load(event.address.toHexString());
  collateral.liquidationIncentive = convertTokenToDecimal(
    event.params.newLiquidationIncentive,
    BI_18
  );
  collateral.save();
}

export function handleTransfer(event: Transfer): void {
  let fromCollateralPosition = loadOrCreateCollateralPosition(
    event.address,
    event.params.from
  );
  let toCollateralPosition = loadOrCreateCollateralPosition(
    event.address,
    event.params.to
  );
  let value = convertTokenToDecimal(event.params.value, BI_18);
  fromCollateralPosition.balance = fromCollateralPosition.balance.minus(value);
  toCollateralPosition.balance = toCollateralPosition.balance.plus(value);
  fromCollateralPosition.save();
  toCollateralPosition.save();
}
