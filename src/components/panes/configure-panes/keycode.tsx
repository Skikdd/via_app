import React, {FC, useState, useEffect, useMemo} from 'react';
import styled from 'styled-components';
import {Button} from '../../inputs/button';
import {KeycodeModal} from '../../inputs/custom-keycode-modal';
import {title, component} from '../../icons/keyboard';
import * as EncoderPane from './encoder';
import {
  keycodeInMaster,
  getByteForCode,
  getKeycodes,
  getOtherMenu,
  IKeycode,
  IKeycodeMenu,
  categoriesForKeycodeModule,
  flattenKeycodes,
} from '../../../utils/key';
import {ErrorMessage} from '../../styled';
import {
  KeycodeType,
  getLightingDefinition,
  isVIADefinitionV3,
  isVIADefinitionV2,
  VIADefinitionV3,
} from '@the-via/reader';
import {OverflowCell, SubmenuOverflowCell, SubmenuRow} from '../grid';
import {useAppDispatch, useAppSelector} from 'src/store/hooks';
import {
  getBasicKeyToByte,
  getSelectedDefinition,
  getSelectedKeyDefinitions,
} from 'src/store/definitionsSlice';
import {getSelectedConnectedDevice} from 'src/store/devicesSlice';
import {
  getSelectedKey,
  getSelectedKeymap,
  updateKey as updateKeyAction,
  updateSelectedKey,
} from 'src/store/keymapSlice';
import {getMacroCount} from 'src/store/macrosSlice';
import {
  disableGlobalHotKeys,
  enableGlobalHotKeys,
  getDisableFastRemap,
} from 'src/store/settingsSlice'; 
import {getNextKey} from 'src/utils/keyboard-rendering';
import {useTranslation} from 'react-i18next';

const KeycodeList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 64px);
  grid-auto-rows: 64px;
  justify-content: center;
  grid-gap: 10px;
`;

const MenuContainer = styled.div`
  padding: 15px 20px 20px 10px;
`;

const Keycode = styled(Button)<{disabled: boolean}>`
  width: 50px;
  height: 50px;
  line-height: 18px;
  border-radius: 64px;
  font-size: 14px;
  border: 4px solid var(--border_color_icon);
  background: var(--bg_control);
  color: var(--color_label-highlighted);
  margin: 0;
  box-shadow: none;
  position: relative;
  border-radius: 10px;
  &:hover {
    border-color: var(--color_accent);
    transform: translate3d(0, -2px, 0);
  }
  ${(props: any) => props.disabled && `cursor:not-allowed;filter:opacity(50%);`}
`;

const KeycodeContent = styled.div`
  text-overflow: ellipsis;
  overflow: hidden;
`;

const CustomKeycode = styled(Button)`
  width: 50px;
  height: 50px;
  line-height: 18px;
  border-radius: 10px;
  font-size: 14px;
  border: 4px solid var(--border_color_icon);
  background: var(--color_accent);
  border-color: var(--color_inside_accent);
  color: var(--color_inside_accent);
  margin: 0;
`;

const KeycodeContainer = styled.div`
  padding: 12px;
  padding-bottom: 30px;
`;

const KeycodeDesc = styled.div`
  position: fixed;
  bottom: 0;
  background: #d9d9d97a;
  box-sizing: border-box;
  transition: opacity 0.4s ease-out;
  height: 25px;
  width: 100%;
  line-height: 14px;
  padding: 5px;
  font-size: 14px;
  opacity: 1;
  pointer-events: none;
  &:empty {
    opacity: 0;
  }
`;

const SubmenuItem = styled(SubmenuRow)<{$depth: number}>`
  padding-left: ${props => 20 + props.$depth * 20}px;
`;

// 子分类按钮容器
const SubCategoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
`;

const SubCategoryButton = styled(Button)<{$selected: boolean}>`
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  background: ${props => props.$selected ? 'var(--color_accent)' : 'var(--bg_control)'};
  color: ${props => props.$selected ? 'white' : 'var(--color_label)'};
  border: none;
  cursor: pointer;
  &:hover {
    background: var(--color_accent_hover);
    transform: translate3d(0, -1px, 0);
  }
`;

const generateKeycodeCategories = (basicKeyToByte: Record<string, number>, numMacros: number = 16) =>
  getKeycodes(numMacros).concat(getOtherMenu(basicKeyToByte));

