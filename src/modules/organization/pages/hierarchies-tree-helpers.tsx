"use client";

import type { HierarchyNodeDto } from "../services/org-extended-service";

export type TreeNodeModel = {
  id: string;
  label: string;
  typeLabel: string;
  sub?: string;
  children: TreeNodeModel[];
};

export function buildTreeModels(
  nodes: HierarchyNodeDto[],
  entityLabelMap: Record<string, string>,
  resolveLabel: (t: string, id: string) => string,
  resolveSub: (t: string, id: string) => string | undefined,
): TreeNodeModel[] {
  const byId = new Map<string, TreeNodeModel>();
  for (const n of nodes) {
    byId.set(n.node_id, {
      id: n.node_id,
      label: resolveLabel(n.entity_type, n.entity_id),
      typeLabel: entityLabelMap[n.entity_type] ?? n.entity_type,
      sub: resolveSub(n.entity_type, n.entity_id),
      children: [],
    });
  }
  const roots: TreeNodeModel[] = [];
  for (const n of nodes) {
    const model = byId.get(n.node_id)!;
    const pid = n.parent_node_id;
    if (pid && byId.has(pid)) byId.get(pid)!.children.push(model);
    else roots.push(model);
  }
  const sortRec = (list: TreeNodeModel[]) => {
    list.sort((a, b) => a.label.localeCompare(b.label, "fa"));
    for (const c of list) sortRec(c.children);
  };
  sortRec(roots);
  return roots;
}

export function HierarchyTreeDiagram({ roots }: { roots: TreeNodeModel[] }) {
  if (roots.length === 0) {
    return <p className="text-sm text-muted-foreground">گره‌ای برای نمایش نیست.</p>;
  }
  return (
    <ul className="space-y-1 text-sm" role="tree">
      {roots.map((r) => (
        <TreeBranch key={r.id} node={r} isRoot />
      ))}
    </ul>
  );
}

function TreeBranch({ node, isRoot }: { node: TreeNodeModel; isRoot?: boolean }) {
  return (
    <li role="treeitem" className={isRoot ? "" : "relative"}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-[var(--shadow-xs)]">
        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
          {node.typeLabel}
        </span>
        <span className="font-medium">{node.label}</span>
        {node.sub ? <span className="text-xs text-muted-foreground">{node.sub}</span> : null}
      </div>
      {node.children.length > 0 ? (
        <ul className="relative ms-4 mt-1 space-y-1 border-s-2 border-primary/25 ps-4" role="group">
          {node.children.map((ch) => (
            <TreeBranch key={ch.id} node={ch} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
