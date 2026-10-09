import React from 'react';
import { CodexModal } from '../CodexModal';
import { CodexSortMode } from '../LeftNavRail';

interface CodexViewProps {
  isOpen: boolean;
  onClose: () => void;
  equippedStyleId: string;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
  isInsideArena?: boolean;
  sortMode?: CodexSortMode;
  setSortMode?: (mode: CodexSortMode) => void;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  selectedStyleId?: string;
  onSelectStyle?: (id: string) => void;
}

export const CodexView: React.FC<CodexViewProps> = (props) => {
  return <CodexModal {...props} />;
};

