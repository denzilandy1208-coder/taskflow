/**
 * emailjs-config.example.js
 * ─────────────────────────────────────────────────────────────────
 * TEMPLATE — copy this file to emailjs-config.js and fill in your
 * real values. emailjs-config.js is gitignored and must NEVER be
 * committed to version control.
 *
 * How to get these values
 * ───────────────────────
 * 1. Sign up free at https://www.emailjs.com
 * 2. Email Services → Add New Service → connect your Gmail/Outlook
 *    → copy the Service ID (e.g. "service_abc123")
 * 3. Email Templates → Create New Template:
 *
 *    WELCOME TEMPLATE variables to use in your template:
 *      {{to_name}}   — user's display name
 *      {{to_email}}  — recipient address  (set "To Email" field to {{to_email}})
 *      {{app_url}}   — link back to the app
 *
 *    SUMMARY TEMPLATE variables:
 *      {{to_name}}   — user's display name
 *      {{to_email}}  — recipient address
 *      {{total}}     — total task count
 *      {{done}}      — completed count
 *      {{pending}}   — pending count
 *      {{overdue}}   — overdue count
 *      {{task_list}} — plain-text list of pending tasks
 *      {{app_url}}   — link back to the app
 *
 * 4. Account → API Keys → copy your Public Key
 */

export const emailjsConfig = {
  publicKey:         'REPLACE_WITH_YOUR_PUBLIC_KEY',
  serviceId:         'REPLACE_WITH_YOUR_SERVICE_ID',
  welcomeTemplateId: 'REPLACE_WITH_YOUR_WELCOME_TEMPLATE_ID',
  summaryTemplateId: 'REPLACE_WITH_YOUR_SUMMARY_TEMPLATE_ID',
};
