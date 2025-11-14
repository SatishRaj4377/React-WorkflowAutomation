// Centralized palette filtering logic
// Keeps NodePaletteSidebar lean and makes rules easy to extend

export type PaletteCategoryName = 'Triggers' | 'Core' | 'Flow' | 'Tools';

export interface PaletteNodeItem {
  id: string;
  name: string;
  iconId?: string;
  category: 'trigger' | 'core' | 'flow' | 'tool' | string;
  nodeType: string;
  description: string;
}

export interface PaletteCategory {
  name: PaletteCategoryName;
  collapsed: boolean;
  nodes: PaletteNodeItem[];
}

export type PaletteFilterMode =
  | 'default'                 // show all sections
  | 'port-core-flow'          // opened from a node port (generic) → only Core & Flow
  | 'port-agent-bottom'       // opened from AI Agent bottom port → show only Tools
  | 'connector-insert';       // opened from connector insert handle → show only Core & Flow

export interface PaletteFilterContext {
  mode: PaletteFilterMode;
}

// Resolve the allowed sections for each palette mode
export function getAllowedSectionsByMode(mode: PaletteFilterMode): Set<PaletteCategoryName> {
  switch (mode) {
    case 'port-core-flow':
      // From any node port (except agent bottom) → only Core & Flow
      return new Set<PaletteCategoryName>(['Core', 'Flow']);
    case 'port-agent-bottom':
      // From AI Agent bottom ports → allow only Tools
      return new Set<PaletteCategoryName>(['Tools']);
    case 'connector-insert':
      // Inserting into an existing connector → only Core & Flow nodes
      return new Set<PaletteCategoryName>(['Core', 'Flow']);
    case 'default':
    default:
      // Show everything
      return new Set<PaletteCategoryName>(['Triggers', 'Core', 'Flow']);
  }
}

// Applies search and contextual filtering to categories and nodes
export function getFilteredCategories(
  categories: PaletteCategory[],
  searchTerm: string,
  context: PaletteFilterContext
): PaletteCategory[] {
  const term = (searchTerm || '').trim().toLowerCase();
  const allowedSections = getAllowedSectionsByMode(context.mode);

  return categories
    .filter((cat) => allowedSections.has(cat.name as PaletteCategoryName))
    .map((cat) => ({
      ...cat,
      nodes: cat.nodes.filter((node) =>
        term === ''
          ? true
          : node.name.toLowerCase().includes(term) ||
            (node.description || '').toLowerCase().includes(term)
      ),
    }))
    .filter((cat) => cat.nodes.length > 0);
}
