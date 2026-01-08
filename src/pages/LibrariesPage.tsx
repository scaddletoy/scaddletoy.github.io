import React from 'react';
import { zipArchives } from '../services/fs/zip-archives';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const archivesArray = Object.entries(zipArchives)
  .filter((entry) => entry[0] != 'fonts')
  .map(([name, archive]) => ({
    name,
    ...archive,
  }));

const NameBody = (rowData: any) =>
  rowData.gitOrigin && rowData.gitOrigin.repoUrl ?
    <a href={rowData.gitOrigin.repoUrl} target="_blank" rel="noopener noreferrer">
      {rowData.name}
    </a>
  : rowData.name;

const DocsBody = (rowData: any) =>
  rowData.docs ?
    <ul style={{ margin: 0, paddingLeft: 16 }}>
      {Object.entries(rowData.docs).map(([docName, docUrl]) => (
        <li key={docName}>
          <a href={String(docUrl)} target="_blank" rel="noopener noreferrer">
            {docName}
          </a>
        </li>
      ))}
    </ul>
  : null;

const IncludedFilesBody = (rowData: any) =>
  rowData.gitOrigin?.include ?
    <div>{JSON.stringify(rowData.gitOrigin.include[0].glob)}</div>
  : null;

const LibrariesPage: React.FC = () => {
  return (
    <div className="page">
      <h1>Libraries</h1>
      <div>
        The OpenSCAD libraries listed below are available for use in your ScaddleToy projects. You
        can <code>use</code> or <code>include</code> them just like in a local OpenSCAD
        installation.
        <br />
        <br />
        <b>How to use:</b>
        <br />
        <ul>
          <li>
            In the editor, type <code>use &lt;LIBRARY_NAME/FILE.scad&gt;;</code> or{' '}
            <code>include &lt;LIBRARY_NAME/FILE.scad&gt;;</code> at the top of your script. You will
            get auto-completion for available libraries, their files and functions/modules.
          </li>
          <li>
            <code>use</code> imports only the public modules and functions (those not starting with{' '}
            <code>_</code>), and does not execute code outside of modules/functions.
          </li>
          <li>
            <code>include</code> imports everything, including variables and code outside
            modules/functions, and can be used for scripts that need to run initialization code.
          </li>
        </ul>
      </div>
      <DataTable value={archivesArray} scrollable stripedRows>
        <Column header="Name" body={NameBody} style={{ minWidth: 120 }} />
        <Column field="description" header="Description" style={{ minWidth: 200 }} />
        <Column header="Docs" body={DocsBody} style={{ minWidth: 120 }} />
        <Column header="Included Files" body={IncludedFilesBody} style={{ minWidth: 180 }} />
      </DataTable>
    </div>
  );
};

export default LibrariesPage;
