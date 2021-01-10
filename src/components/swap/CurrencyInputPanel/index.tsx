import { Currency, Pair } from '@uniswap/sdk'
import React, { useState, useContext, useCallback } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { darken } from 'polished'
import { useCurrencyBalance } from '../state/wallet/hooks'
import CurrencySearchModal from '../SearchModal/CurrencySearchModal'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { RowBetween } from '../Row'
import { TYPE } from '../theme'
import { Input as NumericalInput } from '../NumericalInput'
import { ReactComponent as DropDown } from '../assets/images/dropdown.svg'

import { useActiveWeb3React } from '../hooks'
import { useTranslation } from 'react-i18next'

const InputRow = styled.div<{ selected: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  padding: ${({ selected }) => (selected ? '0.75rem 0.5rem 0.75rem 1rem' : '0.75rem 0.75rem 0.75rem 1rem')};
  display: flex;
  flex-direction: column;
  width:350px;
`

const CurrencySelect = styled.button<{ selected: boolean, side: string }>`
  align-items: center;
  font-size: 25px;
  font-weight: 500;
  background-color: #FFFFFF;
  color: #000000;
  border-radius: ${({ side }) => (side == 'left' ? '25px 0 25px 25px;' : '0 25px 25px 25px;')};
  outline: none;
  cursor: pointer;
  user-select: none;
  border: none;
  padding: 0 0.5rem;
  margin-bottom: 1rem;
  width: 90%;
  height: 2.5rem;

  :focus,
  :hover {
    background-color: #F5F6FA;
  }
  
  ${({ theme }) => theme.mediaWidth.upToMedium`
    border-radius: 36px;
  `};
`

const LabelRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  color: ${({ theme }) => theme.text1};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.75rem 1rem 0 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => darken(0.2, theme.text2)};
  }
`

const Aligner = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const StyledDropDown = styled(DropDown)<{ selected: boolean }>`
  margin: 0 0.25rem 0 0.5rem;
  height: 35%;

  path {
    stroke: ${({ selected, theme }) => (selected ? theme.text1 : theme.text1)};
    stroke-width: 1.5px;
  }
`

const InputPanel = styled.div<{ hideInput?: boolean, side: string }>`
  ${({ theme }) => theme.flexColumnNoWrap}
  position: relative;
  border-radius: ${({ side }) => (side == 'left' ? '36px 0px 36px 36px' : '0px 36px 36px 36px')};
  background-color: transparent;
  z-index: 1;
  height: 100%;
  
  ${({ theme }) => theme.mediaWidth.upToMedium`
    width: 100%;
    border-radius: 36px;
  `};
`

const Container = styled.div<{ first?: boolean, hideInput: boolean, side: string }>`
  border-radius: ${({ side }) => (side == 'left' ? '36px 0px 36px 36px' : '0px 36px 36px 36px')};
  background: ${props => props.first ? 'linear-gradient(125deg,#b12d86,#f53e82)' : 'linear-gradient(125deg,#f53e82,#b12d86)'};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  -webkit-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
  -moz-box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2);   /* Firefox 3.5 - 3.6 */
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.2); 
  
  ${({ theme }) => theme.mediaWidth.upToMedium`
    width: 100%;
    border-radius: 36px;
  `};
`

const StyledTokenName = styled.span<{ active?: boolean }>`
  ${({ active }) => (active ? '  margin: 0 0.25rem 0 0.75rem;' : '  margin: 0 0.25rem 0 0.25rem;')}
  font-size:  ${({ active }) => (active ? '20px' : '16px')};

`

const StyledBalanceMax = styled.button`
  position: absolute;
  height: 1.25rem;
  right: 5px;
  background-color: #FFC677;
  border-radius: 1rem;
  font-size: 0.75rem;
  border: none;
  font-weight: 500;
  cursor: pointer;
  color: #FFFFFF;
  
  :hover {
  }
  :focus {
  }
`

const AmountInput = styled.div<{ side: string }>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: ${({ side }) => (side == 'left' ? '25px 0 25px 25px;' : '0 25px 25px 25px;')};
  width: 90%;
  height: 2.5rem;
  position: relative;
  font-weight: 500;
  outline: none;
  border: none;
  flex: 1 1 auto;
  border: 3px solid #FFFFFF;
  background-color: #2a2735;
  font-size: 1.75em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0px;
  font-family: 'Poppins', sans-serif;
  
  ${({ theme }) => theme.mediaWidth.upToMedium`
    border-radius: 36px;
  `};
`

interface CurrencyInputPanelProps {
  first?: boolean,
  value: string
  onUserInput: (value: string) => void
  onMax?: () => void
  showMaxButton: boolean
  label?: string
  onCurrencySelect?: (currency: Currency) => void
  currency?: Currency | null
  disableCurrencySelect?: boolean
  hideBalance?: boolean
  pair?: Pair | null
  hideInput?: boolean
  otherCurrency?: Currency | null
  side: string
  id: string
  showCommonBases?: boolean
}

export default function CurrencyInputPanel({
    first,
  value,
  onUserInput,
  onMax,
  showMaxButton,
  label = 'Input',
  onCurrencySelect,
  currency,
  disableCurrencySelect = false,
  hideBalance = false,
  pair = null, // used for double token logo
  hideInput = false,
  otherCurrency,
  side = 'left',
  id,
  showCommonBases
}: CurrencyInputPanelProps) {
  const { t } = useTranslation()

  const [modalOpen, setModalOpen] = useState(false)
  const { account } = useActiveWeb3React()
  const selectedCurrencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
  const theme = useContext(ThemeContext)

  const handleDismissSearch = useCallback(() => {
    setModalOpen(false)
  }, [setModalOpen])

  return (
    <InputPanel id={id} side={side}>
      <Container first={first} hideInput={hideInput} side={side}>
        {!hideInput && (
          <LabelRow style={{ display: 'none' }}>
            <RowBetween>
              <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
                {label}
              </TYPE.body>
              {account && (
                <TYPE.body
                  onClick={onMax}
                  color={theme.text2}
                  fontWeight={500}
                  fontSize={14}
                  style={{ display: 'inline', cursor: 'pointer' }}
                >
                  {!hideBalance && !!currency && selectedCurrencyBalance
                    ? 'Balance: ' + selectedCurrencyBalance?.toSignificant(6)
                    : ' -'}
                </TYPE.body>
              )}
            </RowBetween>
          </LabelRow>
        )}
        <InputRow style={hideInput ? { padding: '0', borderRadius: '8px' } : {}} selected={disableCurrencySelect}>
          {!hideInput && (
            <>
              <CurrencySelect
                  selected={!!currency}
                  side={side}
                  className="open-currency-select-button"
                  onClick={() => {
                    if (!disableCurrencySelect) {
                      setModalOpen(true)
                    }
                  }}
              >
                <Aligner>
                  {pair ? (
                      <DoubleCurrencyLogo currency0={pair.token0} currency1={pair.token1} size={24} margin={true} />
                  ) : currency ? (
                      <CurrencyLogo currency={currency} size={'24px'} />
                  ) : null}
                  {pair ? (
                      <StyledTokenName className="pair-name-container">
                        {pair?.token0.symbol}:{pair?.token1.symbol}
                      </StyledTokenName>
                  ) : (
                      <StyledTokenName className="token-symbol-container" active={Boolean(currency && currency.symbol)}>
                        {(currency && currency.symbol && currency.symbol.length > 20
                            ? currency.symbol.slice(0, 4) +
                            '...' +
                            currency.symbol.slice(currency.symbol.length - 5, currency.symbol.length)
                            : currency?.symbol) || 'Select a token'}
                      </StyledTokenName>
                  )}
                  <TYPE.body
                      onClick={onMax}
                      color={theme.text2}
                      fontWeight={500}
                      fontSize={14}
                      style={{ display: 'inline', cursor: 'pointer' }}
                  >
                    {!hideBalance && !!currency && selectedCurrencyBalance
                        ? selectedCurrencyBalance?.toSignificant(6)
                        : '-'}
                  </TYPE.body>
                  {!disableCurrencySelect && <StyledDropDown selected={!!currency} />}
                </Aligner>
              </CurrencySelect>
              <AmountInput side={side}>
                <NumericalInput
                    className="token-amount-input"
                    value={value}
                    side={side}
                    onUserInput={val => {
                      onUserInput(val)
                    }}
                />
                {account && currency && showMaxButton && label !== 'To' && (
                    <StyledBalanceMax onClick={onMax}>MAX</StyledBalanceMax>
                )}
              </AmountInput>
            </>
          )}
        </InputRow>
      </Container>
      {!disableCurrencySelect && onCurrencySelect && (
        <CurrencySearchModal
          isOpen={modalOpen}
          onDismiss={handleDismissSearch}
          onCurrencySelect={onCurrencySelect}
          selectedCurrency={currency}
          otherSelectedCurrency={otherCurrency}
          showCommonBases={showCommonBases}
        />
      )}
    </InputPanel>
  )
}
