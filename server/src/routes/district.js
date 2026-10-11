import { Router } from 'express';
import School from '../models/School.js';
import Decision from '../models/Decision.js';
import { summarizeSchool, leaderboardWindowStart } from '../services/leaderboard.js';
import { publicRateLimit } from '../middleware/publicRateLimit.js';

const router = Router();
const daysFrom = req => Math.min(90, Math.max(1, Number.parseInt(req.query.days, 10) || 30));
async function summary(days) {
  const since = leaderboardWindowStart(new Date(), days);
  const schools = await School.find({ optedInToLeaderboard: true }).select('name slug');
  const decisions = await Decision.find({ schoolId: { $in: schools.map(s => s._id) }, date: { $gte: since }, source: 'live' }).sort({ date: 1 });
  return { days, generated_at: new Date().toISOString(), schools: schools.map(school => summarizeSchool(school, decisions, new Date(), days)).sort((a, b) => (a.last_incident_notice_missing ? -1 : b.last_incident_notice_missing ? 1 : (a.mean_minutes ?? Infinity) - (b.mean_minutes ?? Infinity))) };
}
router.get('/summary', publicRateLimit, async (req, res) => res.json(await summary(daysFrom(req))));
router.get('/csv', publicRateLimit, async (req, res) => {
  const result = await summary(daysFrom(req));
  const fields = ['school_id','name','slug','breaches','mean_minutes','p95_minutes','escalations','last_incident_at','last_incident_minutes'];
  const csvCell = value => { let text=String(value??''); if (/^[=+@\-]/.test(text)) text=`'${text}`; return `"${text.replaceAll('"','""')}"`; };
  const csv = [fields.join(','), ...result.schools.map(row => fields.map(key => csvCell(row[key])).join(','))].join('\r\n');
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="saans-district-summary.csv"' }).send(csv);
});
export async function renderDistrictPage(req, res) {
  const result = await summary(daysFrom(req));
  const rows = result.schools.map(row => `<tr><td><a href="/p/${encodeURIComponent(row.slug)}">${escapeHtml(row.name)}</a></td><td>${row.breaches}</td><td>${row.breaches === 0 ? 'no incidents' : row.mean_minutes == null ? '<span class="bad">no notice</span>' : row.mean_minutes}</td><td>${row.p95_minutes ?? '—'}</td><td>${row.escalations}</td><td>${row.last_incident_at ? new Date(row.last_incident_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td></tr>`).join('');
  res.type('html').send(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saans district response</title><style>body{font:16px system-ui;margin:0;background:#f4f7f3;color:#18332c}main{max-width:1100px;margin:32px auto;padding:20px}h1{font-size:clamp(2rem,5vw,3rem)}p{line-height:1.6}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #dce5df}th{background:#e9f1eb}a{color:#14664c}.bad{color:#a22;font-weight:700}.scroll{overflow:auto}footer{margin-top:20px;color:#50645c}</style><main><p>SAANS · DISTRICT VIEW</p><h1>Minutes from breach to notice</h1><p>Last ${result.days} days. Only schools that opted in appear. Response time runs from the first school-hour reading above AQI 300 to notice approval or successful delivery.</p><p><a href="/api/district/csv?days=${result.days}">Download CSV</a></p><div class="scroll"><table><thead><tr><th>School</th><th>Breaches (${result.days} d)</th><th>Mean minutes</th><th>p95 minutes</th><th>Escalations</th><th>Last incident</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No opted-in school data is available yet.</td></tr>'}</tbody></table></div><footer>Last updated ${new Date(result.generated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Schools can opt in or out in settings.</footer></main></html>`);
}
router.get('/page', renderDistrictPage);
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
export default router;
