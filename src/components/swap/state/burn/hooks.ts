import { Currency, CurrencyAmount, JSBI, Pair, Percent, TokenAmount } from '@uniswap/sdk'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePair } from '../../data/Reserves'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { wrappedCurrency } from '../../utils/wrappedCurrency'
import { AppDispatch, AppState } from '../../../../store'
import { tryParseAmount } from '../swap/hooks'
import { useTokenBalances } from '../wallet/hooks'
import { typeInput } from './actions'
import {useTranslation} from "react-i18next";
import { BurnField } from "../../../../util/types"

export function useBurnState(): AppState['burn'] {
  return useSelector<AppState, AppState['burn']>(state => state.burn)
}

export function useDerivedBurnInfo(
  currencyA: Currency | undefined,
  currencyB: Currency | undefined
): {
  pair?: Pair | null
  parsedAmounts: {
    [BurnField.LIQUIDITY_PERCENT]: Percent
    [BurnField.LIQUIDITY]?: TokenAmount
    [BurnField.CURRENCY_A]?: CurrencyAmount
    [BurnField.CURRENCY_B]?: CurrencyAmount
  }
  error?: string
} {
  const { t } = useTranslation()
  const { account, chainId } = useActiveWeb3React()

  const { independentField, typedValue } = useBurnState()

  // pair + totalsupply
  const [, pair] = usePair(currencyA, currencyB)

  // balances
  const relevantTokenBalances = useTokenBalances(account ?? undefined, [pair?.liquidityToken])
  const userLiquidity: undefined | TokenAmount = relevantTokenBalances?.[pair?.liquidityToken?.address ?? '']

  const [tokenA, tokenB] = [wrappedCurrency(currencyA, chainId), wrappedCurrency(currencyB, chainId)]
  const tokens = {
    [BurnField.CURRENCY_A]: tokenA,
    [BurnField.CURRENCY_B]: tokenB,
    [BurnField.LIQUIDITY]: pair?.liquidityToken
  }

  // liquidity values
  const totalSupply = useTotalSupply(pair?.liquidityToken)
  const liquidityValueA =
    pair &&
    totalSupply &&
    userLiquidity &&
    tokenA &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalSupply.raw, userLiquidity.raw)
      ? new TokenAmount(tokenA, pair.getLiquidityValue(tokenA, totalSupply, userLiquidity, false).raw)
      : undefined
  const liquidityValueB =
    pair &&
    totalSupply &&
    userLiquidity &&
    tokenB &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalSupply.raw, userLiquidity.raw)
      ? new TokenAmount(tokenB, pair.getLiquidityValue(tokenB, totalSupply, userLiquidity, false).raw)
      : undefined
  const liquidityValues: { [BurnField.CURRENCY_A]?: TokenAmount; [BurnField.CURRENCY_B]?: TokenAmount } = {
    [BurnField.CURRENCY_A]: liquidityValueA,
    [BurnField.CURRENCY_B]: liquidityValueB
  }

  let percentToRemove: Percent = new Percent('0', '100')
  // user specified a %
  if (independentField === BurnField.LIQUIDITY_PERCENT) {
    percentToRemove = new Percent(typedValue, '100')
  }
  // user specified a specific amount of liquidity tokens
  else if (independentField === BurnField.LIQUIDITY) {
    if (pair?.liquidityToken) {
      const independentAmount = tryParseAmount(typedValue, pair.liquidityToken)
      if (independentAmount && userLiquidity && !independentAmount.greaterThan(userLiquidity)) {
        percentToRemove = new Percent(independentAmount.raw, userLiquidity.raw)
      }
    }
  }
  // user specified a specific amount of token a or b
  else {
    if (tokens[independentField]) {
      const independentAmount = tryParseAmount(typedValue, tokens[independentField])
      const liquidityValue = liquidityValues[independentField]
      if (independentAmount && liquidityValue && !independentAmount.greaterThan(liquidityValue)) {
        percentToRemove = new Percent(independentAmount.raw, liquidityValue.raw)
      }
    }
  }

  const parsedAmounts: {
    [BurnField.LIQUIDITY_PERCENT]: Percent
    [BurnField.LIQUIDITY]?: TokenAmount
    [BurnField.CURRENCY_A]?: TokenAmount
    [BurnField.CURRENCY_B]?: TokenAmount
  } = {
    [BurnField.LIQUIDITY_PERCENT]: percentToRemove,
    [BurnField.LIQUIDITY]:
      userLiquidity && percentToRemove && percentToRemove.greaterThan('0')
        ? new TokenAmount(userLiquidity.token, percentToRemove.multiply(userLiquidity.raw).quotient)
        : undefined,
    [BurnField.CURRENCY_A]:
      tokenA && percentToRemove && percentToRemove.greaterThan('0') && liquidityValueA
        ? new TokenAmount(tokenA, percentToRemove.multiply(liquidityValueA.raw).quotient)
        : undefined,
    [BurnField.CURRENCY_B]:
      tokenB && percentToRemove && percentToRemove.greaterThan('0') && liquidityValueB
        ? new TokenAmount(tokenB, percentToRemove.multiply(liquidityValueB.raw).quotient)
        : undefined
  }

  let error: string | undefined
  if (!account) {
    error = 'Connect Wallet'
  }

  if (!parsedAmounts[BurnField.LIQUIDITY] || !parsedAmounts[BurnField.CURRENCY_A] || !parsedAmounts[BurnField.CURRENCY_B]) {
    error = error ?? 'Enter an amount' //t('enterAnAmount')
  }

  return { pair, parsedAmounts, error }
}

export function useBurnActionHandlers(): {
  onUserInput: (field: BurnField, typedValue: string) => void
} {
  const dispatch = useDispatch<AppDispatch>()

  const onUserInput = useCallback(
    (field: BurnField, typedValue: string) => {
      dispatch(typeInput({ field, typedValue }))
    },
    [dispatch]
  )

  return {
    onUserInput
  }
}
