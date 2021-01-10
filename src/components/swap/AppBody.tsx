import React from 'react';
import styled from 'styled-components';

export const BodyWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 30px;
  padding: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`

/**
 * The styled container element that wraps the content of most pages and the tabs.
 */
export default function AppBody({ children }: { children: React.ReactNode }) {
  return <BodyWrapper>
  {children}
  </BodyWrapper>
}
