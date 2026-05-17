import styled from 'styled-components';

export const KeycapContainer = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 52px;
  height: 54px;
  &:hover {
    z-index: 1;
    & .tooltip {
      transform: scale(1) translateY(0px);
      opacity: 1;
    }
  }
  .tooltip {
    transform: translateY(5px) scale(0.6);
    opacity: 0;
  }
`;

export const TooltipContainer = styled.div<{$rotate: number}>`
  position: absolute;
  transform: rotate(${(p) => p.$rotate}rad);
  width: 100%;
  height: 100%;
  bottom: 0;
`;
// export const TooltipContainer = styled.div<{ $rotate?: number }>`
//   position: fixed;  // 改为 fixed，而不是 absolute
//   bottom: auto;
//   left: 50%;
//   top: 10%;
//   transform: translateX(-50%);
//   white-space: nowrap;
//   z-index: 10000;
//   pointer-events: none;
//   // 移除原来的 transform: translate(-50%, -100%) rotate(...)
// `;

export const TestOverlay = styled.div`
  transition: all 0.2s ease-out;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
`;

export const CanvasContainerBG = styled.div<{}>``;
export const CanvasContainer = styled.div<{}>`
  box-shadow: inset -1px -1px 0 rgb(0 0 0 / 20%),
    inset 1px 1px 0 rgb(255 255 255 / 10%);
`;
