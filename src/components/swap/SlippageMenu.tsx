import React, { useState, useRef, useContext } from 'react'
import styled, { ThemeContext } from 'styled-components'

import { TYPE } from './theme'
import { AutoColumn } from './Column'
import { RowBetween } from './Row'

import { darken } from 'polished'

enum SlippageError {
    InvalidInput = 'InvalidInput',
    RiskyLow = 'RiskyLow',
    RiskyHigh = 'RiskyHigh'
}

const FancyButton = styled.button`
  align-items: center;
  height: 2rem;
  border-radius: 36px;
  font-size: 12px;
  width: auto;
  max-width: 4rem;
  border: 1px solid ${({ theme }) => theme.bg3};
  outline: none;
  background: #E8EDF6;
  :hover {
    border: 1px solid #3b5998;
  }
  :focus {
    border: 1px solid #3b5998;
  }
`

const Option = styled(FancyButton)<{ active: boolean }>`
  margin-right: 1rem;
  font-size: 20px;
  :hover {
    cursor: pointer;
  }
  background-color: ${({ active, theme }) => active && '#bd006a'};
  color: ${({ active, theme }) => (active ? theme.white : '#7C7C7C')};
`

const Input = styled.input`
  background: #E8EDF6;
  font-size: 16px;
  width: auto;
  outline: none;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
  color: ${({ theme, color }) => (color === 'red' ? theme.red1 : '#7C7C7C')};
  text-align: right;
`

const OptionCustom = styled(FancyButton)<{ active?: boolean; warning?: boolean }>`
  height: 2rem;
  position: relative;
  padding: 0;
  margin: 0;
  flex: 1;
  width: 4rem;
  border: ${({ theme, active, warning }) => active && `1px solid ${warning ? theme.red1 : theme.primary1}`};
  :hover {
    border: ${({ theme, active, warning }) =>
    active && `1px solid ${warning ? darken(0.1, theme.red1) : darken(0.1, theme.primary1)}`};
  }

  input {
    width: 3rem;
    height: 100%;
    border: 0px;
    border-radius: 2rem;
  }
  
  span {
    position: absolute;
    right: 5px;
  }
`

export interface SlippageTabsProps {
    rawSlippage: number
    setRawSlippage: (rawSlippage: number) => void
    deadline: number
    setDeadline: (deadline: number) => void
}

export default function SlippageTabs({ rawSlippage, setRawSlippage, deadline, setDeadline }: SlippageTabsProps) {
    const theme = useContext(ThemeContext)

    const inputRef = useRef<HTMLInputElement>()

    const [slippageInput, setSlippageInput] = useState('');

    console.log((rawSlippage / 100).toFixed(2));
    console.log(Number.parseFloat(slippageInput).toFixed(2));

    const slippageInputIsValid =
        slippageInput === '' || (rawSlippage / 100).toFixed(2) === Number.parseFloat(slippageInput).toFixed(2)

    let slippageError: SlippageError | undefined
    if (slippageInput !== '' && !slippageInputIsValid) {
        slippageError = SlippageError.InvalidInput
    } else if (slippageInputIsValid && rawSlippage < 50) {
        slippageError = SlippageError.RiskyLow
    } else if (slippageInputIsValid && rawSlippage > 500) {
        slippageError = SlippageError.RiskyHigh
    } else {
        slippageError = undefined
    }

    function parseCustomSlippage(value: string) {
        setSlippageInput(value)
        try {
            const valueAsIntFromRoundedFloat = Number.parseInt((Number.parseFloat(value) * 100).toString())
            if (!Number.isNaN(valueAsIntFromRoundedFloat) && valueAsIntFromRoundedFloat < 5000) {
                console.log('setRawSlippage:'+(valueAsIntFromRoundedFloat));
                setRawSlippage(valueAsIntFromRoundedFloat)
            }
        } catch {}
    }

    return (
        <AutoColumn gap="md" style={{ marginBottom: '1rem' }}>
            <AutoColumn gap="sm">
                <RowBetween>
                    <TYPE.italic fontWeight={400} fontSize={20} color={theme.text2}>
                        Slippage
                    </TYPE.italic>
                    <Option
                        onClick={() => {
                            setSlippageInput('')
                            setRawSlippage(20)
                        }}
                        active={rawSlippage === 20}
                        style={{ marginLeft: '1rem' }}
                    >
                        0.2%
                    </Option>
                    <Option
                        onClick={() => {
                            setSlippageInput('')
                            setRawSlippage(50)
                        }}
                        active={rawSlippage === 50}
                    >
                        0.5%
                    </Option>
                    <OptionCustom active={![10, 50, 100].includes(rawSlippage)} warning={!slippageInputIsValid} tabIndex={-1}>
                        <RowBetween>
                            {/* https://github.com/DefinitelyTyped/DefinitelyTyped/issues/30451 */}
                            <Input
                                ref={inputRef as any}
                                placeholder={(rawSlippage / 100).toFixed(2)}
                                onFocus={e => e.target.select()}
                                onChange={e => {
                                    parseCustomSlippage(e.target.value);
                                    //parseCustomSlippage((rawSlippage / 100).toFixed(2))
                                }}
                                color={!slippageInputIsValid ? 'red' : ''}
                            />
                            <span>%</span>
                        </RowBetween>
                    </OptionCustom>
                </RowBetween>
                {!!slippageError && (
                    <RowBetween
                        style={{
                            fontSize: '14px',
                            paddingTop: '7px',
                            color: slippageError === SlippageError.InvalidInput ? 'red' : '#F3841E'
                        }}
                    >
                        {slippageError === SlippageError.InvalidInput
                            ? 'Enter a valid slippage percentage'
                            : slippageError === SlippageError.RiskyLow
                                ? 'Your transaction may fail'
                                : 'Your transaction may be frontrun'}
                    </RowBetween>
                )}
            </AutoColumn>
        </AutoColumn>
    )
}
