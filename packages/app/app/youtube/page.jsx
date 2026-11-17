'use client';

import { useEffect, useMemo, useState } from 'react';
import './youtube.css';

const STORAGE_KEY = 'timeoe-youtube-studio-v1';
const pillars = [
  { id: 'african-affairs', name: 'African affairs & accountability', share: '30%' },
  { id: 'history-culture', name: 'African history & culture', share: '20%' },
  { id: 'business-innovation', name: 'Business, economy & innovation', share: '20%' },
  { id: 'technology-futures', name: 'Technology & future ideas', share: '15%' },
  { id: 'people-podcasts', name: 'People, interviews & podcasts', share: '15%' },
];

const starterIdeas = [
  { id: 'seed-1', topic: 'Who is responsible for maintaining public roads in Edo State?', pillar: 'african-affairs', format: 'LONG', status: 'IDEA', createdAt: 'Starter idea' },
  { id: 'seed-2', topic: 'An overlooked chapter in African history', pillar: 'history-culture', format: 'SHORT', status: 'IDEA', createdAt: 'Starter idea' },
  { id: 'seed-3', topic: 'How small businesses can use AI in Africa', pillar: 'business-innovation', format: 'LONG', status: 'IDEA', createdAt: 'Starter idea' },
];

function makePackage(idea) {
  const clean = idea.topic.trim();
  return {
    title: clean,
    titleOptions: [clean, 'What you need to know about: ' + clean, 'The bigger story behind ' + clean],
    hook: 'Start with the most surprising verified fact or question about: ' + clean,
    outline: ['The question: explain why this matters to the audience.', 'The evidence: present primary sources and verifiable facts.', 'The context: explain what happened and why.', 'The other perspective: include relevant responses and counter-evidence.', 'The takeaway: explain what viewers should understand next.'],
    thumbnail: 'One clear subject, strong contrast, 2–4 words maximum. Do not imply facts that the video does not establish.',
    checklist: ['Verify every factual claim and date', 'Save source links and publication dates', 'Separate fact, allegation and opinion', 'Request a response where a person or institution is criticised', 'Check footage, music and image rights'],
  };
}

