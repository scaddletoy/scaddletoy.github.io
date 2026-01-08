import { Card } from 'primereact/card';
import { TabPanel, TabView } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import ZenMonacoPrime from '../components/ZenMonacoPrime.tsx';
import ModelViewer, { ModelViewerHandle } from '../components/ModelViewer.tsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkSyntax,
  OpenSCADRenderArgs,
  ParameterSet,
  render as runOpenSCADRender,
} from '../services/openscad-wasm-runner/actions.ts';
import { fs } from '@zenfs/core';
import { exportGlb } from '../services/io/export_glb.ts';
import { parseOff } from '../services/io/import_off.ts';
import { Menubar } from 'primereact/menubar';
import CustomizerPanel from '../components/CustomizerPanel.tsx';
import { Dialog } from 'primereact/dialog';
import { ModelCard } from '../components/ModelCard';
import { EditModel, SupabaseService, ViewModelDetails } from '../services/SupabaseService.ts';
import { Toast } from 'primereact/toast';
import defaultScad from '../components/default-scad.ts';
import { createEditorZenFS, readFileSafe, writeFileSafe } from '../services/fs/filesystem.ts';
import { InputTextarea } from 'primereact/inputtextarea';
import { exportStl } from '../services/io/export_stl';
import { ProgressSpinner } from 'primereact/progressspinner';
import { ModelStats } from '../components/ModelStats.tsx';
import { formatDate, getHashQueryParam, hashSha1, sanitizeAndLinkify } from '../utils.ts';
import { CommentsCard } from '../components/CommentsCard';
import { CenteredSpinner } from '../components/CenteredSpinner.tsx';
import { useParams } from 'react-router-dom';
import { useUserContext } from '../state/UseUserContext.tsx';
import type * as monaco from 'monaco-editor';

type EditorPageProps = {
  viewModelId?: string;
};

export default function EditorPage({ viewModelId }: EditorPageProps) {
  const { modelId } = useParams();
  if (modelId) viewModelId = modelId;
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
          vars: parameterValues,
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
    const indexScadFilePath = getIndexScadFilePath();
    const modelSource = await SupabaseService.fetchModelSource(currentModelId);
    if (modelSource === undefined) throw new Error('Failed to fetch model source');
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

  function handleOnSave() {
    setIsOutdated(true);
    return customizer();
  }

  return (
    <div
      className="editor-page-container"
      style={{ flexDirection: largePreview ? 'column' : undefined }}
    >
      {/* Left column: 1/3 width */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100%',
              maxHeight: '85vh',
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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
                label: 'Reset View',
                icon: 'pi pi-refresh',
                command: () => {
                  viewerRef.current?.resetView();
                },
              },
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
            style={{
              padding: 8,
              background: 'none',
              border: 'none',
            }}
          />
        </div>

        {(
          !isReadonly
          && user?.id !== undefined
          && (viewModel === undefined || viewModel?.owner_id === user?.id)
          && editModel !== undefined
        ) ?
          <Card className="card-body-p16" style={{ background: '#111' }}>
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
          </Card>
        : viewModel !== undefined ?
          <Card title={viewModel.title} className="card-body-p16" style={{ background: '#111' }}>
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
          </Card>
        : <></>}
        {viewModel ?
          <CommentsCard modelId={viewModel?.id} />
        : ''}
      </div>
      {/* Right column: 2/3 width */}
      <div
        style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          gap: 16,
          maxHeight: '90vh',
        }}
      >
        <TabView
          className="tab-view-flex"
          activeIndex={activeTabIndex}
          onTabChange={(e) => setActiveTabIndex(e.index)}
          panelContainerStyle={{ padding: 0, background: '#111' }}
        >
          <TabPanel header="Customizer">
            <CustomizerPanel
              parameterSet={parameterSet}
              parameterValues={parameterValues}
              onChange={(name, value) => setParameterValues((prev) => ({ ...prev, [name]: value }))}
            />
          </TabPanel>
          <TabPanel header="EditorPage" style={{ background: '#111' }}>
            <ZenMonacoPrime
              isInitializing={isLoading}
              style={{ width: '100%', height: '100%' }}
              path={getIndexScadFilePath()}
              homeFileProp={getIndexScadFilePath()}
              hideTopBar={true}
              markers={markers}
              onSave={(s) => handleOnSave()}
              reloadKey={editorReloadKey}
            />
          </TabPanel>
          <TabPanel header="Logs & Error">
            <div style={{ overflow: 'auto' }}>
              {error && (
                <pre
                  style={{
                    margin: 0,
                    padding: 16,
                    background: 'transparent',
                    color: 'var(--color-danger)',
                  }}
                >
                  {error}
                </pre>
              )}
              {logs && (
                <pre style={{ margin: 0, padding: 16, background: 'transparent' }}>{logs}</pre>
              )}
              {!error && !logs && <span>No logs or errors yet.</span>}
            </div>
          </TabPanel>
        </TabView>
        <Menubar
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
            ...(user ?
              [
                {
                  label: 'Publish (F8)',
                  icon: 'pi pi-upload',
                  command: handlePublish,
                  disabled: runningTaskName !== undefined,
                  visible: viewModel === undefined || viewModel?.owner_id === user?.id,
                },
              ]
            : []),
            {
              label: 'Overwrite with remote source',
              icon: 'pi pi-download color-danger',
              command: handleFetchRemoteFile,
              disabled: runningTaskName !== undefined,
              visible: outdated,
            },
          ]}
          style={{
            flex: 0,
            background: '#111',
            padding: 8,
            border: 'none',
          }}
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
    </div>
  );
}
