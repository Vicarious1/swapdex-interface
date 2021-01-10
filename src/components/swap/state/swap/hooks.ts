import useENS from '../../hooks/useENS'
import { Version } from '../../hooks/useToggledVersion'
import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount, ETHER, JSBI, Token, TokenAmount, Trade } from '@uniswap/sdk'
import { ParsedQs } from 'qs'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useV1Trade } from '../../data/V1'
import { useActiveWeb3React } from '../../hooks'
import { useCurrency } from '../../hooks/Tokens'
import { useTradeExactIn, useTradeExactOut } from '../../hooks/Trades'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { AppDispatch, AppState } from '../../../../store'
import { useCurrencyBalances } from '../wallet/hooks'
import { replaceSwapState, selectCurrency, setRecipient, switchCurrencies, typeInput } from './actions'
import { SwapField, SwapState } from '../../../../util/types'

import useToggledVersion from '../../hooks/useToggledVersion'
import { useUserSlippageTolerance } from '../user/hooks'
import { computeSlippageAdjustedAmounts } from '../../utils/prices'
import {useTranslation} from "react-i18next";

export function useSwapState(): AppState['swap'] {
  return useSelector<AppState, AppState['swap']>(state => state.swap)
}

export function useSwapActionHandlers(): {
  onCurrencySelection: (field: SwapField, currency: Currency) => void
  onSwitchTokens: () => void
  onUserInput: (field: SwapField, typedValue: string) => void
  onChangeRecipient: (recipient: string | null) => void
} {
  const dispatch = useDispatch<AppDispatch>()
  const onCurrencySelection = useCallback(
    (field: SwapField, currency: Currency) => {
      dispatch(
        selectCurrency({
          field,
          currencyId: currency instanceof Token ? currency.address : currency === ETHER ? 'ETH' : ''
        })
      )
    },
    [dispatch]
  )

  const onSwitchTokens = useCallback(() => {
    dispatch(switchCurrencies())
  }, [dispatch])

  const onUserInput = useCallback(
    (field: SwapField, typedValue: string) => {
      dispatch(typeInput({ field, typedValue }))
    },
    [dispatch]
  )

  const onChangeRecipient = useCallback(
    (recipient: string | null) => {
      dispatch(setRecipient({ recipient }))
    },
    [dispatch]
  )

  return {
    onSwitchTokens,
    onCurrencySelection,
    onUserInput,
    onChangeRecipient
  }
}

// try to parse a user entered amount for a given token
export function tryParseAmount(value?: string, currency?: Currency): CurrencyAmount | undefined {
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    if (typedValueParsed !== '0') {
      return currency instanceof Token
        ? new TokenAmount(currency, JSBI.BigInt(typedValueParsed))
        : CurrencyAmount.ether(JSBI.BigInt(typedValueParsed))
    }
  } catch (error) {
    // should fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error)
  }
  // necessary for all paths to return a value
  return undefined
}

const BAD_RECIPIENT_ADDRESSES: string[] = [
  '0xdfcc3668a5d426114270ee57206e98c6856f3dee', // v2 factory
  '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a', // v2 router 01
  '0x1d5acecb24c4992bff42e6220ded64b4d45fbca0' // v2 router 02
]

/**
 * Returns true if any of the pairs or tokens in a trade have the given checksummed address
 * @param trade to check for the given address
 * @param checksummedAddress address to check in the pairs and tokens
 */
function involvesAddress(trade: Trade, checksummedAddress: string): boolean {
  return (
    trade.route.path.some(token => token.address === checksummedAddress) ||
    trade.route.pairs.some(pair => pair.liquidityToken.address === checksummedAddress)
  )
}

