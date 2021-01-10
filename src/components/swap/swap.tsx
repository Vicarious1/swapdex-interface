import {INITIAL_ALLOWED_SLIPPAGE} from './constants'
import {MarketBuySwapQuote, MarketSellSwapQuote} from '@0x/asset-swapper';
import {BigNumber} from '@0x/utils';
import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {connect, useDispatch, useSelector} from 'react-redux';
import {useLocation} from 'react-router';
import styled, {useTheme} from 'styled-components';
import {isMobile} from "react-device-detect";
import ReactGA from 'react-ga'
import {Text} from 'rebass'
import {ArrowDown} from 'react-feather'
import {CurrencyAmount, JSBI, Token, Trade} from '@uniswap/sdk'

import {ButtonError, ButtonLight, ButtonPrimary, ButtonConfirmed} from './Button'
import Modal from "./Modal";
import Loader from './Loader';
import SwapCircle from './assets/svg/swap-page-circle.svg'
import Logo from './assets/images/logo-white.png'
import AddressInputPanel from './AddressInputPanel';
import Card, {GreyCard} from './Card'
import {AutoColumn} from './Column'
import ConfirmSwapModal from './ConfirmSwapModal'
import CurrencyInputPanel from './CurrencyInputPanel'
import {SwapPoolTabs} from './NavigationTabs'
import {AutoRow, RowBetween} from './Row'
import {AdvancedSwapDetails} from "./AdvancedSwapDetails";
import confirmPriceImpactWithoutFee from './confirmPriceImpactWithoutFee'
import SlippageMenu from "./SlippageMenu";
import {ArrowWrapper, BottomGrouping, SwapCallbackError, Wrapper} from './styleds'
import TradePrice from './TradePrice'
import TokenWarningModal from './TokenWarningModal'
import ProgressSteps from './ProgressSteps'
import {useExpertModeManager, useUserDeadline, useUserSlippageTolerance} from './state/user/hooks'
import {useCurrency} from './hooks/Tokens'
import useENSAddress from './hooks/useENSAddress'
import {useSwapCallback} from './hooks/useSwapCallback'
import useToggledVersion, {Version} from './hooks/useToggledVersion'
import {ClickableText} from './Pool/styleds'
import {
    useDefaultsFromURLSearch,
    useDerivedSwapInfo,
    useSwapActionHandlers,
    useSwapState
} from './state/hooks'
import {ApprovalState, useApproveCallbackFromTrade} from './hooks/useApproveCallback'
import useWrapCallback, {WrapType} from './hooks/useWrapCallback'
import {SwapField} from '../../util/types'
import {useToggleSettingsMenu, useWalletModalToggle} from './state/application/hooks'
import {LinkStyledButton, TYPE} from './theme'

import {maxAmountSpend} from './utils/maxAmountSpend'
import {computeTradePriceBreakdown, warningSeverity} from './utils/prices'

import {getTradeVersion} from './data/V1'
import {InjectedConnector} from "@web3-react/injected-connector";
import {Web3Provider} from "@ethersproject/providers";
import {useWeb3React} from "@web3-react/core";

const injectedConnector = new InjectedConnector({
    supportedChainIds: [
        1, // Mainet
        3, // Ropsten
        4, // Rinkeby
        5, // Goerli
        42, // Kovan
    ],
})

const InputPanelWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;

    ${({theme}) => theme.mediaWidth.upToMedium`
      flex-direction: column;
    `};
  `;

export default function Swap() {
    const loadedUrlParams = useDefaultsFromURLSearch();

    // token warning stuff
    const [loadedInputCurrency, loadedOutputCurrency] = [
        useCurrency(loadedUrlParams?.inputCurrencyId),
        useCurrency(loadedUrlParams?.outputCurrencyId)
    ]
    const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
    const urlLoadedTokens: Token[] = useMemo(
        () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c instanceof Token) ?? [],
        [loadedInputCurrency, loadedOutputCurrency]
    )
    const handleConfirmTokenWarning = useCallback(() => {
        setDismissTokenWarning(true)
    }, [])

    const theme = useTheme();

    const { chainId, account, activate, active } = useWeb3React<Web3Provider>()
    
    useEffect(() => {
        if ( !account ) {
            activate(injectedConnector)
        }
    });

    // toggle wallet when disconnected
    const toggleWalletModal = useWalletModalToggle()

    // for expert mode
    const toggleSettings = useToggleSettingsMenu()
    const [isExpertMode] = useExpertModeManager()

    // get custom setting values for user
    const [deadline, setDeadline] = useUserDeadline()
    const [allowedSlippage, setUserslippageTolerance] = useUserSlippageTolerance()

    // swap state
    const {independentField, typedValue, recipient} = useSwapState()
    const {
        v1Trade,
        v2Trade,
        currencyBalances,
        parsedAmount,
        currencies,
        inputError: swapInputError
    } = useDerivedSwapInfo()
    const {wrapType, execute: onWrap, inputError: wrapInputError} = useWrapCallback(
        currencies[SwapField.INPUT],
        currencies[SwapField.OUTPUT],
        typedValue
    )
    const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
    const {address: recipientAddress} = useENSAddress(recipient)
    const toggledVersion = useToggledVersion()
    const trade = showWrap
        ? undefined
        : {
            [Version.v1]: v1Trade,
            [Version.v2]: v2Trade
        }[toggledVersion]

    const parsedAmounts = showWrap
        ? {
            [SwapField.INPUT]: parsedAmount,
            [SwapField.OUTPUT]: parsedAmount
        }
        : {
            [SwapField.INPUT]: independentField === SwapField.INPUT ? parsedAmount : trade?.inputAmount,
            [SwapField.OUTPUT]: independentField === SwapField.OUTPUT ? parsedAmount : trade?.outputAmount
        }

    const {onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient} = useSwapActionHandlers()
    const isValid = !swapInputError
    const dependentField: SwapField = independentField === SwapField.INPUT ? SwapField.OUTPUT : SwapField.INPUT

    const handleTypeInput = useCallback(
        (value: string) => {
            onUserInput(SwapField.INPUT, value)
        },
        [onUserInput]
    )
    const handleTypeOutput = useCallback(
        (value: string) => {
            onUserInput(SwapField.OUTPUT, value)
        },
        [onUserInput]
    )

    // modal and loading
    const [{showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash}, setSwapState] = useState<{
        showConfirm: boolean
        tradeToConfirm: Trade | undefined
        attemptingTxn: boolean
        swapErrorMessage: string | undefined
        txHash: string | undefined
    }>({
        showConfirm: false,
        tradeToConfirm: undefined,
        attemptingTxn: false,
        swapErrorMessage: undefined,
        txHash: undefined
    })

    const formattedAmounts = {
        [independentField]: typedValue,
        [dependentField]: showWrap
            ? parsedAmounts[independentField]?.toExact() ?? ''
            : parsedAmounts[dependentField]?.toSignificant(6) ?? ''
    }

    const route = trade?.route
    const userHasSpecifiedInputOutput = Boolean(
        currencies[SwapField.INPUT] && currencies[SwapField.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
    )
    const noRoute = !route

    // check whether the user has approved the router on the input token
    const [approval, approveCallback] = useApproveCallbackFromTrade(trade, allowedSlippage)

    // check if user has gone through approval process, used to show two step buttons, reset on token change
    const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

    // mark when a user has submitted an approval, reset onTokenSelection for input field
    useEffect(() => {
        if (approval === ApprovalState.PENDING) {
            setApprovalSubmitted(true)
        }
    }, [approval, approvalSubmitted])

    const maxAmountInput: CurrencyAmount | undefined = maxAmountSpend(currencyBalances[SwapField.INPUT])
    const atMaxAmountInput = Boolean(maxAmountInput && parsedAmounts[SwapField.INPUT]?.equalTo(maxAmountInput))

    // the callback to execute the swap
    const {callback: swapCallback, error: swapCallbackError} = useSwapCallback(
        trade,
        allowedSlippage,
        deadline,
        recipient
    )

    const {priceImpactWithoutFee} = computeTradePriceBreakdown(trade)

    const handleSwap = useCallback(() => {
        if (priceImpactWithoutFee && !confirmPriceImpactWithoutFee(priceImpactWithoutFee)) {
            return
        }
        if (!swapCallback) {
            return
        }
        setSwapState({attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined})
        swapCallback()
            .then(hash => {
                setSwapState({
                    attemptingTxn: false,
                    tradeToConfirm,
                    showConfirm,
                    swapErrorMessage: undefined,
                    txHash: hash
                })

                ReactGA.event({
                    category: 'Swap',
                    action:
                        recipient === null
                            ? 'Swap w/o Send'
                            : (recipientAddress ?? recipient) === account
                            ? 'Swap w/o Send + recipient'
                            : 'Swap w/ Send',
                    label: [
                        trade?.inputAmount?.currency?.symbol,
                        trade?.outputAmount?.currency?.symbol,
                        getTradeVersion(trade)
                    ].join('/')
                })
            })
            .catch(error => {
                setSwapState({
                    attemptingTxn: false,
                    tradeToConfirm,
                    showConfirm,
                    swapErrorMessage: error.message,
                    txHash: undefined
                })
            })
    }, [tradeToConfirm, account, priceImpactWithoutFee, recipient, recipientAddress, showConfirm, swapCallback, trade])

    // errors
    const [showInverted, setShowInverted] = useState<boolean>(false)

    // warnings on slippage
    const priceImpactSeverity = warningSeverity(priceImpactWithoutFee)

    // show approve flow when: no error on inputs, not approved or pending, or approved in current session
    // never show if price impact is above threshold in non expert mode
    const showApproveFlow =
        !swapInputError &&
        (approval === ApprovalState.NOT_APPROVED ||
            approval === ApprovalState.PENDING ||
            (approvalSubmitted && approval === ApprovalState.APPROVED)) &&
        !(priceImpactSeverity > 3 && !isExpertMode)

    const handleConfirmDismiss = useCallback(() => {
        setSwapState({showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash})
        // if there was a tx hash, we want to clear the input
        if (txHash) {
            onUserInput(SwapField.INPUT, '')
        }
    }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

    const handleAcceptChanges = useCallback(() => {
        setSwapState({tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm})
    }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

    const handleInputSelect = useCallback(
        inputCurrency => {
            setApprovalSubmitted(false) // reset 2 step UI for approvals
            onCurrencySelection(SwapField.INPUT, inputCurrency)
        },
        [onCurrencySelection]
    )

    const handleMaxInput = useCallback(() => {
        maxAmountInput && onUserInput(SwapField.INPUT, maxAmountInput.toExact())
    }, [maxAmountInput, onUserInput])

    const handleOutputSelect = useCallback(outputCurrency => onCurrencySelection(SwapField.OUTPUT, outputCurrency), [
        onCurrencySelection
    ])

    const [modalOpen, setModalOpen] = useState(false)

    const handleDismissTransactionDetails = useCallback(() => {
        setModalOpen(false)
    }, [setModalOpen])

    const RoundedWrapper = styled.div`
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 100px 100px 0 0;
    background-color: ${props => props.theme.componentsTheme.swapCardBackgroundColor};
    width: 150px;
    height: 80px;
    margin-top: -4rem;
    z-index: 3;
    position: relative;
    -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
    -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
    box-shadow: -10px -8px 10px rgba(0, 0, 0, 0.05);

    img {
      margin-top: 3rem;
    }

    ${({theme}) => theme.mediaWidth.upToMedium`
      flex-direction: column;
      width: 6rem;
      height: 6rem;
      border-radius: 100%;
      margin-top: -2.5rem;

      img {
        margin-top: 0.25rem;
      }

      #swap-circle {
        width: 5rem;
        height: 5rem;
      }

      #swap-circle-logo {
        width: 2rem;
        height: 2rem;
      }
    `};
  `

    const TransactionDetailsWrapper = styled.div`
    
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background-color: ${props => props.theme.componentsTheme.swapCardBackgroundColor};
    padding: 30px;
    -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
    -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
    box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);
    width:100%;
    max-width:500px;

    ${({theme}) => theme.mediaWidth.upToMedium`
      display: none;
    `};
  `

    const MobileTransactionDetailsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    width:100%;
  `

    const AssetsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `
    const AssetsHeader = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100px;
    background-color: #3b5998;
    color: #FFFFFF;
    border-radius: 0 25px 25px 25px;
    padding: 20px;
    -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
    -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
    box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);
  `

    const AssetsContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100px;
    background-color: #FFFFFF;
    color: #3b5998;
    border-radius: 25px 25px 25px 25px;
    padding: 20px;
    -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
    -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
    box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);
  `

    const WalletCircle = styled.div`
    position: relative;

    svg {
      display: flex;
    }
  `

    /*  const isListed = baseToken ? baseToken.listed : true;
    const msg = 'Token inserted by User. Please proceed with caution and do your own research!';*/
    return (
        <>
            {/*!isListed && <ErrorCard fontSize={FontSize.Large} text={msg} />*/}
            <Wrapper id="swap-page">
                <SwapPoolTabs active={'swap'}/>
                <ConfirmSwapModal
                    isOpen={showConfirm}
                    trade={trade}
                    originalTrade={tradeToConfirm}
                    onAcceptChanges={handleAcceptChanges}
                    attemptingTxn={attemptingTxn}
                    txHash={txHash}
                    recipient={recipient}
                    allowedSlippage={allowedSlippage}
                    onConfirm={handleSwap}
                    swapErrorMessage={swapErrorMessage}
                    onDismiss={handleConfirmDismiss}
                />

                <InputPanelWrapper>
                    <CurrencyInputPanel
                        first={true}
                        label={independentField === SwapField.OUTPUT && !showWrap && trade ? 'From (estimated)' : 'From'}
                        value={formattedAmounts[SwapField.INPUT]}
                        showMaxButton={!atMaxAmountInput}
                        currency={currencies[SwapField.INPUT]}
                        onUserInput={handleTypeInput}
                        onMax={handleMaxInput}
                        onCurrencySelect={handleInputSelect}
                        otherCurrency={currencies[SwapField.OUTPUT]}
                        side='left'
                        id="swap-currency-input"
                    />
                    <AutoColumn justify="space-between">
                        <AutoRow justify={isExpertMode ? 'space-between' : 'center'} style={{padding: '0 1rem'}}>
                            <ArrowWrapper clickable>
                                <ArrowDown
                                    size="16"
                                    onClick={() => {
                                        setApprovalSubmitted(false) // reset 2 step UI for approvals
                                        onSwitchTokens()
                                    }}
                                    color={currencies[SwapField.INPUT] && currencies[SwapField.OUTPUT] ? theme.primary1 : theme.text2}
                                />
                            </ArrowWrapper>
                            {recipient === null && !showWrap && isExpertMode ? (
                                <LinkStyledButton id="add-recipient-button" onClick={() => onChangeRecipient('')}>
                                    + Add a send (optional)
                                </LinkStyledButton>
                            ) : null}
                        </AutoRow>
                    </AutoColumn>
                    <CurrencyInputPanel
                        first={false}
                        value={formattedAmounts[SwapField.OUTPUT]}
                        onUserInput={handleTypeOutput}
                        label={independentField === SwapField.INPUT && !showWrap && trade ? 'To (estimated)' : 'To'}
                        showMaxButton={false}
                        currency={currencies[SwapField.OUTPUT]}
                        onCurrencySelect={handleOutputSelect}
                        otherCurrency={currencies[SwapField.INPUT]}
                        side='right'
                        id="swap-currency-output"
                    />

                    {recipient !== null && !showWrap ? (
                        <>
                            <AutoRow justify="space-between" style={{padding: '0 1rem'}}>
                                <ArrowWrapper clickable={false}>
                                    <ArrowDown size="20" color={theme.text2}/>
                                </ArrowWrapper>
                                <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                                    - Remove send
                                </LinkStyledButton>
                            </AutoRow>
                            <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient}/>
                        </>
                    ) : null}

                    {showWrap ? null : (
                        <Card padding={'.25rem .75rem 0 .75rem'} borderRadius={'20px'} style={{display: 'none'}}>
                            <AutoColumn gap="4px">
                                {Boolean(trade) && (
                                    <RowBetween align="center">
                                        <Text fontWeight={500} fontSize={14} color={theme.text2}>
                                            Price
                                        </Text>
                                        <TradePrice
                                            price={trade?.executionPrice}
                                            showInverted={showInverted}
                                            setShowInverted={setShowInverted}
                                        />
                                    </RowBetween>
                                )}
                                {allowedSlippage !== INITIAL_ALLOWED_SLIPPAGE && (
                                    <RowBetween align="center">
                                        <ClickableText fontWeight={500} fontSize={14} color={theme.text2}
                                                       onClick={toggleSettings}>
                                            Slippage Tolerance
                                        </ClickableText>
                                        <ClickableText fontWeight={500} fontSize={14} color={theme.text2}
                                                       onClick={toggleSettings}>
                                            {allowedSlippage / 100}%
                                        </ClickableText>
                                    </RowBetween>
                                )}
                            </AutoColumn>
                        </Card>
                    )}
                </InputPanelWrapper>
                <RoundedWrapper onClick={() => {
                    if (isMobile) {
                        setModalOpen(true)
                    } else {
                        setApprovalSubmitted(false) // reset 2 step UI for approvals
                        onSwitchTokens()
                    }
                }
                }>
                    <img id="swap-circle" src={SwapCircle}
                         style={{position: "absolute", filter: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.2))'}}></img>
                    <img id="swap-circle-logo" src={Logo} style={{zIndex: 4}}></img>
                </RoundedWrapper>
                <TransactionDetailsWrapper>
                    <BottomGrouping style={{marginBottom: '1rem'}}>
                        {account === null || account === '' ? (
                            <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
                        ) : showWrap ? (
                            <ButtonPrimary disabled={Boolean(wrapInputError)} onClick={onWrap}>
                                {wrapInputError ??
                                (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
                            </ButtonPrimary>
                        ) : noRoute && userHasSpecifiedInputOutput ? (
                            <GreyCard style={{textAlign: 'center'}}>
                                <TYPE.main mb="4px">Insufficient liquidity for this trade.</TYPE.main>
                            </GreyCard>
                        ) : showApproveFlow ? (
                            <RowBetween>
                                <ButtonConfirmed
                                    onClick={approveCallback}
                                    disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                                    width="48%"
                                    altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                                    confirmed={approval === ApprovalState.APPROVED}
                                >
                                    {approval === ApprovalState.PENDING ? (
                                        <AutoRow gap="6px" justify="center">
                                            Approving <Loader stroke="white"/>
                                        </AutoRow>
                                    ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                                        'Approved'
                                    ) : (
                                        'Approve ' + currencies[SwapField.INPUT]?.symbol
                                    )}
                                </ButtonConfirmed>
                                <ButtonError
                                    onClick={() => {
                                        if (isExpertMode) {
                                            handleSwap()
                                        } else {
                                            setSwapState({
                                                tradeToConfirm: trade,
                                                attemptingTxn: false,
                                                swapErrorMessage: undefined,
                                                showConfirm: true,
                                                txHash: undefined
                                            })
                                        }
                                    }}
                                    width="48%"
                                    id="swap-button"
                                    disabled={
                                        !isValid || approval !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                                    }
                                    error={isValid && priceImpactSeverity > 2}
                                >
                                    <Text fontSize={16} fontWeight={500}>
                                        {priceImpactSeverity > 3 && !isExpertMode
                                            ? `Price Impact High`
                                            : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                                    </Text>
                                </ButtonError>
                            </RowBetween>
                        ) : (
                            <ButtonError
                                onClick={() => {
                                    if (isExpertMode) {
                                        handleSwap()
                                    } else {
                                        setSwapState({
                                            tradeToConfirm: trade,
                                            attemptingTxn: false,
                                            swapErrorMessage: undefined,
                                            showConfirm: true,
                                            txHash: undefined
                                        })
                                    }
                                }}
                                id="swap-button"
                                disabled={!!swapInputError || !isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                                error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
                            >
                                <Text fontSize={20} fontWeight={500}>
                                    {swapInputError
                                        ? swapInputError
                                        : priceImpactSeverity > 3 && !isExpertMode
                                            ? `Price Impact Too High`
                                            : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                                </Text>
                            </ButtonError>
                        )}
                        {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]}/>}
                        {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage}/> : null}
                    </BottomGrouping>
                    <SlippageMenu
                        rawSlippage={allowedSlippage}
                        setRawSlippage={setUserslippageTolerance}
                        deadline={deadline}
                        setDeadline={setDeadline}
                    />
                    <AdvancedSwapDetails trade={trade}/>
                </TransactionDetailsWrapper>
                {isMobile ?
                    <Modal isOpen={modalOpen} onDismiss={handleDismissTransactionDetails} maxHeight={90} minHeight={30}>
                        <MobileTransactionDetailsWrapper>
                            {/*<RoundedWrapper style={{marginTop: '0.25rem'}}
                                            onClick={() => {
                                                if (isMobile) {
                                                    setModalOpen(false)
                                                }
                                            }
                                            }>

                                <img id="swap-circle" src={SwapCircle} style={{
                                    position: "absolute",
                                    filter: 'drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.2))'
                                }}></img>
                                <img id="swap-circle-logo" src={Logo} style={{zIndex: 4}}></img>
                            </RoundedWrapper>
                                */}
                            <BottomGrouping style={{marginBottom: '1rem'}}>
                                {!account ? (
                                    <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
                                ) : showWrap ? (
                                    <ButtonPrimary disabled={Boolean(wrapInputError)} onClick={onWrap}>
                                        {wrapInputError ??
                                        (wrapType === WrapType.WRAP ? 'Wrap' : wrapType === WrapType.UNWRAP ? 'Unwrap' : null)}
                                    </ButtonPrimary>
                                ) : noRoute && userHasSpecifiedInputOutput ? (
                                    <GreyCard style={{textAlign: 'center'}}>
                                        <TYPE.main mb="4px">Insufficient liquidity for this trade.</TYPE.main>
                                    </GreyCard>
                                ) : showApproveFlow ? (
                                    <RowBetween>
                                        <ButtonConfirmed
                                            onClick={approveCallback}
                                            disabled={approval !== ApprovalState.NOT_APPROVED || approvalSubmitted}
                                            width="48%"
                                            altDisabledStyle={approval === ApprovalState.PENDING} // show solid button while waiting
                                            confirmed={approval === ApprovalState.APPROVED}
                                        >
                                            {approval === ApprovalState.PENDING ? (
                                                <AutoRow gap="6px" justify="center">
                                                    Approving <Loader stroke="white"/>
                                                </AutoRow>
                                            ) : approvalSubmitted && approval === ApprovalState.APPROVED ? (
                                                'Approved'
                                            ) : (
                                                'Approve ' + currencies[SwapField.INPUT]?.symbol
                                            )}
                                        </ButtonConfirmed>
                                        <ButtonError
                                            onClick={() => {
                                                if (isExpertMode) {
                                                    handleSwap()
                                                } else {
                                                    setSwapState({
                                                        tradeToConfirm: trade,
                                                        attemptingTxn: false,
                                                        swapErrorMessage: undefined,
                                                        showConfirm: true,
                                                        txHash: undefined
                                                    })
                                                }
                                            }}
                                            width="48%"
                                            id="swap-button"
                                            disabled={
                                                !!swapInputError || !isValid || approval !== ApprovalState.APPROVED || (priceImpactSeverity > 3 && !isExpertMode)
                                            }
                                            error={isValid && priceImpactSeverity > 2}
                                        >
                                            <Text fontSize={16} fontWeight={500}>
                                                {priceImpactSeverity > 3 && !isExpertMode
                                                    ? `Price Impact High`
                                                    : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                                            </Text>
                                        </ButtonError>
                                    </RowBetween>
                                ) : (
                                    <ButtonError
                                        onClick={() => {
                                            if (isExpertMode) {
                                                handleSwap()
                                            } else {
                                                setSwapState({
                                                    tradeToConfirm: trade,
                                                    attemptingTxn: false,
                                                    swapErrorMessage: undefined,
                                                    showConfirm: true,
                                                    txHash: undefined
                                                })
                                            }
                                        }}
                                        id="swap-button"
                                        disabled={!isValid || (priceImpactSeverity > 3 && !isExpertMode) || !!swapCallbackError}
                                        error={isValid && priceImpactSeverity > 2 && !swapCallbackError}
                                    >
                                        <Text fontSize={20} fontWeight={500}>
                                            {swapInputError
                                                ? swapInputError
                                                : priceImpactSeverity > 3 && !isExpertMode
                                                    ? `Price Impact Too High`
                                                    : `Swap${priceImpactSeverity > 2 ? ' Anyway' : ''}`}
                                        </Text>
                                    </ButtonError>
                                )}
                                {showApproveFlow && <ProgressSteps steps={[approval === ApprovalState.APPROVED]}/>}
                                {isExpertMode && swapErrorMessage ?
                                    <SwapCallbackError error={swapErrorMessage}/> : null}
                            </BottomGrouping>
                            <SlippageMenu
                                rawSlippage={allowedSlippage}
                                setRawSlippage={setUserslippageTolerance}
                                deadline={deadline}
                                setDeadline={setDeadline}
                            />
                            <AdvancedSwapDetails trade={trade}/>
                        </MobileTransactionDetailsWrapper>
                    </Modal> : ''}
            </Wrapper>
            <AssetsWrapper style={{display: 'none'}}></AssetsWrapper>
        </>
    );
};

export {Swap};
