import { Navbar } from './components/navbar.tsx';
import { Route, Routes } from 'react-router-dom';
import { Footer } from './components/footer.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { lazy, Suspense } from 'react';
import { CenteredSpinner } from './components/CenteredSpinner.tsx';

const HomePage = lazy(() => import('./pages/HomePage.tsx'));
const ModelGallery = lazy(() => import('./pages/ModelGallery.tsx'));
const EditorPage = lazy(() => import('./pages/EditorPage.tsx'));
const ZenFSPage = lazy(() => import('./pages/ZenFSPage.tsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.tsx'));
const TermsAndPrivacyPage = lazy(() => import('./pages/TermsAndPrivacyPage.tsx'));
const LibrariesPage = lazy(() => import('./pages/LibrariesPage.tsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.tsx'));
const UserPage = lazy(() => import('./pages/UserPage.tsx'));

function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: '100vw',
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      <div className="nav" style={{ flex: '0 0 auto', background: '#000' }}>
        <Navbar />
      </div>
      <div
        className="maxw app"
        style={{
          flex: '1 1 auto',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          marginTop: 16,
          marginBottom: 16,
          gap: 16,
        }}
      >
        <Suspense fallback={<CenteredSpinner text="Loading page" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/user/:username/*" element={<UserPage />} />
            <Route path="/tag/:tag" element={<ModelGallery />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsAndPrivacyPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/zenfs" element={<ZenFSPage />} />
            <Route path="/model/:modelId" element={<EditorPage />} />
            <Route path="/model/new" element={<EditorPage />} />
            <Route path="/libraries" element={<LibrariesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <div className="nav" style={{ flex: '0 0 auto', background: '#000' }}>
        <Footer />
      </div>
    </div>
  );
}

export default App;
