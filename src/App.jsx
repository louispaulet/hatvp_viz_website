import {
  BarChart3,
  Database,
  FileText,
  Landmark,
  Loader2,
  ShieldCheck,
  TableProperties,
  Users,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import MetricCard from './components/MetricCard.jsx';
import SalaryTable from './components/SalaryTable.jsx';
import SpouseNetworkChart from './components/SpouseNetworkChart.jsx';
import XmlViewer from './components/XmlViewer.jsx';
import {
  DECLARATION_URL_DATASET,
  PUBLICATION_DATASET,
  SALARY_DATASET,
  buildMonthlyPublicationSeries,
  formatCurrency,
  formatDeclarationFilename,
  formatNumber,
  getTopN,
  getYears,
  groupRowsByYear,
  normalizePublicationRows,
  normalizeSalaryRows,
  parseCsvFile,
  parseDeclarationUrlCsv,
  salaryStats,
} from './lib/data.js';
import {
  SPOUSE_DATASET,
  buildSpouseNetwork,
  buildSpouseStats,
  formatCount,
  getTopEntries,
  normalizeSpouseRows,
  parseTsvFile,
} from './lib/spouseData.js';
import { parseXml } from './lib/xml.js';

const PublicationsChart = lazy(() => import('./components/PublicationsChart.jsx'));

const tabs = [
  { id: 'classement', label: 'Classement', icon: TableProperties },
  { id: 'annees', label: 'Par année', icon: BarChart3 },
  { id: 'publications', label: 'Publications', icon: Database },
  { id: 'conjoints', label: 'Conjoints', icon: Users },
  { id: 'declarations', label: 'Déclarations', icon: FileText },
];

export default function App() {
  normalizeLegacyHash();

  return (
    <HashRouter>
      <Dashboard />
    </HashRouter>
  );
}

function normalizeLegacyHash() {
  if (typeof window === 'undefined') return;
  const legacyRoute = window.location.hash.replace('#', '');
  if (tabs.some((tab) => tab.id === legacyRoute)) {
    window.history.replaceState(null, '', `${window.location.pathname}#/${legacyRoute}`);
  }
}

function Dashboard() {
  const [spouseDataLoaded, setSpouseDataLoaded] = useState(false);
  const location = useLocation();
  const activeTab = tabs.find((tab) => location.pathname === `/${tab.id}`)?.id || 'classement';
  const [salaryRows, setSalaryRows] = useState([]);
  const [publicationRows, setPublicationRows] = useState([]);
  const [spouseRows, setSpouseRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [salaryData, publicationData, spouseText] = await Promise.all([
          parseCsvFile(SALARY_DATASET),
          parseCsvFile(PUBLICATION_DATASET),
          fetch(SPOUSE_DATASET).then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
          }),
        ]);

        const spouseData = await parseTsvFile(spouseText);
        setSalaryRows(normalizeSalaryRows(salaryData));
        setPublicationRows(normalizePublicationRows(publicationData));
        setSpouseRows(normalizeSpouseRows(spouseData));
        setSpouseDataLoaded(true);
      } catch {
        setError('Impossible de charger les jeux de données locaux.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const stats = useMemo(() => salaryStats(salaryRows), [salaryRows]);
  const spouseStats = useMemo(() => buildSpouseStats(spouseRows), [spouseRows]);
  const spouseNetwork = useMemo(() => buildSpouseNetwork(spouseRows), [spouseRows]);
  const spouseTopJobs = useMemo(() => getTopEntries(spouseStats.jobCounts, 8), [spouseStats.jobCounts]).filter((job) => !['néant', 'neant', 'non renseigné', 'non renseigne'].includes(job.label.toLowerCase()));

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="topbar" aria-label="Navigation principale">
          <NavLink className="brand" to="/classement">
            <Landmark size={24} aria-hidden="true" />
            <span>HATVP Viz</span>
          </NavLink>
          <div className="tabs" role="tablist" aria-label="Sections du tableau de bord">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink key={tab.id} to={`/${tab.id}`} role="tab" aria-selected={activeTab === tab.id} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
                  <Icon size={17} aria-hidden="true" />
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
        <div className="hero-content">
          <div>
            <p className="eyebrow">Transparence de la vie publique</p>
            <h1>Explorer les rémunérations déclarées des élus</h1>
            <p className="hero-copy">
              Un tableau de bord lisible pour parcourir les déclarations HATVP, comparer les rémunérations par année et suivre le rythme de publication des données.
            </p>
          </div>
          <div className="hero-badge">
            <ShieldCheck size={22} aria-hidden="true" />
            <span>Données publiques HATVP</span>
          </div>
        </div>
      </header>
      <main className="content">
        {error ? <div className="alert">{error}</div> : null}
        {loading ? <LoadingState /> : null}
        {!loading ? (
          <>
            <StatsGrid stats={stats} />
            <Routes>
              <Route path="/classement" element={<OverallView rows={salaryRows} />} />
              <Route path="/annees" element={<YearlyView rows={salaryRows} />} />
              <Route path="/publications" element={<PublicationsView rows={publicationRows} />} />
              <Route path="/conjoints" element={<SpouseView stats={spouseStats} network={spouseNetwork} topJobs={spouseTopJobs} loaded={spouseDataLoaded} />} />
              <Route path="/declarations" element={<DeclarationsView />} />
              <Route path="*" element={<Navigate to="/classement" replace />} />
            </Routes>
          </>
        ) : null}
      </main>
      <footer className="site-footer">
        <span>Honorables Analystes, Traqueurs et Vengeurs de la Probité</span>
        <a href="https://hatvp.thefrenchartist.dev/">hatvp.thefrenchartist.dev</a>
      </footer>
    </div>
  );
}

