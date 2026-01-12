import {
  checkSyntax,
  OpenSCADRenderArgs,
  ParameterSet,
  render as runOpenSCADRender,
} from '../services/openscad-wasm-runner/actions.ts';
import { EditModel, SupabaseService, ViewModelDetails } from '../services/SupabaseService.ts';
import { createEditorZenFS, readFileSafe, writeFileSafe } from '../services/fs/filesystem.ts';
import { formatDate, getHashQueryParam, hashSha1, sanitizeAndLinkify } from '../utils.ts';
import ModelViewer, { ModelViewerHandle } from '../components/ModelViewer.tsx';
import { CenteredSpinner } from '../components/CenteredSpinner.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import CustomizerPanel from '../components/CustomizerPanel.tsx';
import { CommentsPanel } from '../components/CommentsPanel.tsx';
import ZenMonacoPrime from '../components/ZenMonacoPrime.tsx';
import { useUserContext } from '../state/UseUserContext.tsx';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ModelStats } from '../components/ModelStats.tsx';
import { exportGlb } from '../services/io/export_glb.ts';
import { InputTextarea } from 'primereact/inputtextarea';
import defaultScad from '../components/default-scad.ts';
import { parseOff } from '../services/io/import_off.ts';
import { exportStl } from '../services/io/export_stl';
import { ModelCard } from '../components/ModelCard';
import { InputText } from 'primereact/inputtext';
import styles from './EditorPage.module.css';
import { Menubar } from 'primereact/menubar';
import { useParams } from 'react-router-dom';
import type * as monaco from 'monaco-editor';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Panel } from 'primereact/panel';
import { fs } from '@zenfs/core';
import { useUserPreferences } from '../state/UseUserPreferences.tsx';
import { useDebounceFn } from '../react-utils.ts';

type EditorPageProps = {
  viewModelId?: string;
};