const maybeFilter = <M extends Function>(maybe: boolean, filter: M) =>
  maybe ? () => true : filter;

export const Pane: FC = () => {
  const selectedKey = useAppSelector(getSelectedKey);
  const dispatch = useAppDispatch();
  const keys = useAppSelector(getSelectedKeyDefinitions);
  useEffect(
    () => () => {
      dispatch(updateSelectedKey(null));
    },
    [],
  );

  if (selectedKey !== null && keys[selectedKey].ei !== undefined) {
    return <EncoderPane.Pane />;
  }
  return <KeycodePane />;
};

export const KeycodePane: FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const macros = useAppSelector((state: any) => state.macros);
  const selectedDefinition = useAppSelector(getSelectedDefinition);
  const selectedDevice = useAppSelector(getSelectedConnectedDevice);
  const matrixKeycodes = useAppSelector(getSelectedKeymap);
  const selectedKey = useAppSelector(getSelectedKey);
  const disableFastRemap = useAppSelector(getDisableFastRemap);
  const selectedKeyDefinitions = useAppSelector(getSelectedKeyDefinitions);
  const {basicKeyToByte} = useAppSelector(getBasicKeyToByte);
  const macroCount = useAppSelector(getMacroCount);

  const KeycodeCategories = useMemo(
    () => generateKeycodeCategories(basicKeyToByte, macroCount),
    [basicKeyToByte, macroCount],
  );

  if (!selectedDefinition || !selectedDevice || !matrixKeycodes) {
    return null;
  }

  const [selectedCategory, setSelectedCategory] = useState(
    KeycodeCategories[0]?.id || '',
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [mouseOverDesc, setMouseOverDesc] = useState<string | null>(null);
  const [showKeyTextInputModal, setShowKeyTextInputModal] = useState(false);

  // 获取当前选中的菜单对象
  const currentMenu = KeycodeCategories.find(({id}) => id === selectedCategory);

  // 当切换主菜单时，清空子分类选择
  useEffect(() => {
    setSelectedSubCategory(null);
  }, [selectedCategory]);

  const getEnabledMenus = (): IKeycodeMenu[] => {
    if (isVIADefinitionV3(selectedDefinition)) {
      return getEnabledMenusV3(selectedDefinition);
    }
    const {lighting, customKeycodes} = selectedDefinition;
    const {keycodes} = getLightingDefinition(lighting);
    return KeycodeCategories.filter(
      maybeFilter(
        keycodes === KeycodeType.QMK,
        ({id}) => id !== 'qmk_lighting',
      ),
    )
      .filter(
        maybeFilter(keycodes === KeycodeType.WT, ({id}) => id !== 'lighting'),
      )
      .filter(
        maybeFilter(
          typeof customKeycodes !== 'undefined',
          ({id}) => id !== 'custom',
        ),
      );
  };
 
  
const getEnabledMenusV3 = (definition: VIADefinitionV3): IKeycodeMenu[] => {
  const keycodes = ['default' as const, ...(definition.keycodes || [])];
  const allowedKeycodes = keycodes.flatMap((keycodeName) =>
    categoriesForKeycodeModule(keycodeName),
  );
  
  if ((selectedDefinition.customKeycodes || []).length !== 0) {
    allowedKeycodes.push('custom');
  }
  
  // 只返回允许的顶层菜单，保持 children 结构不变
  return KeycodeCategories.filter(menu => allowedKeycodes.includes(menu.id));
};
// const getEnabledMenusV3 = (definition: VIADefinitionV3): IKeycodeMenu[] => {
//   const keycodes = ['default' as const, ...(definition.keycodes || [])];
//   const allowedKeycodes = keycodes.flatMap((keycodeName) =>
//     categoriesForKeycodeModule(keycodeName),
//   );
  
//   // 添加所有子菜单的 ID 到允许列表
//   const allAllowedKeycodes = [...allowedKeycodes];
  
//   // 递归收集所有子菜单的 ID
//   const collectChildIds = (menus: IKeycodeMenu[]) => {
//     for (const menu of menus) {
//       if (menu.children) {
//         for (const child of menu.children) {
//           allAllowedKeycodes.push(child.id);
//           if (child.children) {
//             collectChildIds(child.children);
//           }
//         }
//       }
//     }
//   };
//   collectChildIds(KeycodeCategories);
  
//   if ((selectedDefinition.customKeycodes || []).length !== 0) {
//     allAllowedKeycodes.push('custom');
//   }
  
//   // const filterMenus = (menus: IKeycodeMenu[]): IKeycodeMenu[] => {
//   //   const result: IKeycodeMenu[] = [];
//   //   for (const menu of menus) {
//   //     let shouldInclude = allAllowedKeycodes.includes(menu.id);
      
//   //     let filteredChildren: IKeycodeMenu[] = [];
//   //     if (menu.children) {
//   //       filteredChildren = filterMenus(menu.children);
//   //       if (filteredChildren.length > 0) {
//   //         shouldInclude = true;
//   //       }
//   //     }
      
//   //     if (shouldInclude) {
//   //       result.push({
//   //         ...menu,
//   //         children: filteredChildren.length > 0 ? filteredChildren : menu.children,
//   //       });
//   //     }
//   //   }
//   //   return result;
//   // };

//   const filterMenus = (menus: IKeycodeMenu[]): IKeycodeMenu[] => {
//   const result: IKeycodeMenu[] = [];
//   for (const menu of menus) {
//     let shouldInclude = allAllowedKeycodes.includes(menu.id);
    
//     let filteredChildren: IKeycodeMenu[] = [];
//     if (menu.children) {
//       filteredChildren = filterMenus(menu.children);
//       if (filteredChildren.length > 0) {
//         shouldInclude = true;
//       }
//     }
    
//     if (shouldInclude) {
//       result.push({
//         ...menu,
//         keycodes: menu.keycodes,  // ← 确保保留 keycodes
//         children: filteredChildren.length > 0 ? filteredChildren : menu.children,
//       });
//     }
//   }
//   return result;
// };
  
//   return filterMenus(KeycodeCategories);
// };

  // 递归渲染菜单
  // const renderMenuItems = (menus: IKeycodeMenu[], depth: number = 0) => {
  //   const items: JSX.Element[] = [];
  //   for (const menu of menus) {
  //     items.push(
  //       <SubmenuItem
  //         key={menu.id}
  //         $depth={depth}
  //         $selected={menu.id === selectedCategory}
  //         onClick={() => setSelectedCategory(menu.id)}
  //       >
  //         {t(menu.label)}
  //       </SubmenuItem>
  //     );
  //     if (menu.children) {
  //       items.push(...renderMenuItems(menu.children, depth + 1));
  //     }
  //   }
  //   return items;
  // };

// 递归渲染菜单
// const renderMenuItems = (menus: IKeycodeMenu[], depth: number = 0) => {
//   const items: JSX.Element[] = [];
//   for (const menu of menus) {
//     // 只让顶层菜单可以被选中，子菜单不设置 onClick
//     const isTopLevel = depth === 0;
//     items.push(
//       <SubmenuItem
//         key={menu.id}
//         $depth={depth}
//         $selected={isTopLevel && menu.id === selectedCategory}
//         onClick={() => {
//           if (isTopLevel) {
//             setSelectedCategory(menu.id);
//           }
//         }}
//       >
//         {t(menu.label)}
//       </SubmenuItem>
//     );
//     if (menu.children) {
//       items.push(...renderMenuItems(menu.children, depth + 1));
//     }
//   }
//   return items;
// };

// 递归渲染菜单 - 只渲染顶层菜单，不递归 children
const renderMenuItems = (menus: IKeycodeMenu[], depth: number = 0) => {
  const items: JSX.Element[] = [];
  for (const menu of menus) {
    // 只显示顶层菜单（depth === 0）
    if (depth === 0) {
      items.push(
        <SubmenuItem
          key={menu.id}
          $depth={depth}
          $selected={menu.id === selectedCategory}
          onClick={() => setSelectedCategory(menu.id)}
        >
          {t(menu.label)}
        </SubmenuItem>
      );
    }
    // 不再递归 children
  }
  return items;
};

  const renderCategories = () => {
    return (
      <MenuContainer>
        {renderMenuItems(getEnabledMenus())}
      </MenuContainer>
    );
  };

  const renderKeyInputModal = () => {
    dispatch(disableGlobalHotKeys());

    return (
      <KeycodeModal
        defaultValue={
          selectedKey !== null ? matrixKeycodes[selectedKey] : undefined
        }
        onExit={() => {
          dispatch(enableGlobalHotKeys());
          setShowKeyTextInputModal(false);
        }}
        onConfirm={(keycode) => {
          dispatch(enableGlobalHotKeys());
          updateKey(keycode);
          setShowKeyTextInputModal(false);
        }}
      />
    );
  };

  const updateKey = (value: number) => {
    if (selectedKey !== null) {
      dispatch(updateKeyAction(selectedKey, value));
      dispatch(
        updateSelectedKey(
          disableFastRemap || !selectedKeyDefinitions
            ? null
            : getNextKey(selectedKey, selectedKeyDefinitions),
        ),
      );
    }
  };

  const handleClick = (code: string, i: number) => {
    if (code == 'text') {
      setShowKeyTextInputModal(true);
    } else {
      return (
        keycodeInMaster(code, basicKeyToByte) &&
        updateKey(getByteForCode(code, basicKeyToByte))
      );
    }
  };

  const renderKeycode = (keycode: IKeycode, index: number) => {
    const {code, title, name} = keycode;
    return (
      <Keycode
        key={code}
        disabled={!keycodeInMaster(code, basicKeyToByte) && code != 'text'}
        onClick={() => handleClick(code, index)}
        onMouseOver={() => setMouseOverDesc(title ? `${code}: ${title}` : code)}
        onMouseOut={() => setMouseOverDesc(null)}
      >
        <KeycodeContent>{name}</KeycodeContent>
      </Keycode>
    );
  };

  const renderCustomKeycode = () => {
    return (
      <CustomKeycode
        key="customKeycode"
        onClick={() => selectedKey !== null && handleClick('text', 0)}
        onMouseOver={() => setMouseOverDesc('Enter any QMK Keycode')}
        onMouseOut={() => setMouseOverDesc(null)}
      >
        Any
      </CustomKeycode>
    );
  };

  // // 渲染子分类按钮
  // const renderSubCategories = () => {
  //   if (!currentMenu?.children || currentMenu.children.length === 0) {
  //     return null;
  //   }

  //   return (
  //     <SubCategoryContainer>
  //       {currentMenu.children.map((child) => (
  //         <SubCategoryButton
  //           key={child.id}
  //           $selected={selectedSubCategory === child.id}
  //           onClick={() => setSelectedSubCategory(child.id)}
  //         >
  //           {child.label}
  //         </SubCategoryButton>
  //       ))}
  //     </SubCategoryContainer>
  //   );
  // };
// 渲染子分类按钮
const renderSubCategories = () => {
  console.log('renderSubCategories - currentMenu:', currentMenu);
  console.log('currentMenu.children:', currentMenu?.children);
  
  if (!currentMenu?.children || currentMenu.children.length === 0) {
    return <div>没有子分类</div>;
  }

  return (
    <SubCategoryContainer>
      {currentMenu.children.map((child) => (
        <SubCategoryButton
          key={child.id}
          $selected={selectedSubCategory === child.id}
          onClick={() => {
            console.log('点击子分类:', child.id, child);
            console.log('子分类的 keycodes:', child.keycodes);
            setSelectedSubCategory(child.id);
          }}
        >
          {child.label} ({child.keycodes?.length || 0}个按键)
        </SubCategoryButton>
      ))}
    </SubCategoryContainer>
  );
};

  // 获取当前要显示的 keycodes
  const getCurrentKeycodes = (): IKeycode[] => {
    // 如果有选中的子分类，显示子分类的 keycodes
    if (selectedSubCategory && currentMenu?.children) {
      const subCategory = currentMenu.children.find(c => c.id === selectedSubCategory);
      if (subCategory) {
        return subCategory.keycodes || [];
      }
    }
    
    // 如果当前菜单有 children 但没有选中子分类，返回空数组（显示子分类按钮）
    if (currentMenu?.children && currentMenu.children.length > 0) {
      return [];
    }
    
    // 否则直接返回菜单的 keycodes
    return currentMenu?.keycodes || [];
  };

// 修改 renderSelectedCategoryContent 函数
// const renderSelectedCategoryContent = () => {

//     console.log('renderSelectedCategoryContent - selectedCategory:', selectedCategory);
//   console.log('selectedSubCategory:', selectedSubCategory);
//   console.log('currentMenu:', currentMenu);
//   // 如果当前菜单有 children 且没有选中子分类，显示子分类按钮
//   if (currentMenu?.children && currentMenu.children.length > 0 && !selectedSubCategory) {
//     return renderSubCategories();
//   }

//   // 如果有选中的子分类，显示子分类的 keycodes
//   if (selectedSubCategory && currentMenu?.children) {
//     const subCategory = currentMenu.children.find(c => c.id === selectedSubCategory);
//     if (subCategory && subCategory.keycodes) {
//       const keycodeListItems = subCategory.keycodes.map((keycode, i) =>
//         renderKeycode(keycode, i),
//       );
//       return <KeycodeList>{keycodeListItems}</KeycodeList>;
//     }
//   }

//   // 否则显示当前菜单的 keycodes
//   const currentKeycodes = currentMenu?.keycodes || [];
//   const keycodeListItems = currentKeycodes.map((keycode, i) =>
//     renderKeycode(keycode, i),
//   );
  
//   // 其他特殊菜单的处理
//   switch (selectedCategory) {
//     case 'macro': {
//       return !macros.isFeatureSupported ? (
//         renderMacroError()
//       ) : (
//         <KeycodeList>{keycodeListItems}</KeycodeList>
//       );
//     }
//     case 'special': {
//       return (
//         <KeycodeList>
//           {keycodeListItems.concat(renderCustomKeycode())}
//         </KeycodeList>
//       );
//     }
//     case 'custom': {
//       if (
//         (!isVIADefinitionV2(selectedDefinition) &&
//           !isVIADefinitionV3(selectedDefinition)) ||
//         !selectedDefinition.customKeycodes
//       ) {
//         return null;
//       }
//       return (
//         <KeycodeList>
//           {selectedDefinition.customKeycodes.map((keycode, idx) => {
//             return renderKeycode(
//               {
//                 ...keycode,
//                 code: `CUSTOM(${idx})`,
//               },
//               idx,
//             );
//           })}
//         </KeycodeList>
//       );
//     }
//     default: {
//       return <KeycodeList>{keycodeListItems}</KeycodeList>;
//     }
//   }
// };

// 在组件外部或内部添加这个函数
  const renderMacroError = () => {
    return (
      <ErrorMessage>
        {t(
          'Your current firmware does not support macros. Install the latest firmware for your device.',
        )}
      </ErrorMessage>
    );
  };

const renderSelectedCategoryContent = () => {
  // 1. 先处理特殊菜单（macro, special, custom）
  if (selectedCategory === 'macro') {
    const currentKeycodes = currentMenu?.keycodes || [];
    return !macros.isFeatureSupported ? renderMacroError() : <KeycodeList>{currentKeycodes.map(renderKeycode)}</KeycodeList>;
  }
  
  if (selectedCategory === 'special') {
    const currentKeycodes = currentMenu?.keycodes || [];
    return <KeycodeList>{currentKeycodes.map(renderKeycode).concat(renderCustomKeycode())}</KeycodeList>;
  }
  
  if (selectedCategory === 'custom') {
    if ((!isVIADefinitionV2(selectedDefinition) && !isVIADefinitionV3(selectedDefinition)) || !selectedDefinition.customKeycodes) {
      return null;
    }
    return (
      <KeycodeList>
        {selectedDefinition.customKeycodes.map((keycode, idx) => {
          return renderKeycode({ ...keycode, code: `CUSTOM(${idx})` }, idx);
        })}
      </KeycodeList>
    );
  }

  // 2. 如果是 BASIC 菜单且有 children，直接显示所有子分类及其按键
  if (currentMenu?.children && currentMenu.children.length > 0) {
    return (
      <div>
        {currentMenu.children.map((child) => (
          <div key={child.id}>
            <h3 style={{ margin: '5px 0px 5px 35px', color: 'var(--color_accent)' }}>{child.label}</h3>
            <KeycodeList>
              {(child.keycodes || []).map(renderKeycode)}
            </KeycodeList>
          </div>
        ))}
      </div>
    );
  }

  // 3. 默认显示当前菜单的 keycodes
  const currentKeycodes = currentMenu?.keycodes || [];
  return <KeycodeList>{currentKeycodes.map(renderKeycode)}</KeycodeList>;
};
  return (
    <>
      <SubmenuOverflowCell>{renderCategories()}</SubmenuOverflowCell>
      <OverflowCell>
        <KeycodeContainer>
          {renderSelectedCategoryContent()}
        </KeycodeContainer>
        <KeycodeDesc>{mouseOverDesc}</KeycodeDesc>
        {showKeyTextInputModal && renderKeyInputModal()}
      </OverflowCell>
    </>
  );
};

export const Icon = component;
export const Title = title;