import { BigNumber } from '@ethersproject/bignumber'
import { TransactionResponse } from '@ethersproject/providers'
import { Currency, currencyEquals, ETHER, TokenAmount, WETH } from '@uniswap/sdk'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Plus } from 'react-feather'
import ReactGA from 'react-ga'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'rebass'
import styled, {useTheme} from 'styled-components'
import { ButtonError, ButtonLight, ButtonPrimary } from '../Button'
import { BlueCard, GreyCard, LightCard } from '../Card'
import { AutoColumn, ColumnCenter } from '../Column'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../TransactionConfirmationModal'
import CurrencyInputPanel from '../CurrencyInputPanel'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AddRemoveTabs } from '../NavigationTabs'
import { MinimalPositionCard } from '../PositionCard'
import Row, { RowBetween, RowFlat } from '../Row'
import ThemeProvider, { FixedGlobalStyle, ThemedGlobalStyle } from '../theme'

import { ROUTER_ADDRESS } from '../constants'
import { PairState } from '../data/Reserves'
import { useActiveWeb3React } from '../hooks'
import { useCurrency } from '../hooks/Tokens'
import { ApprovalState, useApproveCallback } from '../hooks/useApproveCallback'
import { useWalletModalToggle } from '../state/application/hooks'
import { MintField } from '../../../util/types'
import { useDerivedMintInfo, useMintActionHandlers, useMintState } from '../state/mint/hooks'

import { useTransactionAdder } from '../state/transactions/hooks'
import { useIsExpertMode, useUserDeadline, useUserSlippageTolerance } from '../state/user/hooks'
import { TYPE } from '../theme'
import { calculateGasMargin, calculateSlippageAmount, getRouterContract } from '../utils'
import { maxAmountSpend } from '../utils/maxAmountSpend'
import { wrappedCurrency } from '../utils/wrappedCurrency'
import AppBody from '../AppBody'
import { Dots, Wrapper } from '../Pool/styleds'
import { ConfirmAddModalBottom } from './ConfirmAddModalBottom'
import { currencyId } from '../utils/currencyId'
import { PoolPriceBar } from './PoolPriceBar'

import {InjectedConnector} from "@web3-react/injected-connector";
import {Web3Provider} from "@ethersproject/providers";
import {useWeb3React} from "@web3-react/core";
import { Theme } from '../../../themes/commons'

const injectedConnector = new InjectedConnector({
    supportedChainIds: [
        1, // Mainet
        3, // Ropsten
        4, // Rinkeby
        5, // Goerli
        42, // Kovan
    ],
})


const InputPanelsWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-top: 2rem;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        flex-direction: column;
      `};
  `

