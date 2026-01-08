import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { fs } from '@zenfs/core';
import { TreeSelect } from 'primereact/treeselect';
import { Menu } from 'primereact/menu';
import { TreeNode } from 'primereact/treenode';
import { Button } from 'primereact/button';
import * as monaco from 'monaco-editor';
import { CenteredSpinner } from './CenteredSpinner.tsx';
import { useDebounceFn } from '../react-utils.ts';

interface ZenMonacoPrimeProps {
  style?: CSSProperties;
  homeFileProp: string;
  path: string;
  hideTopBar?: boolean;
  isInitializing: boolean;
  markers?: monaco.editor.IMarkerData[];
  onSave?: (fileContent: string) => void;
  reloadKey?: number;
}

const ZenMonacoPrime = function ZenMonacoPrime(props: ZenMonacoPrimeProps) {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const [files, setFiles] = useState<TreeNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string>(props.path);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialFileContent, setInitialFileContent] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<{ [key: string]: boolean }>({});
  const [homeFile, setHome] = useState(props.homeFileProp ?? '');
  const menuRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSmall, setIsSmall] = useState(false);

  const showError = (msg: string, err: any) => alert(`${msg}: ${err}`);

  // Build TreeSelect nodes directly from fs
  function buildTreeSelectNodes(path = '/'): any[] {
    const nodes: TreeNode[] = [];
    try {
      const entries = fs.readdirSync(path);
      entries.sort();
      for (const entry of entries) {
        const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
        const isDir = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
        if (isDir) {
          nodes.push({
            key: fullPath,
            label: entry + '/',
            data: fullPath,
            selectable: false,
            children: buildTreeSelectNodes(fullPath),
            icon: 'pi pi-folder',
          });
        } else {
          nodes.push({
            key: fullPath,
            label: entry,
            data: fullPath,
            selectable: true,
            icon: 'pi pi-file',
          });
        }
      }
    } catch (e) {
      showError('Failed to build tree', e);
    }
    return nodes;
  }

  const refreshFiles = () => {
    if (props.hideTopBar) return;
    try {
      const allEntries = buildTreeSelectNodes('/');
      setFiles(allEntries);
      if (!currentFile && allEntries.length) setCurrentFile(homeFile);
    } catch (e) {
      showError('Failed to list files', e);
    }
  };

  const handleNewFile = () => {
    const name = prompt('Enter new file name (with extension):', '/newfile.scad');
    if (name && name.startsWith('/')) {
      try {
        if (fs.existsSync(name)) {
          alert('File already exists!');
        } else {
          fs.mkdirSync(name.substring(0, name.lastIndexOf('/')), { recursive: true });
          fs.writeFileSync(name, '');
          setCurrentFile(name);
          refreshFiles();
        }
      } catch (e) {
        showError('Failed to create file', e);
      }
    }
  };

  const handleRenameFile = () => {
    const name = prompt('Enter new name for current file:', currentFile);
    if (name && name.startsWith('/')) {
      try {
        if (fs.existsSync(name)) {
          alert('File already exists!');
        } else {
          fs.mkdirSync(name.substring(0, name.lastIndexOf('/')), { recursive: true });
          fs.writeFileSync(name, fs.readFileSync(currentFile, 'utf-8'));
          fs.unlinkSync(currentFile);
          setCurrentFile(name);
          refreshFiles();
        }
      } catch (e) {
        showError('Failed to rename file', e);
      }
    }
  };

  const handleDeleteFile = () => {
    if (window.confirm(`Delete ${currentFile}?`)) {
      try {
        fs.unlinkSync(currentFile);
        refreshFiles();
        setCurrentFile('');
      } catch (e) {
        showError('Failed to delete file', e);
      }
    }
  };

  const debouncedSave = useDebounceFn<string>((fileContent: string) => {
    if (isLoading || !currentFile) return;
    try {
      console.debug('ZenMonacoPrime', `Saving ${currentFile}`);
      fs.writeFileSync(currentFile, fileContent ?? '');
      if (fileContent == initialFileContent) return;
      props.onSave?.(fileContent);
    } catch (e) {
      showError('Failed to save file', e);
    }
  }, 1000);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      debouncedSave(value);
    },
    [debouncedSave],
  );

  const onMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editor.addAction({
      id: 'openscad-save-do-nothing',
      label: 'Save (disabled)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {},
    });
    // https://code.visualstudio.com/docs/reference/default-keybindings
    monaco.editor.addKeybindingRules([
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD,
        command: 'editor.action.deleteLines',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
        command: 'editor.action.copyLinesDownAction',
      },
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
        command: 'editor.action.quickCommand',
      },
      {
        keybinding: monaco.KeyCode.F8,
        command: undefined,
      },
    ]);
    setEditor(editor);
    setMonacoInstance(monaco);
  };

  useEffect(() => {
    if (!editor || !monacoInstance) return;
    const model = editor.getModel();
    if (!model) return;
    monacoInstance.editor.setModelMarkers(model, 'openscad', props.markers ?? []);
  }, [props.markers]);

  useEffect(() => {
    if (props.isInitializing || !currentFile || initialFileContent != '') return;
    (async () => {
      try {
        console.debug('ZenMonacoPrime', `Loading ${currentFile}`);
        if (fs.existsSync(currentFile)) {
          const fileContent = fs.readFileSync(currentFile, 'utf-8');
          if (fileContent != initialFileContent) {
            setInitialFileContent(fileContent);
          }
        } else {
          setInitialFileContent('');
        }
        refreshFiles();
        setIsLoading(false);
      } catch (e) {
        showError('Failed to read file', e);
        setInitialFileContent('');
      }
    })();
  }, [props.isInitializing, currentFile, refreshFiles]);

  useEffect(() => {
    // When reloadKey changes, reload the file content from fs
    if (props.reloadKey !== undefined && props.reloadKey > 0) {
      console.debug('ZenMonacoPrime', `Reloading ${currentFile}`);
      if (fs.existsSync(currentFile)) {
        const fileContent = fs.readFileSync(currentFile, 'utf-8');
        editor?.setValue(fileContent);
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reloadKey]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setIsSmall(containerRef.current.offsetWidth < 600);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // TreeSelect value is the current file path
  const treeValue = currentFile || null;

  const menuItems = [
    { label: 'New File', icon: 'pi pi-plus', command: handleNewFile },
    { label: 'Rename', icon: 'pi pi-pencil', command: handleRenameFile },
    { label: 'Delete', icon: 'pi pi-trash', command: handleDeleteFile },
    { separator: true },
    { label: 'Set as Home', icon: 'pi pi-home', command: () => setHome(currentFile) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...props.style }}>
      {/* Conditionally render the top bar based on hideTopBar prop */}
      {!props.hideTopBar && (
        <div
          style={{
            flex: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            background: '#222',
          }}
        >
          <div style={{ position: 'relative', flex: 0 }}>
            <Menu model={menuItems} popup ref={menuRef} />
            <Button
              aria-label="Editor menu"
              style={{ minWidth: 48, minHeight: 48 }}
              title="Menu"
              onClick={(e) => menuRef.current && menuRef.current.toggle(e)}
              disabled={isLoading}
              icon="pi pi-bars"
              text
            />
          </div>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            {/* TreeSelect file picker */}
            <TreeSelect
              value={treeValue}
              options={files}
              expandedKeys={expandedKeys}
              onToggle={(e) => setExpandedKeys(e.value)}
              onChange={(e) => {
                const selectedKey = e.value;
                if (typeof selectedKey === 'string') {
                  if (fs.existsSync(selectedKey) && !fs.statSync(selectedKey).isDirectory()) {
                    setCurrentFile(selectedKey);
                  }
                }
              }}
              selectionMode="single"
              filter
              placeholder="Select a file"
              className="w-full"
              style={{ minWidth: 300 }}
              disabled={isLoading}
              panelStyle={{ maxHeight: 600, overflowY: 'auto' }}
            />
          </div>
          <div style={{ position: 'relative', flex: 0 }}>
            <Button
              aria-label="Go to HomePage"
              title="Go to HomePage"
              style={{ minWidth: 48, minHeight: 48, color: homeFile ? '#fff' : '#888' }}
              disabled={!homeFile}
              onClick={() => homeFile && setCurrentFile(homeFile)}
              icon="pi pi-home"
              text
            />
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ flex: 1 }}>
        {isLoading ?
          <CenteredSpinner text="Loading filesystem" />
        : <Editor
            width="100%"
            defaultLanguage="openscad"
            value={initialFileContent}
            path={currentFile}
            onChange={handleEditorChange}
            theme="vs-dark"
            onMount={onMount}
            options={{
              automaticLayout: true,
              fontSize: 16,
              lineNumbers: isSmall ? 'off' : 'on',
              minimap: { enabled: !isSmall },
            }}
            loading={<CenteredSpinner text="Loading monaco editor" />}
          />
        }
      </div>
    </div>
  );
};

export default ZenMonacoPrime;
