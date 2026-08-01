function record(overrides = {}) {
  return {
    key: overrides.key || 'window-1',
    sourceIndex: overrides.sourceIndex || 0,
    appName: overrides.appName || 'Terminal',
    appId: overrides.appId || 'org.example.Terminal',
    title: overrides.title || 'Shell',
    workspaceId: overrides.workspaceId === undefined ? 1 : overrides.workspaceId,
    workspaceName: overrides.workspaceName === undefined ? '1' : overrides.workspaceName,
    workspaceActive: overrides.workspaceActive === true,
    monitorId: overrides.monitorId === undefined ? 0 : overrides.monitorId,
    monitorName: overrides.monitorName === undefined ? 'DP-1' : overrides.monitorName,
    minimized: overrides.minimized === true,
    urgent: overrides.urgent === true
  }
}

module.exports = { record }
