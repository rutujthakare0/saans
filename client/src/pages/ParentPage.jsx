import { useEffect, useState } from 'react';

const formatTime = value => value ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hourCycle: 'h23' }).format(new Date(value)) : null;
export default function ParentPage({ slug }) {
  const [data, setData] = useState(null);
  const [language, setLanguage] = useState('en');
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/${encodeURIComponent(slug)}/today`).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'School update unavailable.');
      return body;
    }).then(body => { if (!cancelled) setData(body); }).catch(error => { if (!cancelled) setData({ state: 'error', error: error.message }); });
    return () => { cancelled = true; };
  }, [slug]);
  if (!data) return <main className="public-page"><article className="public-card"><Brand/><p className="public-loading">Loading today’s school update…</p></article></main>;
  if (data.state === 'error') return <main className="public-page"><article className="public-card"><Brand/><h1>School update unavailable</h1><p className="public-warning">{data.error}</p></article></main>;
  const hindi = language === 'hi';
  const hi = {
    time: 'खुले में गतिविधि का समय', cancel: 'आज बाहरी गतिविधियाँ रद्द हैं।',
    why: `स्कूल समय में अनुमानित वायु गुणवत्ता: ${data.category} (AQI ~${data.aqi})। यह मॉडल पर आधारित अनुमान है, स्वास्थ्य सलाह नहीं।`,
    stale: 'आज की जाँच उपलब्ध नहीं है। ताज़ा जानकारी के लिए कृपया स्कूल से संपर्क करें.',
    pending: 'स्कूल आज की जानकारी की समीक्षा कर रहा है। अभी कोई अपडेट घोषित नहीं है।',
    none: 'आज बाहरी गतिविधियों पर कोई पाबंदी घोषित नहीं है।', sent: 'भेजा गया', checked: 'अंतिम जाँच', disclaimer: 'वायु गुणवत्ता का अनुमान मॉडल पर आधारित है और स्वास्थ्य सलाह नहीं है।'
  };
  return <main className="public-page"><article className="public-card"><Brand schoolName={data.schoolName}/>
    <div className="public-toggle"><button className={!hindi ? 'active' : ''} onClick={() => setLanguage('en')}>English</button><button className={hindi ? 'active' : ''} onClick={() => setLanguage('hi')}>हिन्दी</button></div>
    {data.state === 'sent' ? <><div className="eyebrow">{hindi ? 'आज की स्कूल अपडेट' : 'TODAY’S SCHOOL UPDATE'}</div><h1>{hindi ? (data.action === 'cancel_outdoor' ? 'आज बाहरी गतिविधियाँ रद्द हैं' : 'आज बाहरी गतिविधियाँ सीमित हैं') : data.headline}</h1>
      {data.action === 'limit_outdoor' ? <div className="public-status">{hindi ? hi.time : 'Outdoor time only between'} <b>{data.bestWindow ? `${data.bestWindow.start}–${data.bestWindow.end}` : (hindi ? 'आज कोई उपयुक्त समय नहीं' : 'No suitable outdoor window today')}</b></div> : <div className="public-status">{hindi ? hi.cancel : 'No outdoor time today.'}</div>}
      <p className="public-notice" lang={language}>{data.notice?.[language] || data.notice?.en}</p><p className="public-meta">{hindi ? hi.why : `Estimated school-hours air quality: ${data.category} (AQI ~${data.aqi}). Modelled estimate, not a health advisory.`}</p><small className="public-meta">{data.dataLabel}</small><footer className="public-meta">{data.schoolName} · {hindi ? hi.sent : 'Sent'} {formatTime(data.sentAt)} IST</footer>
    </> : data.state === 'stale' ? <><div className="eyebrow">SCHOOL AIR UPDATE</div><h1 className="public-stale">{hindi ? 'आज की जाँच उपलब्ध नहीं है' : 'Not checked today'}</h1><p className="public-status">{hindi ? hi.stale : 'Today’s air has not been checked yet. Please contact the school for current information.'}</p></> : data.state === 'pending' ? <><div className="eyebrow">{hindi ? 'आज की स्कूल अपडेट' : 'TODAY’S SCHOOL UPDATE'}</div><h1>{hindi ? 'स्कूल समीक्षा कर रहा है' : 'Update under review'}</h1><p className="public-status">{hindi ? hi.pending : 'The school is reviewing today’s plan. No update has been announced yet.'}</p></> : <><div className="eyebrow">{hindi ? 'आज की स्कूल अपडेट' : 'TODAY’S SCHOOL UPDATE'}</div><h1>{hindi ? hi.none : 'No outdoor restrictions announced today'}</h1><p className="public-status">{hindi ? `अंतिम जाँच ${formatTime(data.lastCheckedAt)} IST पर हुई।` : `Last checked ${formatTime(data.lastCheckedAt)} IST.`}</p></>}
    {data.state === 'sent' && <a className="public-ack-link" href="/parent/login">{hindi ? 'पढ़ने की पुष्टि के लिए लॉग इन करें' : 'Log in to acknowledge'}</a>}
    <div className="public-warning">{hindi ? hi.disclaimer : 'Air-quality estimates are modelled and are not a health advisory.'}</div>
  </article></main>;
}
function Brand({ schoolName }) { return <div className="public-brand"><span className="brand-mark">सा</span><div><b>saans</b>{schoolName && <small>{schoolName}</small>}</div></div>; }
