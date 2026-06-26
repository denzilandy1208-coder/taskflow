/**
 * functions/index.js — Firebase Cloud Functions for TaskFlow
 * ──────────────────────────────────────────────────────────
 * Provides two email-sending functions backed by SendGrid:
 *
 *   1. sendWelcomeEmail  — Auth trigger: fires automatically whenever a
 *      new user creates an account (Email/Password or Google Sign-In).
 *
 *   2. sendTaskSummary   — HTTPS callable: the frontend calls this to
 *      email the signed-in user a summary of their current tasks.
 *
 * Environment variables (set via Firebase CLI, never hardcode):
 *   SENDGRID_API_KEY   — your SendGrid API key (starts with SG.)
 *   SENDGRID_FROM      — your verified sender address (e.g. you@gmail.com)
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated }  = require('firebase-functions/v2/firestore');
const { auth }               = require('firebase-functions/v2');
const admin                  = require('firebase-admin');
const sgMail                 = require('@sendgrid/mail');

admin.initializeApp();

// ── Helper: initialise SendGrid from environment ──────────────────
function initSG() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new HttpsError('failed-precondition', 'SendGrid API key not configured.');
  sgMail.setApiKey(key);
  return process.env.SENDGRID_FROM || 'noreply@taskflow.app';
}

// ══════════════════════════════════════════════════════════════════
//  1. WELCOME EMAIL  (Auth onCreate trigger)
// ══════════════════════════════════════════════════════════════════

exports.sendWelcomeEmail = auth.user().onCreate(async (user) => {
  const from = initSG();
  const name = user.displayName || user.email.split('@')[0];

  const msg = {
    to:      user.email,
    from,
    subject: `Welcome to TaskFlow, ${name}! 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#0B1120; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; color:#E8EFF9; }
    .wrap { max-width:560px; margin:40px auto; padding:0 20px; }
    .card { background:#131E35; border-radius:16px; padding:40px 36px; border:1px solid rgba(255,255,255,.08); }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
    .logo-icon { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#4F8EF7,#818CF8); display:flex; align-items:center; justify-content:center; font-size:20px; text-align:center; line-height:40px; }
    .logo-name { font-size:22px; font-weight:800; background:linear-gradient(90deg,#4F8EF7,#818CF8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    h1 { font-size:24px; font-weight:700; margin:0 0 8px; }
    p  { color:#94A3B8; font-size:15px; line-height:1.6; margin:0 0 20px; }
    .cta { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#4F8EF7,#818CF8); color:#fff; font-weight:700; font-size:15px; border-radius:10px; text-decoration:none; margin:8px 0 24px; }
    .feature { display:flex; gap:14px; align-items:flex-start; margin-bottom:16px; }
    .feat-icon { font-size:22px; flex-shrink:0; margin-top:2px; }
    .feat-title { font-size:14px; font-weight:600; color:#E8EFF9; margin-bottom:2px; }
    .feat-desc  { font-size:13px; color:#94A3B8; }
    .footer { margin-top:32px; padding-top:20px; border-top:1px solid rgba(255,255,255,.07); font-size:12px; color:#3D5170; text-align:center; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✦</div>
      <span class="logo-name">TaskFlow</span>
    </div>

    <h1>Welcome, ${name}! 👋</h1>
    <p>Your TaskFlow workspace is ready. Here's what you can do right now:</p>

    <div class="feature">
      <div class="feat-icon">☑</div>
      <div>
        <div class="feat-title">Manage your tasks</div>
        <div class="feat-desc">Add, organise, and track tasks by category and priority.</div>
      </div>
    </div>
    <div class="feature">
      <div class="feat-icon">🏆</div>
      <div>
        <div class="feat-title">Earn XP &amp; rewards</div>
        <div class="feat-desc">Complete tasks to earn experience points and level up.</div>
      </div>
    </div>
    <div class="feature">
      <div class="feat-icon">🎤</div>
      <div>
        <div class="feat-title">Voice task creation</div>
        <div class="feat-desc">Tap the mic button and speak your task out loud.</div>
      </div>
    </div>
    <div class="feature">
      <div class="feat-icon">✦</div>
      <div>
        <div class="feat-title">AI Assistant</div>
        <div class="feat-desc">Get intelligent suggestions and help planning your work.</div>
      </div>
    </div>

    <a class="cta" href="https://denzilandy1208-coder.github.io/taskflow/">Open TaskFlow →</a>

    <p style="margin-bottom:0">Happy tasking!<br><strong style="color:#E8EFF9">The TaskFlow Team</strong></p>
  </div>
  <div class="footer">
    You received this because you created a TaskFlow account with ${user.email}.<br>
    © ${new Date().getFullYear()} TaskFlow
  </div>
</div>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    console.log('[TaskFlow] Welcome email sent to', user.email);
  } catch (err) {
    console.error('[TaskFlow] Welcome email failed:', err.response?.body || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════
//  2. TASK SUMMARY EMAIL  (HTTPS Callable)
// ══════════════════════════════════════════════════════════════════

exports.sendTaskSummary = onCall(async (request) => {
  // Must be signed in
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to send a task summary.');
  }

  const { tasks, userName, userEmail } = request.data;

  if (!Array.isArray(tasks)) {
    throw new HttpsError('invalid-argument', 'tasks must be an array.');
  }

  const from = initSG();
  const name = userName || userEmail?.split('@')[0] || 'there';

  const total     = tasks.length;
  const done      = tasks.filter(t => t.done).length;
  const pending   = total - done;
  const overdue   = tasks.filter(t => !t.done && t.due && new Date(t.due) < new Date()).length;
  const pct       = total ? Math.round((done / total) * 100) : 0;

  // Group pending tasks by priority
  const high   = tasks.filter(t => !t.done && t.priority === 'high');
  const medium = tasks.filter(t => !t.done && t.priority === 'medium');
  const low    = tasks.filter(t => !t.done && t.priority === 'low');

  function taskRow(t) {
    const priorityColor = { high: '#F87171', medium: '#FBBF24', low: '#34D399' };
    const color = priorityColor[t.priority] || '#94A3B8';
    const dueStr = t.due ? ` <span style="color:#94A3B8;font-size:12px">· due ${new Date(t.due).toLocaleDateString()}</span>` : '';
    return `<tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px;vertical-align:middle"></span>
      <span style="color:#E8EFF9;font-size:14px">${t.title}</span>${dueStr}
    </td></tr>`;
  }

  const sections = [
    high.length   ? `<h3 style="color:#F87171;font-size:13px;margin:20px 0 4px;text-transform:uppercase;letter-spacing:.05em">🔴 High priority</h3><table style="width:100%">${high.map(taskRow).join('')}</table>`   : '',
    medium.length ? `<h3 style="color:#FBBF24;font-size:13px;margin:20px 0 4px;text-transform:uppercase;letter-spacing:.05em">🟡 Medium priority</h3><table style="width:100%">${medium.map(taskRow).join('')}</table>` : '',
    low.length    ? `<h3 style="color:#34D399;font-size:13px;margin:20px 0 4px;text-transform:uppercase;letter-spacing:.05em">🟢 Low priority</h3><table style="width:100%">${low.map(taskRow).join('')}</table>`   : '',
  ].filter(Boolean).join('');

  const msg = {
    to:      userEmail,
    from,
    subject: `Your TaskFlow summary — ${done}/${total} tasks done`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#0B1120; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; color:#E8EFF9; }
    .wrap { max-width:560px; margin:40px auto; padding:0 20px; }
    .card { background:#131E35; border-radius:16px; padding:40px 36px; border:1px solid rgba(255,255,255,.08); }
    .logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
    .logo-icon { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#4F8EF7,#818CF8); text-align:center; line-height:40px; font-size:20px; }
    .logo-name { font-size:22px; font-weight:800; background:linear-gradient(90deg,#4F8EF7,#818CF8); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    .stat-row { display:flex; gap:12px; margin:24px 0; }
    .stat { flex:1; background:rgba(255,255,255,.04); border-radius:10px; padding:14px; text-align:center; border:1px solid rgba(255,255,255,.07); }
    .stat-num { font-size:26px; font-weight:800; margin-bottom:2px; }
    .stat-lbl { font-size:11px; color:#94A3B8; text-transform:uppercase; letter-spacing:.05em; }
    .progress-bar { height:8px; border-radius:4px; background:rgba(255,255,255,.08); margin:16px 0 24px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,#4F8EF7,#818CF8); width:${pct}%; transition:width .5s; }
    .cta { display:inline-block; padding:13px 26px; background:linear-gradient(135deg,#4F8EF7,#818CF8); color:#fff; font-weight:700; font-size:14px; border-radius:10px; text-decoration:none; margin-top:24px; }
    .footer { margin-top:32px; padding-top:20px; border-top:1px solid rgba(255,255,255,.07); font-size:12px; color:#3D5170; text-align:center; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">
      <div class="logo-icon">✦</div>
      <span class="logo-name">TaskFlow</span>
    </div>

    <h1 style="font-size:22px;margin:0 0 6px">Hi ${name}, here's your task summary</h1>
    <p style="color:#94A3B8;font-size:14px;margin:0 0 0">Generated on ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-num" style="color:#4F8EF7">${total}</div>
        <div class="stat-lbl">Total</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#34D399">${done}</div>
        <div class="stat-lbl">Done</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#FBBF24">${pending}</div>
        <div class="stat-lbl">Pending</div>
      </div>
      <div class="stat">
        <div class="stat-num" style="color:#F87171">${overdue}</div>
        <div class="stat-lbl">Overdue</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;font-size:13px;color:#94A3B8;margin-bottom:6px">
      <span>Progress</span><span style="color:#E8EFF9;font-weight:600">${pct}%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill"></div></div>

    ${pending > 0 ? `<h2 style="font-size:16px;margin:0 0 4px">Pending tasks</h2>${sections}` : '<p style="color:#34D399;font-weight:600;font-size:15px">🎉 All tasks complete — amazing work!</p>'}

    <a class="cta" href="https://denzilandy1208-coder.github.io/taskflow/">Open TaskFlow →</a>
  </div>
  <div class="footer">
    Sent to ${userEmail} · <a href="#" style="color:#3D5170">Unsubscribe</a><br>
    © ${new Date().getFullYear()} TaskFlow
  </div>
</div>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    console.log('[TaskFlow] Task summary sent to', userEmail);
    return { success: true };
  } catch (err) {
    console.error('[TaskFlow] Task summary failed:', err.response?.body || err.message);
    throw new HttpsError('internal', 'Failed to send email. Please try again.');
  }
});
