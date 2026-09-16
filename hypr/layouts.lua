-- Workspace layouts for ctr.window-switcher. Runs inside Hyprland's Lua, never
-- inside the shell: the switcher loads it with dofile() through a dispatch
-- request, and saved workspace files load it again after a config reload.
--
-- The layout ids here must match model/Layouts.js; test/all checks both lists.

local M = {}

-- Prefix for the arrangement layouts this module registers. Hyprland adds
-- "lua:" to every registered name, so a rule names "lua:ctr-grid".
M.PREFIX = "ctr-"

-- Hyprland's own layouts. Master orientations are one layout with an option.
M.NATIVE = {
  dwindle = { layout = "dwindle" },
  scrolling = { layout = "scrolling" },
  monocle = { layout = "monocle" },
  ["master-left"] = { layout = "master", opts = { orientation = "left" } },
  ["master-right"] = { layout = "master", opts = { orientation = "right" } },
  ["master-top"] = { layout = "master", opts = { orientation = "top" } },
  ["master-center"] = { layout = "master", opts = { orientation = "center" } },
}

-- Arrangements are real tiled layouts rather than a one-off float and move,
-- so windows opened or closed later still fall into the chosen shape.
M.ARRANGEMENTS = {
  columns = function(ctx)
    local count = #ctx.targets
    for i, target in ipairs(ctx.targets) do
      target:place(ctx:column(i, count))
    end
  end,

  rows = function(ctx)
    local count = #ctx.targets
    for i, target in ipairs(ctx.targets) do
      target:place(ctx:row(i, count))
    end
  end,

  grid = function(ctx)
    local count = #ctx.targets
    if count == 0 then return end
    local columns = math.ceil(math.sqrt(count))
    local rows = math.ceil(count / columns)
    for i, target in ipairs(ctx.targets) do
      target:place(ctx:grid_cell(i, columns, rows))
    end
  end,
}

function M.layout_name(id)
  return "lua:" .. M.PREFIX .. id
end

-- hl.layout.register rejects a name that already exists, and the Lua state
-- lives until the next config reload, so registration happens once per state.
-- A reload builds a fresh state, which clears this flag with the layouts.
function M.register()
  if CTR_WINDOW_SWITCHER_LAYOUTS_REGISTERED then return end
  for id, recalculate in pairs(M.ARRANGEMENTS) do
    hl.layout.register(M.PREFIX .. id, { recalculate = recalculate })
  end
  CTR_WINDOW_SWITCHER_LAYOUTS_REGISTERED = true
end

function M.rule(selector, id)
  local native = M.NATIVE[id]
  if native then
    return { workspace = selector, layout = native.layout, layout_opts = native.opts }
  end
  if M.ARRANGEMENTS[id] then
    return { workspace = selector, layout = M.layout_name(id) }
  end
  return nil
end

local function valid_selector(selector)
  return type(selector) == "string"
    and (selector:match("^%d+$") ~= nil or selector:match("^special:[%w_%-]+$") ~= nil)
end

local function valid_file_id(file_id)
  return math.type(file_id) == "integer" and file_id ~= 0
end

local function shell_quote(path)
  return "'" .. path:gsub("'", "'\\''") .. "'"
end

function M.state_dir()
  local state_home = os.getenv("XDG_STATE_HOME")
  if not state_home or state_home == "" then
    state_home = (os.getenv("HOME") or "") .. "/.local/state"
  end
  return state_home .. "/omarchy/workspace-layouts"
end

-- The saved rule uses the same file Omarchy's own layout toggle (SUPER+L)
-- writes, so whichever of the two ran last is what a config reload restores.
function M.saved_text(selector, id, source_path)
  local rule = M.rule(selector, id)
  local fields = { string.format("workspace = %q", rule.workspace), string.format("layout = %q", rule.layout) }
  if rule.layout_opts then
    fields[#fields + 1] = string.format("layout_opts = { orientation = %q }", rule.layout_opts.orientation)
  end
  local line = "hl.workspace_rule({ " .. table.concat(fields, ", ") .. " })\n"
  if not M.ARRANGEMENTS[id] then return line end

  -- An arrangement only exists once this module registers it. If the plugin
  -- has since been removed, the rule names an unknown layout and Hyprland
  -- falls back to its default instead of failing the config load.
  return "-- Written by ctr.window-switcher.\n"
    .. string.format("local ok, layouts = pcall(dofile, %q)\n", source_path)
    .. "if ok and type(layouts) == \"table\" then pcall(layouts.register) end\n"
    .. line
end

function M.save(file_id, text)
  local dir = M.state_dir()
  local path = dir .. "/" .. tostring(file_id) .. ".lua"
  local file = io.open(path, "w")
  if not file then
    os.execute("mkdir -p " .. shell_quote(dir))
    file = io.open(path, "w")
  end
  if not file then return false end
  file:write(text)
  file:close()
  return true
end

function M.apply(selector, file_id, id, source_path)
  if not valid_selector(selector) then error("window switcher: invalid workspace " .. tostring(selector)) end
  if not valid_file_id(file_id) then error("window switcher: invalid workspace id " .. tostring(file_id)) end
  local rule = M.rule(selector, id)
  if not rule then error("window switcher: unknown layout " .. tostring(id)) end

  if M.ARRANGEMENTS[id] then M.register() end
  -- Hyprland rebuilds a workspace's layout only when the layout name changes,
  -- so a new master orientation on a workspace that is already master would
  -- update the rule and move nothing. Passing through dwindle forces the
  -- rebuild, but only if master arrives on a later tick: two rules in the same
  -- call collapse into one and still move nothing.
  local deferred = false
  if rule.layout_opts and hl.get_workspace and hl.timer then
    local ok, workspace = pcall(hl.get_workspace, selector)
    if ok and workspace and workspace.tiled_layout == rule.layout then
      hl.workspace_rule({ workspace = selector, layout = "dwindle" })
      hl.timer(function() hl.workspace_rule(rule) end, { timeout = 1, type = "oneshot" })
      deferred = true
    end
  end
  if not deferred then hl.workspace_rule(rule) end
  if type(source_path) == "string" and source_path ~= "" then
    M.save(file_id, M.saved_text(selector, id, source_path))
  end
end

return M