export default function YouTubeStudioPage() {
  const [ideas, setIdeas] = useState(starterIdeas);
  const [packages, setPackages] = useState([]);
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState(pillars[0].id);
  const [format, setFormat] = useState('SHORT');
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('ideas');
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [oauthMessage, setOauthMessage] = useState('');
  const [youtubeChannelTitle, setYoutubeChannelTitle] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) {
        setIdeas(Array.isArray(saved.ideas) ? saved.ideas : starterIdeas);
        setPackages(Array.isArray(saved.packages) ? saved.packages : []);
      }
    } catch { /* Start with the safe starter workspace. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ideas, packages }));
  }, [ideas, packages, loaded]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('youtube_connected') === '1') {
      setYoutubeConnected(true);
      setOauthMessage('Google authorization completed. Your refresh token is encrypted in the server-side vault. No video has been published.');
    } else if (params.get('youtube_error') === '1') {
      setOauthMessage('YouTube could not be connected. Check the Google OAuth redirect URI and consent-screen setup, then try again.');
    }

    fetch('/api/youtube/status', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.connected) {
          setYoutubeConnected(true);
          setYoutubeChannelTitle(data.channelTitle || '');
          setOauthMessage('Connected channel: ' + (data.channelTitle || 'YouTube channel') + '. Refresh token is encrypted server-side. Public publishing remains disabled.');
        }
      })
      .catch(() => {});
  }, []);

  const counts = useMemo(() => ({
    ideas: ideas.length,
    inProduction: packages.filter((p) => p.status === 'IN PRODUCTION').length,
    awaitingApproval: packages.filter((p) => p.status === 'AWAITING APPROVAL').length,
    ready: packages.filter((p) => p.status === 'APPROVED').length,
  }), [ideas, packages]);

  function addIdea(event) {
    event.preventDefault();
    if (!topic.trim()) return;
    setIdeas((current) => [{ id: crypto.randomUUID(), topic: topic.trim(), pillar, format, status: 'IDEA', createdAt: new Date().toISOString() }, ...current]);
    setTopic('');
    setTab('ideas');
  }

  function createDraft(idea) {
    if (packages.some((p) => p.ideaId === idea.id)) return;
    setPackages((current) => [{ id: crypto.randomUUID(), ideaId: idea.id, topic: idea.topic, pillar: idea.pillar, format: idea.format, status: 'IN PRODUCTION', draft: makePackage(idea), createdAt: new Date().toISOString() }, ...current]);
    setTab('production');
  }

  function updateStatus(id, status) {
    setPackages((current) => current.map((p) => p.id === id ? { ...p, status } : p));
  }

  function removeIdea(id) {
    setIdeas((current) => current.filter((idea) => idea.id !== id));
  }

  return (
    <main className="yt-shell">
      <header className="yt-header">
        <div>
          <div className="yt-kicker">TIMEŒ / CREATOR SYSTEMS</div>
          <h1>YouTube <span>Growth Studio</span></h1>
          <p>Editorial planning and production workspace for The African Record TV</p>
        </div>
        <a className="yt-channel" href="https://youtube.com/@theafricanrecordtv" target="_blank" rel="noreferrer">↗ @theafricanrecordtv</a>
      </header>

      <section className="yt-notice">
        <strong>YOUTUBE CONNECTION</strong>
        <span>{oauthMessage || (youtubeConnected ? 'YouTube account connected. Public publishing remains disabled until a separate review and upload test.' : 'Connect the Google account that owns The African Record TV. This protected preview only requests channel read and video upload permission.')}</span>
        <a className="yt-primary small yt-connect" href="/api/youtube/oauth/start">{youtubeConnected ? 'Reconnect channel' : 'Connect YouTube channel'}</a>
      </section>

      <section className="yt-stats">
        <article><small>IDEAS</small><b>{counts.ideas}</b><span>Editorial backlog</span></article>
        <article><small>IN PRODUCTION</small><b>{counts.inProduction}</b><span>Draft packages</span></article>
        <article><small>AWAITING APPROVAL</small><b>{counts.awaitingApproval}</b><span>Human review</span></article>
        <article><small>APPROVED</small><b>{counts.ready}</b><span>Ready for next step</span></article>
      </section>

      <section className="yt-layout">
        <div className="yt-main">
          <div className="yt-tabs">
            <button className={tab === 'ideas' ? 'active' : ''} onClick={() => setTab('ideas')}>Idea desk</button>
            <button className={tab === 'production' ? 'active' : ''} onClick={() => setTab('production')}>Production</button>
            <button className={tab === 'strategy' ? 'active' : ''} onClick={() => setTab('strategy')}>Strategy</button>
          </div>

          {tab === 'ideas' && <>
            <section className="yt-panel">
              <div className="yt-panel-head"><div><h2>Capture a content idea</h2><p>Build a focused editorial backlog. Every idea should serve a clear viewer promise.</p></div></div>
              <form className="yt-form" onSubmit={addIdea}>
                <label>Topic or working headline<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. What the new budget means for Edo roads" required /></label>
                <div className="yt-form-row">
                  <label>Editorial pillar<select value={pillar} onChange={(e) => setPillar(e.target.value)}>{pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                  <label>Format<select value={format} onChange={(e) => setFormat(e.target.value)}><option value="SHORT">Short</option><option value="LONG">Long-form</option><option value="PODCAST">Podcast / interview</option></select></label>
                </div>
                <button className="yt-primary" type="submit">Add to idea desk <span>＋</span></button>
              </form>
            </section>
            <section className="yt-panel">
              <div className="yt-panel-head"><div><h2>Editorial backlog</h2><p>Turn a promising idea into a structured production brief.</p></div><span className="yt-count">{ideas.length} ITEMS</span></div>
              <div className="yt-list">
                {ideas.map((idea) => {
                  const pillarName = pillars.find((p) => p.id === idea.pillar)?.name || 'Unassigned';
                  const exists = packages.some((p) => p.ideaId === idea.id);
                  return <article className="yt-idea" key={idea.id}>
                    <div className="yt-idea-meta"><span>{idea.format}</span><span>{pillarName}</span></div>
                    <h3>{idea.topic}</h3>
                    <div className="yt-idea-actions"><button className="yt-primary small" disabled={exists} onClick={() => createDraft(idea)}>{exists ? 'In production' : 'Create production brief'}</button><button className="yt-quiet" onClick={() => removeIdea(idea.id)}>Remove</button></div>
                  </article>;
                })}
                {!ideas.length && <div className="yt-empty">Your idea desk is clear. Add your first story above.</div>}
              </div>
            </section>
          </>}

          {tab === 'production' && <section className="yt-panel">
            <div className="yt-panel-head"><div><h2>Production workspace</h2><p>Structured outlines are starting points, not fact-checked scripts. Add source evidence before approval.</p></div></div>
            <div className="yt-list">
              {packages.map((item) => <article className="yt-package" key={item.id}>
                <div className="yt-idea-meta"><span>{item.format}</span><span>{item.status}</span></div>
                <h3>{item.topic}</h3>
                <div className="yt-draft-block"><b>Opening hook</b><p>{item.draft.hook}</p></div>
                <div className="yt-draft-block"><b>Suggested title options</b><ol>{item.draft.titleOptions.map((t) => <li key={t}>{t}</li>)}</ol></div>
                <div className="yt-draft-block"><b>Story structure</b><ol>{item.draft.outline.map((t) => <li key={t}>{t}</li>)}</ol></div>
                <div className="yt-draft-block"><b>Thumbnail direction</b><p>{item.draft.thumbnail}</p></div>
                <div className="yt-draft-block"><b>Editorial checks</b>{item.draft.checklist.map((c) => <label className="yt-check" key={c}><input type="checkbox" />{c}</label>)}</div>
                <div className="yt-idea-actions"><button className="yt-primary small" onClick={() => updateStatus(item.id, 'AWAITING APPROVAL')}>Submit for human review</button><button className="yt-quiet" onClick={() => updateStatus(item.id, 'IN PRODUCTION')}>Keep editing</button><button className="yt-quiet" onClick={() => updateStatus(item.id, 'APPROVED')}>Mark approved</button></div>
                <p className="yt-caution">Approval here is an editorial planning status only. It does not publish anything to YouTube.</p>
              </article>)}
              {!packages.length && <div className="yt-empty">No production briefs yet. Create one from the Idea desk.</div>}
            </div>
          </section>}

          {tab === 'strategy' && <section className="yt-panel">
            <div className="yt-panel-head"><div><h2>Channel strategy</h2><p>A coherent editorial mix for African stories, people, power, ideas and innovation.</p></div></div>
            <div className="yt-pillars">{pillars.map((p) => <div className="yt-pillar" key={p.id}><div><b>{p.name}</b><small>{p.share} of planned coverage</small></div><strong>{p.share}</strong></div>)}</div>
            <div className="yt-schedule"><h3>Initial publishing experiment</h3><div className="yt-schedule-grid"><div><b>3</b><span>Shorts / week</span></div><div><b>1</b><span>Long video / week</span></div><div><b>14</b><span>Days before review</span></div></div><p>Keep this sustainable baseline until channel analytics provide enough evidence to adjust. Do not increase volume just to meet a quota.</p></div>
            <div className="yt-guardrails"><h3>Editorial guardrails</h3><ul><li>Separate verified facts, allegations, analysis and unanswered questions.</li><li>Keep source links, dates and evidence with each investigation.</li><li>Seek a response from people or institutions criticised.</li><li>Check copyright and usage rights for footage, images and music.</li><li>Human approval before public publishing or comment replies.</li></ul></div>
          </section>}
        </div>

        <aside className="yt-side">
          <section className="yt-panel"><h2>Agent operating status</h2><div className="yt-status-row"><span>Editorial planning</span><b className="ok">READY</b></div><div className="yt-status-row"><span>Local draft storage</span><b className="ok">ACTIVE</b></div><div className="yt-status-row"><span>Grokbot</span><b>DISCONNECTED</b></div><div className="yt-status-row"><span>YouTube OAuth</span><b className={youtubeConnected ? 'ok' : ''}>{youtubeConnected ? 'CONNECTED' : 'READY TO CONNECT'}</b></div><div className="yt-status-row"><span>Live analytics</span><b>NOT CONNECTED</b></div><div className="yt-status-row"><span>Auto publishing</span><b>DISABLED</b></div></section>
          <section className="yt-panel"><h2>Production principles</h2><ul className="yt-side-list"><li>Audience promise first</li><li>Strong opening in the first 10 seconds</li><li>Evidence before conclusions</li><li>Packaging must match the story</li><li>Review results after 14 days</li></ul></section>
          <section className="yt-panel yt-help"><h2>Connection security</h2><p>Google refresh tokens are encrypted server-side. This preview cannot publish automatically. Human review and a private upload test remain required before any public release.</p></section>
        </aside>
      </section>
      <footer className="yt-footer">TIMEŒ GROWTH SYSTEM <span>•</span> THE AFRICAN RECORD TV <span>•</span> {loaded ? 'LOCAL WORKSPACE READY' : 'LOADING'}</footer>
    </main>
  );
}
