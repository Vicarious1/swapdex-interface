import React, { MouseEvent } from 'react';
import styled from 'styled-components';

import { themeBreakPoints } from '../../themes/commons';

interface Props {
    image: React.ReactNode;
    text?: string;
    textColor?: string;
    width?: string;
    paddingLeft?: string;
    onClick: (event: MouseEvent) => void;
}

const LogoLink = styled.a<any>`
    align-items: center;
    cursor: pointer;
    display: flex;
    height: 33px;
    font-family: 'Inter var', sans-serif;
    text-decoration: none;
    padding-left: ${props => props.paddingLeft || '0px'};
`;

export const Logo: React.FC<Props> = props => {
    const { image, onClick, ...restProps } = props;
    return (
        <LogoLink onClick={onClick} {...restProps}>
            {image}
        </LogoLink>
    );
};
