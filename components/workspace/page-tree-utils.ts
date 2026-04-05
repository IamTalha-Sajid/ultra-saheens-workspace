import type { PageListItem } from "./pages-context";

export type PageTreeNode = PageListItem & { children: PageTreeNode[] };

export function buildPageTree(pages: PageListItem[]): PageTreeNode[] {
  const map = new Map<string, PageTreeNode>();
  for (const p of pages) {
    map.set(p._id, { ...p, children: [] });
  }
  const roots: PageTreeNode[] = [];
  for (const p of pages) {
    const node = map.get(p._id)!;
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: PageTreeNode, b: PageTreeNode) =>
    a.order - b.order || a.title.localeCompare(b.title);
  function sortRecursive(nodes: PageTreeNode[]) {
    nodes.sort(sortFn);
    for (const n of nodes) sortRecursive(n.children);
  }
  sortRecursive(roots);
  return roots;
}
