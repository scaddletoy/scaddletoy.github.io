export function Footer() {
  return (
    <footer
      className="maxw"
      style={{
        zIndex: 10,
        paddingTop: 8,
        paddingBottom: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, display: 'flex', gap: 16, fontSize: 14, flexWrap: 'wrap' }}>
        <a href="#/about">About</a>
        <a href="#/terms">Terms & Privacy</a>
        {/*<a href="#/stats">Stats</a>*/}
        <a href="https://learnxinyminutes.com/openscad/" target="_blank" rel="noopener noreferrer">
          Learn OpenSCAD in Y minutes
        </a>
        <a
          href="https://openscad.org/cheatsheet/index.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenSCAD Cheat Sheet
        </a>
      </div>

      <div style={{ flex: 0, display: 'flex' }}>
        <a
          href="https://github.com/markusmo3"
          className="p-button p-button-text p-button-icon-only"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="pi pi-user"></i>
        </a>
        <a
          href="https://github.com/scaddletoy/scaddletoy.github.io"
          className="p-button p-button-text p-button-icon-only"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="pi pi-github"></i>
        </a>
      </div>
    </footer>
  );
}
