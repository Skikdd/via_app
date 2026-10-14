import {faDiscord, faGithub,faDeskpro} from '@fortawesome/free-brands-svg-icons';
import { faDesktop, faLaptop, faDisplay, faComputer } from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import {VIALogo} from '../icons/via';
import {CategoryMenuTooltip} from '../inputs/tooltip';
import {CategoryIconContainer} from '../panes/grid';

const ExternalLinkContainer = styled.span`
  position: relative;
  right: 0em;
  display: flex;
  gap: 1em;
`;

export const ExternalLinks = () => (
  <ExternalLinkContainer>
    {/* <a href="https://caniusevia.com/" target="_blank">
      <CategoryIconContainer>
        <VIALogo height="25px" fill="currentColor" />
        <CategoryMenuTooltip>Firmware + Docs</CategoryMenuTooltip>
      </CategoryIconContainer>
    </a> */}
    <a href="https://kdocs.cn/l/come3pcJsNi1" target="_blank">
      <CategoryIconContainer>
        <FontAwesomeIcon size={'xl'} icon={faDiscord} />
        <CategoryMenuTooltip>第三方键盘支持查询</CategoryMenuTooltip>
      </CategoryIconContainer>
    </a>
    <a href="https://image.rdmctmzt.com/" target="_blank">
      <CategoryIconContainer>
        <FontAwesomeIcon size={'xl'} icon={faDesktop} />
        <CategoryMenuTooltip>跳转到屏幕修改网站</CategoryMenuTooltip>
      </CategoryIconContainer>
    </a>
  </ExternalLinkContainer>
);