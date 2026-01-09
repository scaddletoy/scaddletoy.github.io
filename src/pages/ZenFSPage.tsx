import { useEffect, useRef, useState } from 'react';
import { createEditorZenFS } from '../services/fs/filesystem.ts';
import { Tree, TreeExpandedKeysType } from 'primereact/tree';
import { ContextMenu } from 'primereact/contextmenu';
import { fs } from '@zenfs/core';
import { TreeNode } from 'primereact/treenode';
import { Menubar } from 'primereact/menubar';
import { MenuItem } from 'primereact/menuitem';
import { CenteredSpinner } from '../components/CenteredSpinner.tsx';
import { formatBytes } from '../utils.ts';

export default function ZenFSPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [treeNodes, setTreeNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [isRefreshing, setRefreshing] = useState<boolean>(false);
  const cm = useRef<any>(null);

  // Minimal ZenFS file listing (assumes global FS is available)
  function listDir(path = '/') {
    try {
      const entries = fs.readdirSync(path).filter((n) => n !== '.' && n !== '..');
      return entries.map((name) => {
        const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
        const stat = fs.lstatSync(fullPath);
        const isSymlink = stat.isSymbolicLink();
        const isDir = stat.isDirectory() && !isSymlink;
        const children = isDir ? listDir(fullPath) : undefined;
        // const size = !isDir && !isSymlink ? stat.size : undefined;
        const size =
          isDir ?
            children.reduce((acc, child) => {
              return child.data?.size ? acc + child.data.size : acc;
            }, 0)
          : stat.size;
        return {
          key: fullPath,
          label: size !== undefined ? `${name} (${formatBytes(size)})` : name,
          data: { path: fullPath, isDir, isSymlink, size },
          icon:
            isSymlink ? 'pi pi-link'
            : isDir ? 'pi pi-folder'
            : 'pi pi-file',
          leaf: !isDir,
          children: children,
        };
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  useEffect(() => {
    (async () => {
      console.log('Creating ZenFS filesystem');
      await createEditorZenFS(true);
      setTreeNodes(listDir('/'));
      setIsLoading(false);
    })();
  }, []);

  function updateNodeChildren(nodes, key, replacementChildren) {
    return nodes.map((node) => {
      if (node.key === key) {
        return { ...node, children: replacementChildren };
      } else if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, key, replacementChildren) };
      }
      return node;
    });
  }

  const expandAll = () => {
    const _expandedKeys = {};
    for (const node of treeNodes) {
      expandNode(node, _expandedKeys);
    }
    setExpandedKeys(_expandedKeys);
  };

  const collapseAll = () => {
    setExpandedKeys({});
  };

  const expandNode = (node: TreeNode, _expandedKeys: TreeExpandedKeysType) => {
    if (node.children && node.children.length) {
      _expandedKeys[node.key!] = true;

      for (const child of node.children) {
        expandNode(child, _expandedKeys);
      }
    }
  };

  const toggleExpand = (key: string) => {
    if (expandedKeys[key]) {
      // Remove the key if collapsing
      const { [key]: _, ...rest } = expandedKeys;
      setExpandedKeys(rest);
    } else {
      // Add the key if expanding
      setExpandedKeys({ ...expandedKeys, [key]: true });
    }
  };

  // Menubar actions for expand/collapse all
  const menubarModel = [
    {
      label: 'Expand All',
      icon: 'pi pi-plus',
      command: expandAll,
    },
    {
      label: 'Collapse All',
      icon: 'pi pi-minus',
      command: collapseAll,
    },
  ];

  function refresh(key: string) {
    const previouslyExpanded = expandedKeys;
    const children = listDir(key);
    setRefreshing(true);
    setTreeNodes((nodes) => updateNodeChildren(nodes, key, children));
    setExpandedKeys({ ...previouslyExpanded, [key]: true });
    setRefreshing(false);
  }

  const contextMenuModel: MenuItem[] = [
    {
      label: 'Refresh',
      icon: 'pi pi-refresh',
      disabled: selectedNode?.leaf,
      command: () => {
        if (selectedNode && typeof selectedNode.key == 'string') {
          refresh(selectedNode.key as string);
        } else {
          alert('selectedNode is null or not a string. Cannot refresh.');
        }
      },
    },
    {
      label: 'Open Scaddle',
      icon: 'pi pi-link',
      disabled:
        !selectedNode?.leaf
        && !(((selectedNode?.key as string | undefined)?.match(/^\/src\//)?.length ?? 0) > 0),
      command: () => {
        const match = (selectedNode?.key as string).match(/^\/src\/([^/]+)\/?/);
        if (!match) throw new Error('No match found');
        window.open('#/model/' + match[1], '_blank');
      },
    },
    {
      label: 'Download',
      icon: 'pi pi-download',
      disabled: !selectedNode?.leaf,
      command: () => {
        if (selectedNode && typeof selectedNode.key == 'string') {
          const data = fs.readFileSync(selectedNode.key);
          const blob = new Blob([data], { type: 'application/octet-stream' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = selectedNode.key.split('/').pop() || 'file';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
          }, 100);
        }
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        if (selectedNode && typeof selectedNode.key == 'string') {
          fs.rmSync(selectedNode.key, { recursive: true });
          const parentPath = selectedNode.key.substring(0, selectedNode.key.lastIndexOf('/'));
          refresh(parentPath);
        }
      },
    },
  ];

  return (
    <div className="page">
      {isLoading ?
        <CenteredSpinner text="Loading filesystem" />
      : <div>
          <Menubar model={menubarModel} className="mb-4" />
          <ContextMenu model={contextMenuModel} ref={cm} />
          <Tree
            value={treeNodes}
            selectionMode="single"
            // selectionKeys={{}}
            filter
            filterMode="lenient"
            filterPlaceholder="filter"
            expandedKeys={expandedKeys}
            onToggle={(e) => {
              if (e.value && Object.keys(e.value).length !== 0) {
                setExpandedKeys(e.value);
              } else {
                const prev = expandedKeys;
                setExpandedKeys(e.value);
                setTimeout(() => setExpandedKeys(prev), 100);
              }
            }}
            onNodeClick={(e) => {
              if (!isRefreshing) toggleExpand(e.node.key as string);
            }}
            onContextMenu={(e) => {
              setSelectedNode(e.node);
              cm.current.show(e.originalEvent);
            }}
          />
        </div>
      }
    </div>
  );
}