// from the current swap inputs, compute the best trade and return it.
export function useDerivedSwapInfo(): {
  currencies: { [field in SwapField]?: Currency }
  currencyBalances: { [field in SwapField]?: CurrencyAmount }
  parsedAmount: CurrencyAmount | undefined
  v2Trade: Trade | undefined
  inputError?: string
  v1Trade: Trade | undefined
} {
  const { t } = useTranslation()
  const { account } = useActiveWeb3React()

  const toggledVersion = useToggledVersion()

  const {
    independentField,
    typedValue,
    [SwapField.INPUT]: { currencyId: inputCurrencyId },
    [SwapField.OUTPUT]: { currencyId: outputCurrencyId },
    recipient
  } = useSwapState()

  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)
  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const relevantTokenBalances = useCurrencyBalances(account ?? undefined, [
    inputCurrency ?? undefined,
    outputCurrency ?? undefined
  ])

  const isExactIn: boolean = independentField === SwapField.INPUT
  const parsedAmount = tryParseAmount(typedValue, (isExactIn ? inputCurrency : outputCurrency) ?? undefined)

  const bestTradeExactIn = useTradeExactIn(isExactIn ? parsedAmount : undefined, outputCurrency ?? undefined)
  const bestTradeExactOut = useTradeExactOut(inputCurrency ?? undefined, !isExactIn ? parsedAmount : undefined)

  const v2Trade = isExactIn ? bestTradeExactIn : bestTradeExactOut

  const currencyBalances = {
    [SwapField.INPUT]: relevantTokenBalances[0],
    [SwapField.OUTPUT]: relevantTokenBalances[1]
  }

  const currencies: { [field in SwapField]?: Currency } = {
    [SwapField.INPUT]: inputCurrency ?? undefined,
    [SwapField.OUTPUT]: outputCurrency ?? undefined
  }

  // get link to trade on v1, if a better rate exists
  const v1Trade = useV1Trade(isExactIn, currencies[SwapField.INPUT], currencies[SwapField.OUTPUT], parsedAmount)

  let inputError: string | undefined
  if (!account) {
    inputError = 'Connect Wallet'
  }

  if (!parsedAmount) {
    inputError = inputError ?? 'Enter an amount' // t('enterAnAmount')
  }

  if (!currencies[SwapField.INPUT] || !currencies[SwapField.OUTPUT]) {
    inputError = inputError ?? 'Select a token'
  }

  const formattedTo = isAddress(to)
  if (!to || !formattedTo) {
    inputError = inputError ?? 'Enter a recipient'
  } else {
    if (
      BAD_RECIPIENT_ADDRESSES.indexOf(formattedTo) !== -1 ||
      (bestTradeExactIn && involvesAddress(bestTradeExactIn, formattedTo)) ||
      (bestTradeExactOut && involvesAddress(bestTradeExactOut, formattedTo))
    ) {
      inputError = inputError ?? 'Invalid recipient'
    }
  }

  const [allowedSlippage] = useUserSlippageTolerance()

  const slippageAdjustedAmounts = v2Trade && allowedSlippage && computeSlippageAdjustedAmounts(v2Trade, allowedSlippage)

  const slippageAdjustedAmountsV1 =
    v1Trade && allowedSlippage && computeSlippageAdjustedAmounts(v1Trade, allowedSlippage)

  // compare input balance to max input based on version
  const [balanceIn, amountIn] = [
    currencyBalances[SwapField.INPUT],
    toggledVersion === Version.v1
      ? slippageAdjustedAmountsV1
        ? slippageAdjustedAmountsV1[SwapField.INPUT]
        : null
      : slippageAdjustedAmounts
      ? slippageAdjustedAmounts[SwapField.INPUT]
      : null
  ]

  if (balanceIn && amountIn && balanceIn.lessThan(amountIn)) {
    inputError = 'Insufficient ' + amountIn.currency.symbol + ' balance'
  }

  return {
    currencies,
    currencyBalances,
    parsedAmount,
    v2Trade: v2Trade ?? undefined,
    inputError,
    v1Trade
  }
}

function parseCurrencyFromURLParameter(urlParam: any): string {
  if (typeof urlParam === 'string') {
    const valid = isAddress(urlParam)
    if (valid) return valid
    if (urlParam.toUpperCase() === 'ETH') return 'ETH'
    if (valid === false) return 'ETH'
  }
  return 'ETH' ?? ''
}

function parseTokenAmountURLParameter(urlParam: any): string {
  return typeof urlParam === 'string' && !isNaN(parseFloat(urlParam)) ? urlParam : ''
}

function parseIndependentFieldURLParameter(urlParam: any): SwapField {
  return typeof urlParam === 'string' && urlParam.toLowerCase() === 'output' ? SwapField.OUTPUT : SwapField.INPUT
}

const ENS_NAME_REGEX = /^[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)?$/
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
function validatedRecipient(recipient: any): string | null {
  if (typeof recipient !== 'string') return null
  const address = isAddress(recipient)
  if (address) return address
  if (ENS_NAME_REGEX.test(recipient)) return recipient
  if (ADDRESS_REGEX.test(recipient)) return recipient
  return null
}

export function queryParametersToSwapState(parsedQs: ParsedQs): SwapState {
  let inputCurrency = parseCurrencyFromURLParameter(parsedQs.inputCurrency)
  let outputCurrency = parseCurrencyFromURLParameter(parsedQs.outputCurrency)
  if (inputCurrency === outputCurrency) {
    if (typeof parsedQs.outputCurrency === 'string') {
      inputCurrency = ''
    } else {
      outputCurrency = ''
    }
  }

  const recipient = validatedRecipient(parsedQs.recipient)

  return {
    [SwapField.INPUT]: {
      currencyId: inputCurrency
    },
    [SwapField.OUTPUT]: {
      currencyId: outputCurrency
    },
    typedValue: parseTokenAmountURLParameter(parsedQs.exactAmount),
    independentField: parseIndependentFieldURLParameter(parsedQs.exactField),
    recipient
  }
}

// updates the swap state to use the defaults for a given network
export function useDefaultsFromURLSearch():
  | { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined }
  | undefined {
  const { chainId } = useActiveWeb3React()
  const dispatch = useDispatch<AppDispatch>()
  const parsedQs = useParsedQueryString()
  const [result, setResult] = useState<
    { inputCurrencyId: string | undefined; outputCurrencyId: string | undefined } | undefined
  >()

  useEffect(() => {
    if (!chainId) return
    const parsed = queryParametersToSwapState(parsedQs)

    dispatch(
      replaceSwapState({
        typedValue: parsed.typedValue,
        field: parsed.independentField,
        inputCurrencyId: parsed[SwapField.INPUT].currencyId,
        outputCurrencyId: parsed[SwapField.OUTPUT].currencyId,
        recipient: parsed.recipient
      })
    )

    setResult({ inputCurrencyId: parsed[SwapField.INPUT].currencyId, outputCurrencyId: parsed[SwapField.OUTPUT].currencyId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, chainId])

  return result
}