export default function EditorPage({ viewModelId }: EditorPageProps) {
  const { modelId } = useParams();
  if (modelId) viewModelId = modelId;
  const [userPrefs, setUserPrefs] = useUserPreferences();
  const { user } = useUserContext();
  const isReadonly = getHashQueryParam('readonly') !== null;
  const [viewModel, setViewModel] = useState<ViewModelDetails | undefined>(undefined);
  const [editModel, setEditModel] = useState<EditModel | undefined>(undefined);
  const currentModelId = viewModelId ?? 'new';

  // State for runningTaskName pipeline
  const [glbFileUrl, setGlbFileUrl] = useState<string | undefined>(undefined);
  const [offFileUrl, setOffFileUrl] = useState<string | undefined>(undefined);
  const [stlFileUrl, setStlFileUrl] = useState<string | undefined>(undefined);
  const [runningTaskName, setRunningTaskName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [logs, setLogs] = useState<string | undefined>(undefined);
  const [largePreview, setLargePreview] = useState<boolean>(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [outdated, setIsOutdated] = useState<boolean>(false);

  const [parameterSet, setParameterSet] = useState<ParameterSet | undefined>(undefined);
  const [markers, setMarkers] = useState<monaco.editor.IMarkerData[] | undefined>(undefined);
  const [parameterValues, setParameterValues] = useState<{ [key: string]: any }>({});

  const [publishDialogVisible, setPublishDialogVisible] = useState(false);
  const [publishPreviewDataUrl, setPublishPreviewDataUrl] = useState<string | null>(null);

  const [activeTabIndex, setActiveTabIndex] = useState(viewModelId !== undefined ? 0 : 1);

  const toastRef = useRef<Toast>(null);
  const viewerRef = useRef<ModelViewerHandle>(null);
  const hasInitialized = useRef(false);
  const [editorReloadKey, setEditorReloadKey] = useState(0);

  const parameterValuesRef = useRef(parameterValues);
  // Keep the ref updated
  useEffect(() => {
    parameterValuesRef.current = parameterValues;
  }, [parameterValues]);

  const getIndexScadFilePath = useCallback(() => {
    return `/src/${currentModelId}/index.scad`;
  }, [currentModelId]);

  const initFiles = useCallback(
    async (viewModelInner?: ViewModelDetails) => {
      // need to have this viewModelInner as the outside viewModel can be stale
      try {
        const indexScadFilePath = getIndexScadFilePath();
        if (currentModelId == 'new') {
          writeFileSafe(indexScadFilePath, defaultScad, false);
        } else if (!fs.existsSync(indexScadFilePath) && viewModelInner !== undefined) {
          writeFileSafe(indexScadFilePath, viewModelInner.source_code, true);
        } else if (viewModelInner !== undefined) {
          const localFileContent = readFileSafe(indexScadFilePath);
          const localHash = await hashSha1(localFileContent);
          if (localHash != viewModelInner.source_code_hash) {
            setIsOutdated(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    },
    [currentModelId, getIndexScadFilePath],
  );

  const customizer = useCallback(async () => {
    setRunningTaskName('Checking Syntax...');
    try {
      const filePath = getIndexScadFilePath();
      const content = readFileSafe(filePath);
      const sources = [{ path: filePath, content }];
      const result = await checkSyntax({
        activePath: filePath,
        sources,
      })({ now: true });

      if (result.parameterSet) {
        setParameterSet(result.parameterSet);
      }
      if (result.markers) {
        setMarkers(result.markers);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setRunningTaskName(undefined);
    }
  }, []);

  // Main render pipeline
  const renderCreator = (isPreview: boolean) => {
    return async () => {
      setRunningTaskName(isPreview ? 'Previewing...' : 'Rendering...');
      setError(undefined);
      setLogs(undefined);
      try {
        const filePath = getIndexScadFilePath();
        let content = readFileSafe(filePath);
        const sources = [{ path: filePath, content }];
        const renderArgs: OpenSCADRenderArgs = {
          scadPath: filePath,
          sources,
          vars: parameterValuesRef.current,
          isPreview: isPreview,
          mountArchives: true,
          renderFormat: 'off',
          streamsCallback: (ps) => {
            if ('stderr' in ps) setLogs((l) => (l ? l + '\n' : '') + ps.stderr);
            if ('stdout' in ps) setLogs((l) => (l ? l + '\n' : '') + ps.stdout);
          },
        };
        const result = await runOpenSCADRender(renderArgs)({ now: true });
        if (offFileUrl) URL.revokeObjectURL(offFileUrl);
        setOffFileUrl(URL.createObjectURL(result.outFile));

        let glbFile: File;
        try {
          const offData = parseOff(await result.outFile.text());
          glbFile = new File(
            [await exportGlb(offData)],
            result.outFile.name.replace('.off', '.glb'),
          );
        } catch (e) {
          setError('Failed to convert OFF to GLB: ' + e);
          setRunningTaskName(undefined);
          return;
        }
        if (glbFileUrl) URL.revokeObjectURL(glbFileUrl);
        setGlbFileUrl(URL.createObjectURL(glbFile));
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setRunningTaskName(undefined);
      }
    };
  };
  const preview = useCallback(renderCreator(true), [parameterValues]);
  const render = useCallback(renderCreator(false), [parameterValues]);
  const debouncedPreview = useDebounceFn(preview, 1000);

  // Handler for publish action
  const handlePublish = async () => {
    if (!viewerRef.current) return;
    const screenshot = await viewerRef.current.getWebpScreenshot();
    if (!screenshot) {
      setError('Failed to capture screenshot for publish.');
      return;
    }
    setPublishPreviewDataUrl(screenshot);
    setPublishDialogVisible(true);
  };

  const handleConfirmPublish = async () => {
    if (!user || !publishPreviewDataUrl || !editModel) return;
    setPublishDialogVisible(false);
    toastRef.current?.show({ severity: 'info', summary: 'Uploading...', life: 5000 });
    try {
      // Convert data URL to File
      const res = await fetch(publishPreviewDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${Date.now()}.webp`, { type: 'image/webp' });
      const editorContent: string = readFileSafe(getIndexScadFilePath());
      await SupabaseService.uploadModel(file, editorContent, editModel);
      toastRef.current?.clear();
      toastRef.current?.show({
        severity: 'success',
        summary: 'Published',
        detail: 'Model published successfully!',
        life: 3000,
      });
    } catch (err: any) {
      toastRef.current?.clear();
      toastRef.current?.show({
        severity: 'error',
        summary: 'Publish Failed',
        detail: err.message || String(err),
        life: 4000,
      });
    } finally {
      setPublishDialogVisible(false);
      setPublishPreviewDataUrl(null);
    }
  };

  const handleCancelPublish = () => {
    setPublishDialogVisible(false);
    setPublishPreviewDataUrl(null);
  };

  const handleFetchRemoteFile = async () => {
    let modelSource: string | undefined = defaultScad;
    const indexScadFilePath = getIndexScadFilePath();
    if (currentModelId !== 'new') {
      modelSource = await SupabaseService.fetchModelSource(currentModelId);
      if (modelSource === undefined) throw new Error('Failed to fetch model source');
    }
    writeFileSafe(indexScadFilePath, modelSource, true);
    setEditorReloadKey((k) => k + 1);
  };

  const fetchModelDetails = useCallback(async () => {
    console.debug('Fetching model details...', viewModelId);
    if (viewModelId) {
      const model = await SupabaseService.fetchModelById(viewModelId);
      setViewModel(model);
      setEditModel({
        id: model?.id,
        title: model?.title ?? 'Untitled Model',
        description: model?.description ?? '',
      });
      return model;
    } else {
      setEditModel({
        id: undefined,
        title: 'Untitled Model',
        description: '',
      });
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      (async () => {
        const viewModel = await fetchModelDetails();
        await createEditorZenFS(true);
        await initFiles(viewModel);
        await Promise.all([customizer(), preview()]);
        setIsLoading(false);
      })();
    }
    return () => {
      if (glbFileUrl) URL.revokeObjectURL(glbFileUrl);
      if (offFileUrl) URL.revokeObjectURL(offFileUrl);
      if (stlFileUrl) URL.revokeObjectURL(stlFileUrl);
    };
  }, [customizer, fetchModelDetails, initFiles, preview]);

  function downloadUrl(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const downloadStl = useCallback(async () => {
    try {
      if (stlFileUrl) URL.revokeObjectURL(stlFileUrl);
      if (!offFileUrl) throw new Error('No OFF file to convert');
      const offText = await (await fetch(offFileUrl)).text();
      const offData = parseOff(offText);
      const stlBlob = await exportStl(offData);
      const filename = getTitle() + '.stl';
      const url = URL.createObjectURL(stlBlob);
      downloadUrl(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStlFileUrl(undefined); // No longer needed
    } catch (e) {
      console.error(e);
    }
  }, [offFileUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F4') {
        event.preventDefault();
        customizer();
      } else if (event.key === 'F5') {
        event.preventDefault();
        preview();
      } else if (event.key === 'F6') {
        event.preventDefault();
        render();
      } else if (event.key === 'F7') {
        event.preventDefault();
        downloadStl();
      } else if (event.key === 'F8') {
        event.preventDefault();
        handlePublish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [offFileUrl]);

  function getTitle() {
    return viewModel?.title ?? editModel?.title ?? 'Untitled Model';
  }

  async function handleOnSave() {
    setIsOutdated(true);
    await Promise.all([customizer(), userPrefs.autoPreview ? preview() : Promise.resolve()]);
  }

  const showEditModelDetails =
    !isReadonly
    && (viewModel === undefined || viewModel?.owner_id === user?.id)
    && editModel !== undefined;

  return (
    <>
      <div
        className={styles.editorPageContainer}
        style={{ flexDirection: largePreview ? 'column' : undefined }}
      >
        <div className={styles.sidebar}>
          <div className={styles.modelViewerContainer}>
            <div className={styles.modelViewer}>
              {glbFileUrl ?
                <ModelViewer
                  ref={viewerRef}
                  lightMode={isLightMode}
                  style={{ width: '100%', height: '100%' }}
                  modelUri={glbFileUrl}
                />
              : <CenteredSpinner text="Waiting for model to render" />}
            </div>
            <Menubar
              model={[
                largePreview ?
                  {
                    label: 'Smaller Preview',
                    className: 'editor-page-hide-on-small',
                    icon: 'pi pi-window-minimize',
                    command: () => setLargePreview(false),
                  }
                : {
                    label: 'Larger Preview',
                    className: 'editor-page-hide-on-small',
                    icon: 'pi pi-window-maximize',
                    command: () => setLargePreview(true),
                  },
                isLightMode ?
                  { label: 'Dark Mode', icon: 'pi pi-moon', command: () => setIsLightMode(false) }
                : { label: 'Light Mode', icon: 'pi pi-sun', command: () => setIsLightMode(true) },
                {
                  label: 'Download',
                  icon: 'pi pi-download',
                  items: [
                    {
                      label: 'GLB',
                      icon: 'pi pi-download',
                      disabled: !glbFileUrl,
                      command: () => {
                        if (glbFileUrl) downloadUrl(glbFileUrl, getTitle() + '.glb');
                      },
                    },
                    {
                      label: 'OFF',
                      icon: 'pi pi-download',
                      disabled: !offFileUrl,
                      command: () => {
                        if (offFileUrl) downloadUrl(offFileUrl, getTitle() + '.off');
                      },
                    },
                    {
                      label: 'STL (F7)',
                      icon: 'pi pi-download',
                      disabled: !offFileUrl,
                      command: downloadStl,
                    },
                  ],
                },
              ]}
            />
          </div>

          {showEditModelDetails ?
            <Panel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'max-content 1fr',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <label htmlFor="edit-title" style={{ whiteSpace: 'nowrap' }}>
                  <b>Title</b>
                </label>
                <InputText
                  id="edit-title"
                  maxLength={100}
                  value={editModel.title}
                  onChange={(e) =>
                    setEditModel((m) => ({ ...m, title: e.target.value }) as EditModel)
                  }
                  placeholder="Enter model title"
                />
                <label htmlFor="edit-description" style={{ whiteSpace: 'nowrap' }}>
                  <b>Description</b>
                </label>
                <InputTextarea
                  id="edit-description"
                  maxLength={2000}
                  value={editModel.description}
                  onChange={(e) =>
                    setEditModel((m) => ({ ...m, description: e.target.value }) as EditModel)
                  }
                  placeholder="Enter model description"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </Panel>
          : viewModel !== undefined ?
            <Panel toggleable header={viewModel.title}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizeAndLinkify(viewModel.description) }}
                ></div>
                <span>
                  by <a href={'#/user/' + viewModel.username}>{viewModel.username}</a> on{' '}
                  {viewModel.created_at}
                </span>
                <span>
                  <ModelStats model={viewModel} />
                </span>
              </div>
            </Panel>
          : <></>}

          {viewModel ?
            <CommentsPanel
              modelId={viewModel?.id}
              collapsed={!userPrefs.commentsPanelExpanded}
              onToggle={(e) => setUserPrefs({ commentsPanelExpanded: !e.value })}
            />
          : ''}
        </div>
        <div className={styles.main}>
          <div className={styles.mainSub}>
            <Panel toggleable header="Customizer">
              <CustomizerPanel
                parameterSet={parameterSet}
                parameterValues={parameterValues}
                onChange={(name, value) => {
                  setParameterValues((prev) => ({ ...prev, [name]: value }));
                  if (userPrefs.autoPreview) debouncedPreview();
                }}
              />
            </Panel>
            <Panel
              className={styles.panelLogs}
              toggleable
              header="Logs & Errors"
              collapsed={!userPrefs.logsPanelExpanded}
              onToggle={(e) => setUserPrefs({ logsPanelExpanded: !e.value })}
            >
              {error && (
                <pre
                  style={{
                    color: 'var(--color-danger)',
                  }}
                >
                  {error}
                </pre>
              )}
              {logs && <pre>{logs}</pre>}
              {!error && !logs && <pre>No logs or errors yet.</pre>}
            </Panel>
          </div>
          <Panel className={styles.panelEditor}>
            <Menubar
              style={{ width: '100%' }}
              model={[
                {
                  label: 'Preview (F5)',
                  icon: 'pi pi-play',
                  command: preview,
                  disabled: runningTaskName !== undefined,
                },
                {
                  label: 'Render (F6)',
                  icon: 'pi pi-play',
                  command: render,
                  disabled: runningTaskName !== undefined,
                },
                {
                  label: 'Publish (F8)',
                  icon: 'pi pi-upload',
                  command: handlePublish,
                  disabled: runningTaskName !== undefined || user?.id === undefined,
                  visible: viewModel === undefined || viewModel?.owner_id === user?.id,
                },
                {
                  label: 'Overwrite with remote source',
                  icon: 'pi pi-download color-danger',
                  command: handleFetchRemoteFile,
                  disabled: runningTaskName !== undefined,
                  visible: outdated,
                },
                {
                  icon: userPrefs.autoPreview ? 'pi pi-check-square' : 'pi pi-stop',
                  label: 'Auto-Preview',
                  disabled: false,
                  command: () => {
                    setUserPrefs({ autoPreview: !userPrefs.autoPreview });
                  },
                },
              ]}
              end={
                <div style={{ display: 'flex', gap: 8 }}>
                  {runningTaskName !== undefined && (
                    <>
                      <div style={{ flex: 1, alignContent: 'center' }}>{runningTaskName}</div>
                      <ProgressSpinner style={{ width: 40, height: 40 }} strokeWidth="8" />
                    </>
                  )}
                </div>
              }
            />
            <ZenMonacoPrime
              isInitializing={isLoading}
              path={getIndexScadFilePath()}
              homeFileProp={getIndexScadFilePath()}
              hideTopBar={true}
              markers={markers}
              onSave={(s) => handleOnSave()}
              reloadKey={editorReloadKey}
            />
          </Panel>
        </div>
      </div>
      <Dialog
        header="Publish Model"
        visible={publishDialogVisible}
        onHide={handleCancelPublish}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              label="Cancel"
              icon="pi pi-times"
              onClick={handleCancelPublish}
              className="p-button-text"
            />
            <Button label="Publish" icon="pi pi-upload" onClick={handleConfirmPublish} autoFocus />
          </div>
        }
        closable={false}
        modal
      >
        {editModel !== undefined && (
          <ModelCard
            model={{
              id: '',
              title: editModel.title,
              preview_url: publishPreviewDataUrl ?? '',
              owner_id: user?.id || '',
              username:
                user?.user_metadata?.user_name
                || user?.user_metadata?.name
                || user?.email
                || 'Unknown User',
              description: editModel.description,
              created_at: formatDate(new Date()),
              updated_at: formatDate(new Date()),
              likes: 0,
              comments: 0,
            }}
          />
        )}
      </Dialog>
      <Toast ref={toastRef} position="top-right" />
    </>
  );
}
