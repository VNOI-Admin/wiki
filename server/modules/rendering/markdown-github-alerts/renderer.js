import mdGithubAlerts from 'markdown-it-github-alerts';

// ------------------------------------
// Markdown - Github Alerts
// ------------------------------------


export function init(md, conf) {
  md.use(mdGithubAlerts);
}