function LoadingState() {
  return <div className="loading-state"><Loader2 className="spin" size={28} aria-hidden="true" /><span>Chargement des données HATVP...</span></div>;
}

function StatsGrid({ stats }) {
  return <div className="metrics-grid"><MetricCard label="Lignes analysées" value={formatNumber(stats.declarations)} helper="mandats électifs" /><MetricCard label="Années couvertes" value={formatNumber(stats.years)} helper="dans le fichier local" /><MetricCard label="Rémunération moyenne" value={formatCurrency(stats.averageSalary)} helper="toutes lignes" /><MetricCard label="Maximum observé" value={formatCurrency(stats.maxSalary)} helper="classement global" /></div>;
}

function OverallView({ rows }) {
  const [mode, setMode] = useState('best');
  const tableRows = useMemo(() => getTopN(rows, mode === 'best' ? 'desc' : 'asc'), [mode, rows]);
  return <SalaryTable rows={tableRows} title={mode === 'best' ? 'Plus hautes rémunérations de tous les temps' : 'Plus basses rémunérations de tous les temps'} mode={mode} onModeChange={setMode} />;
}

function YearlyView({ rows }) {
  const [mode, setMode] = useState('best');
  const [selectedYear, setSelectedYear] = useState('');
  const years = useMemo(() => getYears(rows), [rows]);
  const groupedRows = useMemo(() => groupRowsByYear(rows), [rows]);
  const activeYear = selectedYear || years[0] || '';
  const tableRows = useMemo(() => getTopN(groupedRows[activeYear] || [], mode === 'best' ? 'desc' : 'asc'), [activeYear, groupedRows, mode]);
  return <div className="stack"><section className="panel compact-panel"><div><p className="eyebrow">Classement annuel</p><h2>Sélectionner une année de mandat</h2></div><select value={activeYear} onChange={(event) => setSelectedYear(event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><p className="note">Les salaires 2023 sont déclarés prorata temporis, ce qui peut les rendre plus faibles que les années complètes précédentes.</p></section><SalaryTable rows={tableRows} title={mode === 'best' ? `Plus hautes rémunérations en ${activeYear}` : `Plus basses rémunérations en ${activeYear}`} mode={mode} onModeChange={setMode} /></div>;
}

function PublicationsView({ rows }) {
  const series = useMemo(() => buildMonthlyPublicationSeries(rows), [rows]);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const peak = series.reduce((highest, row) => (row.count > highest.count ? row : highest), { count: 0, label: '' });
  return <div className="stack"><div className="metrics-grid two"><MetricCard label="Déclarations publiées" value={formatNumber(total)} helper="dans le fichier local" /><MetricCard label="Mois le plus dense" value={peak.label || '-'} helper={`${formatNumber(peak.count)} déclarations`} /></div><Suspense fallback={<div className="loading-state">Chargement du graphique...</div>}><PublicationsChart data={series} /></Suspense><section className="panel prose-panel"><p className="eyebrow">Lecture rapide</p><h2>Ce que montre le rythme de publication</h2><p>Le volume publié augmente nettement à partir de 2019, atteint un pic autour de 2020, puis se stabilise à un niveau plus élevé que les premières années observées. Cette vue sert surtout à repérer les périodes de forte publication et les variations de cadence.</p></section></div>;
}

function SpouseView({ stats, network, topJobs, loaded }) {
  const genderTotal = stats.genderCounts.female + stats.genderCounts.male + stats.genderCounts.unknown;
  return (
    <div className="stack">
      {loaded ? (
        <>
          <div className="metrics-grid two">
            <MetricCard
              label="Conjoints analysés"
              value={formatCount(stats.totalRows)}
              helper={`${formatCount(stats.uniquePoliticians)} élus distincts`}
            />
            <MetricCard
              label="Genre estimé"
              value={genderTotal ? `${Math.round((stats.genderCounts.female / genderTotal) * 100)} % femmes` : '-'}
              helper={`${formatCount(stats.genderCounts.female)} femmes · ${formatCount(stats.genderCounts.male)} hommes · ${formatCount(stats.genderCounts.unknown)} inconnus`}
            />
          </div>
          <div className="metrics-grid two">
            <MetricCard
              label="Métier le plus fréquent"
              value={topJobs[0]?.label || '-'}
              helper={topJobs[0] ? `${formatCount(topJobs[0].value)} occurrences` : 'aucune donnée'}
            />
            <MetricCard
              label="Deuxième métier"
              value={topJobs[1]?.label || '-'}
              helper={topJobs[1] ? `${formatCount(topJobs[1].value)} occurrences` : 'aucune donnée'}
            />
          </div>
          <SpouseNetworkChart nodes={network.nodes} links={network.links} />
          <section className="panel">
            <p className="eyebrow">Statistiques des conjoints</p>
            <h2>Jobs les plus fréquents</h2>
            <div className="job-list">
              {topJobs.map((job, index) => (
                <div key={job.label} className="job-item">
                  <strong>
                    {index + 1}. {job.label}
                  </strong>
                  <span>{formatCount(job.value)} déclarations</span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel prose-panel">
            <p className="eyebrow">Lecture rapide</p>
            <h2>Comment lire le graphe</h2>
            <p>
              Chaque élu est relié au métier de son conjoint. Deux élus partageant le même métier de conjoint se
              retrouvent donc connectés indirectement, ce qui crée des grappes amusantes à explorer. Les statistiques
              de genre restent indicatives, car elles reposent sur les indices disponibles dans les noms et titres.
            </p>
          </section>
        </>
      ) : (
        <div className="loading-state">Chargement des conjoints...</div>
      )}
    </div>
  );
}

function DeclarationsView() {
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [urlQuery, setUrlQuery] = useState('');
  const [xmlData, setXmlData] = useState(null);
  const [declarantData, setDeclarantData] = useState(null);
  const [status, setStatus] = useState('Chargement de la liste des déclarations...');
  const [isLoadingXml, setIsLoadingXml] = useState(false);
  const filteredUrls = useMemo(() => {
    const query = urlQuery.trim().toLowerCase();
    const filtered = query ? urls.filter((url) => url.toLowerCase().includes(query)) : urls;
    const capped = filtered.slice(0, 200);
    return selectedUrl && !capped.includes(selectedUrl) ? [selectedUrl, ...capped] : capped;
  }, [selectedUrl, urlQuery, urls]);

  useEffect(() => {
    fetch(DECLARATION_URL_DATASET)
      .then((response) => { if (!response.ok) throw new Error('Erreur réseau'); return response.text(); })
      .then((csv) => { const parsedUrls = parseDeclarationUrlCsv(csv); setUrls(parsedUrls); setSelectedUrl(parsedUrls[0] || ''); setStatus(parsedUrls.length ? '' : 'Aucune déclaration disponible.'); })
      .catch(() => setStatus('Impossible de charger la liste distante des déclarations.'));
  }, []);

  function loadDeclaration() {
    if (!selectedUrl) return;
    setIsLoadingXml(true);
    setStatus('');
    fetch(selectedUrl)
      .then((response) => { if (!response.ok) throw new Error('Erreur réseau'); return response.text(); })
      .then((xmlText) => { const parsed = parseXml(xmlText); setXmlData(parsed); setDeclarantData(parsed?.declarations?.declaration?.general?.declarant || null); })
      .catch(() => setStatus('Impossible de charger cette déclaration XML.'))
      .finally(() => setIsLoadingXml(false));
  }

  return <div className="stack"><section className="panel compact-panel"><div><p className="eyebrow">Déclaration brute</p><h2>Consulter le contenu XML public</h2></div><input value={urlQuery} onChange={(event) => setUrlQuery(event.target.value)} placeholder="Filtrer par numéro ou fragment d’URL" aria-label="Filtrer les déclarations disponibles" /><select value={selectedUrl} onChange={(event) => setSelectedUrl(event.target.value)}>{filteredUrls.map((url) => <option key={url} value={url}>{formatDeclarationFilename(url)}</option>)}</select><button className="primary-button" disabled={!selectedUrl || isLoadingXml} onClick={loadDeclaration}>{isLoadingXml ? 'Chargement...' : 'Charger la déclaration'}</button>{status ? <p className="note">{status}</p> : null}{!status && urls.length > filteredUrls.length ? <p className="note">{filteredUrls.length} résultats affichés sur {formatNumber(urls.length)}. Utilisez le filtre pour cibler une déclaration précise.</p> : null}</section>{declarantData ? <section className="panel"><p className="eyebrow">Données du déclarant</p><h2>Identité déclarée</h2><XmlViewer value={declarantData} compact initialDepth={4} /></section> : null}{xmlData ? <section className="panel"><p className="eyebrow">Toutes les données</p><h2>Déclaration complète</h2><XmlViewer value={xmlData} /></section> : null}</div>;
}
