import { StrategyRegistry } from "./StrategyRegistry.mjs";
import { NewsSentimentStrategy } from "./NewsSentimentStrategy.mjs";
import { ReactivityMomentumStrategy } from "./ReactivityMomentumStrategy.mjs";

export const defaultRegistry = new StrategyRegistry();
export const newsStrategy = new NewsSentimentStrategy();
export const momentumStrategy = new ReactivityMomentumStrategy();

defaultRegistry.register(newsStrategy);
defaultRegistry.register(momentumStrategy);

export {
  StrategyRegistry,
  NewsSentimentStrategy,
  ReactivityMomentumStrategy,
};