export default function AddLiquidity({
  match: {
    params: { currencyIdA, currencyIdB }
  },
  history
}: RouteComponentProps<{ currencyIdA?: string; currencyIdB?: string }>) {
  const { chainId, account, activate, active, library } = useWeb3React<Web3Provider>()

  useEffect(() => {
      if ( !account ) {
          activate(injectedConnector)
      }
  });

  const theme = useTheme()

  const currencyA = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)

  const oneCurrencyIsWETH = Boolean(
    chainId &&
      ((currencyA && currencyEquals(currencyA, WETH[chainId])) ||
        (currencyB && currencyEquals(currencyB, WETH[chainId])))
  )

  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const expertMode = useIsExpertMode()

  // mint state
  const { independentField, typedValue, otherTypedValue } = useMintState()
  const {
    dependentField,
    currencies,
    pair,
    pairState,
    currencyBalances,
    parsedAmounts,
    price,
    noLiquidity,
    liquidityMinted,
    poolTokenPercentage,
    error
  } = useDerivedMintInfo(currencyA ?? undefined, currencyB ?? undefined)
  const { onFieldAInput, onFieldBInput } = useMintActionHandlers(noLiquidity)

  const isValid = !error

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // txn values
  const [deadline] = useUserDeadline() // custom from users settings
  const [allowedSlippage] = useUserSlippageTolerance() // custom from users
  const [txHash, setTxHash] = useState<string>('')

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: noLiquidity ? otherTypedValue : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
  }

  // get the max amounts user can add
  const maxAmounts: { [field in MintField]?: TokenAmount } = [MintField.CURRENCY_A, MintField.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field])
      }
    },
    {}
  )

  const atMaxAmounts: { [field in MintField]?: TokenAmount } = [MintField.CURRENCY_A, MintField.CURRENCY_B].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0')
      }
    },
    {}
  )

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(parsedAmounts[MintField.CURRENCY_A], ROUTER_ADDRESS)
  const [approvalB, approveBCallback] = useApproveCallback(parsedAmounts[MintField.CURRENCY_B], ROUTER_ADDRESS)

  const addTransaction = useTransactionAdder()

  async function onAdd() {
    if (!chainId || !library || !account) return
    const router = getRouterContract(chainId, library, account)

    const { [MintField.CURRENCY_A]: parsedAmountA, [MintField.CURRENCY_B]: parsedAmountB } = parsedAmounts
    if (!parsedAmountA || !parsedAmountB || !currencyA || !currencyB) {
      return
    }

    const amountsMin = {
      [MintField.CURRENCY_A]: calculateSlippageAmount(parsedAmountA, noLiquidity ? 0 : allowedSlippage)[0],
      [MintField.CURRENCY_B]: calculateSlippageAmount(parsedAmountB, noLiquidity ? 0 : allowedSlippage)[0]
    }

    const deadlineFromNow = Math.ceil(Date.now() / 1000) + deadline

    let estimate,
      method: (...args: any) => Promise<TransactionResponse>,
      args: Array<string | string[] | number>,
      value: BigNumber | null
    if (currencyA === ETHER || currencyB === ETHER) {
      const tokenBIsETH = currencyB === ETHER
      estimate = router.estimateGas.addLiquidityETH
      method = router.addLiquidityETH
      args = [
        wrappedCurrency(tokenBIsETH ? currencyA : currencyB, chainId)?.address ?? '', // token
        (tokenBIsETH ? parsedAmountA : parsedAmountB).raw.toString(), // token desired
        amountsMin[tokenBIsETH ? MintField.CURRENCY_A : MintField.CURRENCY_B].toString(), // token min
        amountsMin[tokenBIsETH ? MintField.CURRENCY_B : MintField.CURRENCY_A].toString(), // eth min
        account,
        deadlineFromNow
      ]
      value = BigNumber.from((tokenBIsETH ? parsedAmountB : parsedAmountA).raw.toString())
    } else {
      estimate = router.estimateGas.addLiquidity
      method = router.addLiquidity
      args = [
        wrappedCurrency(currencyA, chainId)?.address ?? '',
        wrappedCurrency(currencyB, chainId)?.address ?? '',
        parsedAmountA.raw.toString(),
        parsedAmountB.raw.toString(),
        amountsMin[MintField.CURRENCY_A].toString(),
        amountsMin[MintField.CURRENCY_B].toString(),
        account,
        deadlineFromNow
      ]
      value = null
    }

    setAttemptingTxn(true)
    await estimate(...args, value ? { value } : {})
      .then(estimatedGasLimit =>
        method(...args, {
          ...(value ? { value } : {}),
          gasLimit: calculateGasMargin(estimatedGasLimit)
        }).then(response => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary:
              'Add ' +
              parsedAmounts[MintField.CURRENCY_A]?.toSignificant(3) +
              ' ' +
              currencies[MintField.CURRENCY_A]?.symbol +
              ' and ' +
              parsedAmounts[MintField.CURRENCY_B]?.toSignificant(3) +
              ' ' +
              currencies[MintField.CURRENCY_B]?.symbol
          })

          setTxHash(response.hash)

          ReactGA.event({
            category: 'Liquidity',
            action: 'Add',
            label: [currencies[MintField.CURRENCY_A]?.symbol, currencies[MintField.CURRENCY_B]?.symbol].join('/')
          })
        })
      )
      .catch(error => {
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  const modalHeader = () => {
    return noLiquidity ? (
      <AutoColumn gap="20px">
        <LightCard mt="20px" borderRadius="20px">
          <RowFlat>
            <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
              {currencies[MintField.CURRENCY_A]?.symbol + '/' + currencies[MintField.CURRENCY_B]?.symbol}
            </Text>
            <DoubleCurrencyLogo
              currency0={currencies[MintField.CURRENCY_A]}
              currency1={currencies[MintField.CURRENCY_B]}
              size={30}
            />
          </RowFlat>
        </LightCard>
      </AutoColumn>
    ) : (
      <AutoColumn gap="20px">
        <RowFlat style={{ marginTop: '20px' }}>
          <Text fontSize="48px" fontWeight={500} lineHeight="42px" marginRight={10}>
            {liquidityMinted?.toSignificant(6)}
          </Text>
          <DoubleCurrencyLogo
            currency0={currencies[MintField.CURRENCY_A]}
            currency1={currencies[MintField.CURRENCY_B]}
            size={30}
          />
        </RowFlat>
        <Row>
          <Text fontSize="24px">
            {currencies[MintField.CURRENCY_A]?.symbol + '/' + currencies[MintField.CURRENCY_B]?.symbol + ' Pool Tokens'}
          </Text>
        </Row>
        <TYPE.italic fontSize={12} textAlign="left" padding={'8px 0 0 0 '}>
          {`Output is estimated. If the price changes by more than ${allowedSlippage /
            100}% your transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  const modalBottom = () => {
    return (
      <ConfirmAddModalBottom
        price={price}
        currencies={currencies}
        parsedAmounts={parsedAmounts}
        noLiquidity={noLiquidity}
        onAdd={onAdd}
        poolTokenPercentage={poolTokenPercentage}
      />
    )
  }

  const pendingText = `Supplying ${parsedAmounts[MintField.CURRENCY_A]?.toSignificant(6)} ${
    currencies[MintField.CURRENCY_A]?.symbol
  } and ${parsedAmounts[MintField.CURRENCY_B]?.toSignificant(6)} ${currencies[MintField.CURRENCY_B]?.symbol}`

  const handleCurrencyASelect = useCallback(
    (currencyA: Currency) => {
      const newCurrencyIdA = currencyId(currencyA)
      if (newCurrencyIdA === currencyIdB) {
        history.push(`/pool/add/${currencyIdB}/${currencyIdA}`)
      } else {
        history.push(`/pool/add/${newCurrencyIdA}/${currencyIdB}`)
      }
    },
    [currencyIdB, history, currencyIdA]
  )
  const handleCurrencyBSelect = useCallback(
    (currencyB: Currency) => {
      const newCurrencyIdB = currencyId(currencyB)
      if (currencyIdA === newCurrencyIdB) {
        if (currencyIdB) {
          history.push(`/pool/add/${currencyIdB}/${newCurrencyIdB}`)
        } else {
          history.push(`/pool/add/${newCurrencyIdB}`)
        }
      } else {
        history.push(`/pool/add/${currencyIdA ? currencyIdA : 'ETH'}/${newCurrencyIdB}`)
      }
    },
    [currencyIdA, history, currencyIdB]
  )

  const ButtonWrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  `

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
    }
    setTxHash('')
  }, [onFieldAInput, txHash])

  return (
    <>
      <AppBody>
        <Wrapper id="add-liquidity-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '75%' }}>
          <AddRemoveTabs adding={true} />
          <Wrapper>
            <TransactionConfirmationModal
              isOpen={showConfirm}
              onDismiss={handleDismissConfirmation}
              attemptingTxn={attemptingTxn}
              hash={txHash}
              content={() => (
                <ConfirmationModalContent
                  title={noLiquidity ? 'You are creating a pool' : 'You will receive'}
                  onDismiss={handleDismissConfirmation}
                  topContent={modalHeader}
                  bottomContent={modalBottom}
                />
              )}
              pendingText={pendingText}
            />
            <AutoColumn gap="20px">
              {noLiquidity && (
                <ColumnCenter>
                  <BlueCard>
                    <AutoColumn gap="10px">
                      <TYPE.link fontWeight={600} color={'primaryText1'}>
                        You are the first liquidity provider.
                      </TYPE.link>
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        The ratio of tokens you add will set the price of this pool.
                      </TYPE.link>
                      <TYPE.link fontWeight={400} color={'primaryText1'}>
                        Once you are happy with the rate click supply to review.
                      </TYPE.link>
                    </AutoColumn>
                  </BlueCard>
                </ColumnCenter>
              )}
              <InputPanelsWrapper>
                <CurrencyInputPanel
                  value={formattedAmounts[MintField.CURRENCY_A]}
                  onUserInput={onFieldAInput}
                  onMax={() => {
                    onFieldAInput(maxAmounts[MintField.CURRENCY_A]?.toExact() ?? '')
                  }}
                  onCurrencySelect={handleCurrencyASelect}
                  showMaxButton={!atMaxAmounts[MintField.CURRENCY_A]}
                  currency={currencies[MintField.CURRENCY_A]}
                  side='left'
                  id="add-liquidity-input-tokena"
                  showCommonBases
                />
                <Plus size="16"  style={{ margin: '2rem' }} />
                <CurrencyInputPanel
                  value={formattedAmounts[MintField.CURRENCY_B]}
                  onUserInput={onFieldBInput}
                  onCurrencySelect={handleCurrencyBSelect}
                  onMax={() => {
                    onFieldBInput(maxAmounts[MintField.CURRENCY_B]?.toExact() ?? '')
                  }}
                  showMaxButton={!atMaxAmounts[MintField.CURRENCY_B]}
                  currency={currencies[MintField.CURRENCY_B]}
                  side='right'
                  id="add-liquidity-input-tokenb"
                  showCommonBases
                />
              </InputPanelsWrapper>
              {currencies[MintField.CURRENCY_A] && currencies[MintField.CURRENCY_B] && pairState !== PairState.INVALID && (
                <>
                  <GreyCard padding="0px" borderRadius={'20px'}>
                    <RowBetween padding="1rem">
                      <TYPE.subHeader fontWeight={500} fontSize={14}>
                        {noLiquidity ? 'Initial prices' : 'Prices'} and pool share
                      </TYPE.subHeader>
                    </RowBetween>{' '}
                    <LightCard padding="1rem" borderRadius={'20px'}>
                      <PoolPriceBar
                        currencies={currencies}
                        poolTokenPercentage={poolTokenPercentage}
                        noLiquidity={noLiquidity}
                        price={price}
                      />
                    </LightCard>
                  </GreyCard>
                </>
              )}

              <ButtonWrapper>
                {!account ? (
                  <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
                ) : (
                  <AutoColumn gap={'md'}>
                    {(approvalA === ApprovalState.NOT_APPROVED ||
                      approvalA === ApprovalState.PENDING ||
                      approvalB === ApprovalState.NOT_APPROVED ||
                      approvalB === ApprovalState.PENDING) &&
                      isValid && (
                        <RowBetween>
                          {approvalA !== ApprovalState.APPROVED && (
                            <ButtonPrimary
                              onClick={approveACallback}
                              disabled={approvalA === ApprovalState.PENDING}
                              width={approvalB !== ApprovalState.APPROVED ? '48%' : '100%'}
                            >
                              {approvalA === ApprovalState.PENDING ? (
                                <Dots>Approving {currencies[MintField.CURRENCY_A]?.symbol}</Dots>
                              ) : (
                                'Approve ' + currencies[MintField.CURRENCY_A]?.symbol
                              )}
                            </ButtonPrimary>
                          )}
                          {approvalB !== ApprovalState.APPROVED && (
                            <ButtonPrimary
                              onClick={approveBCallback}
                              disabled={approvalB === ApprovalState.PENDING}
                              width={approvalA !== ApprovalState.APPROVED ? '48%' : '100%'}
                            >
                              {approvalB === ApprovalState.PENDING ? (
                                <Dots>Approving {currencies[MintField.CURRENCY_B]?.symbol}</Dots>
                              ) : (
                                'Approve ' + currencies[MintField.CURRENCY_B]?.symbol
                              )}
                            </ButtonPrimary>
                          )}
                        </RowBetween>
                      )}
                    <ButtonError
                      onClick={() => {
                        expertMode ? onAdd() : setShowConfirm(true)
                      }}
                      disabled={!isValid || approvalA !== ApprovalState.APPROVED || approvalB !== ApprovalState.APPROVED}
                      error={!isValid && !!parsedAmounts[MintField.CURRENCY_A] && !!parsedAmounts[MintField.CURRENCY_B]}
                    >
                      <Text fontSize={20} fontWeight={500}>
                        {error ?? 'Supply'}
                      </Text>
                    </ButtonError>
                  </AutoColumn>
                )}
              </ButtonWrapper>
            </AutoColumn>
          </Wrapper>
        </Wrapper>
      </AppBody>

      {pair && !noLiquidity && pairState !== PairState.INVALID ? (
        <AutoColumn style={{ minWidth: '20rem', marginTop: '1rem' }}>
          <MinimalPositionCard showUnwrapped={oneCurrencyIsWETH} pair={pair} />
        </AutoColumn>
      ) : null}

    </>
  )
}
