import { Address } from "@graphprotocol/graph-ts";
import { Advance } from "../types/templates/FarmingPool/FarmingPool";
import { FarmingPool } from "../types/schema";
import {
  convertTokenToDecimal,
  BI_18,
  fetchDistributorSharePercentage
} from "./helpers";

export function handleAdvance(event: Advance): void {
  let farmingPool = FarmingPool.load(event.address.toHexString());
  farmingPool.epochAmount = convertTokenToDecimal(
    event.params.epochAmount,
    BI_18
  );
  farmingPool.epochBegin = event.params.epochBegin;
  farmingPool.sharePercentage = fetchDistributorSharePercentage(
    Address.fromString(farmingPool.distributor),
    Address.fromString(farmingPool.id)
  );
  farmingPool.save();
}
