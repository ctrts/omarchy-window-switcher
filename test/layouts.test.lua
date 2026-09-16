-- Runs hypr/layouts.lua against a stand-in for Hyprland's `hl` table.
-- Usage: XDG_STATE_HOME=<temp dir> lua test/layouts.test.lua <plugin dir>

local plugin_dir = assert(arg[1], "pass the plugin directory")
local source = plugin_dir .. "/hypr/layouts.lua"
local state_home = assert(os.getenv("XDG_STATE_HOME"), "set XDG_STATE_HOME to a temporary directory")

local function fresh_hyprland()
  local fake = { registered = {}, rules = {}, tiled = {}, timers = {} }
  _G.CTR_WINDOW_SWITCHER_LAYOUTS_REGISTERED = nil
  _G.hl = {
    layout = {
      register = function(name, provider)
        local full = "lua:" .. name
        if fake.registered[full] then error("hl.layout.register: layout '" .. full .. "' is already registered") end
        assert(type(provider.recalculate) == "function", "a provider needs recalculate")
        fake.registered[full] = provider
      end,
    },
    workspace_rule = function(spec)
      fake.rules[#fake.rules + 1] = spec
      fake.tiled[spec.workspace] = spec.layout
    end,
    get_workspace = function(selector)
      return fake.tiled[selector] and { tiled_layout = fake.tiled[selector] } or nil
    end,
    timer = function(callback, opts)
      assert(opts.type == "oneshot")
      fake.timers[#fake.timers + 1] = callback
    end,
  }
  return fake
end

local function box(x, y, w, h) return { x = x, y = y, w = w, h = h } end

-- The context helpers Hyprland provides, without gaps.
local function context(count)
  local targets = {}
  for i = 1, count do
    targets[i] = { index = i, place = function(self, placed) self.placed = placed end }
  end
  return {
    area = box(0, 0, 1200, 600),
    targets = targets,
    column = function(self, i, n) return box((i - 1) * 1200 / n, 0, 1200 / n, 600) end,
    row = function(self, i, n) return box(0, (i - 1) * 600 / n, 1200, 600 / n) end,
    grid_cell = function(self, i, columns, rows)
      return box(((i - 1) % columns) * 1200 / columns, math.floor((i - 1) / columns) * 600 / rows,
        1200 / columns, 600 / rows)
    end,
  }
end

local function read(path)
  local file = assert(io.open(path, "r"))
  local text = file:read("a")
  file:close()
  return text
end

-- Native layouts set a rule and save Omarchy's plain rule line.
local fake = fresh_hyprland()
local layouts = dofile(source)
layouts.apply("2", 2, "master-right", source)
assert(fake.rules[1].workspace == "2" and fake.rules[1].layout == "master")
assert(fake.rules[1].layout_opts.orientation == "right")
assert(next(fake.registered) == nil, "a native layout registers nothing")
local saved_path = state_home .. "/omarchy/workspace-layouts/2.lua"
assert(read(saved_path) == 'hl.workspace_rule({ workspace = "2", layout = "master", layout_opts = { orientation = "right" } })\n',
  "native layouts save the same line Omarchy's SUPER+L writes: " .. read(saved_path))

-- A new orientation on a workspace that is already master passes through
-- dwindle, and sets master on a later tick so Hyprland rebuilds the layout.
layouts.apply("2", 2, "master-top", source)
assert(fake.rules[2].layout == "dwindle", "an orientation change forces a layout rebuild")
assert(#fake.rules == 2 and #fake.timers == 1, "master waits for a later tick")
fake.timers[1]()
assert(fake.rules[3].layout == "master" and fake.rules[3].layout_opts.orientation == "top")

layouts.apply("2", 2, "dwindle", source)
assert(fake.rules[4].layout == "dwindle" and fake.rules[4].layout_opts == nil)
layouts.apply("2", 2, "master-left", source)
assert(fake.rules[5].layout == "master" and #fake.timers == 1, "coming from another layout needs no detour")

-- Arrangements register once per Lua state, however often they are applied.
layouts.apply("3", 3, "grid", source)
layouts.apply("3", 3, "columns", source)
layouts.apply("special:scratchpad", -98, "rows", source)
assert(fake.registered["lua:ctr-grid"] and fake.registered["lua:ctr-columns"] and fake.registered["lua:ctr-rows"])
assert(fake.rules[#fake.rules].workspace == "special:scratchpad")
assert(fake.rules[#fake.rules].layout == "lua:ctr-rows")

-- The saved arrangement registers its layout when a config reload loads it
-- into a fresh Lua state.
local reloaded = fresh_hyprland()
dofile(state_home .. "/omarchy/workspace-layouts/3.lua")
assert(reloaded.registered["lua:ctr-columns"], "a reload registers the saved arrangement")
assert(reloaded.rules[1].workspace == "3" and reloaded.rules[1].layout == "lua:ctr-columns")

-- If the plugin is gone, the saved file still loads; Hyprland falls back.
local orphan = fresh_hyprland()
local orphan_path = state_home .. "/orphan.lua"
local file = assert(io.open(orphan_path, "w"))
file:write((layouts.saved_text("4", "grid", state_home .. "/missing/layouts.lua")))
file:close()
dofile(orphan_path)
assert(next(orphan.registered) == nil)
assert(orphan.rules[1].layout == "lua:ctr-grid")

-- Refusals.
fresh_hyprland()
for _, bad in ipairs({
  { "2", 2, "nope" }, { "two", 2, "grid" }, { "2", 0, "grid" }, { "2", 1.5, "grid" },
  { 'special:x") os.exit(1) --', -5, "grid" },
}) do
  assert(not pcall(layouts.apply, bad[1], bad[2], bad[3], source), "refuses " .. tostring(bad[1]) .. " " .. tostring(bad[3]))
end

-- Placement.
local ctx = context(3)
layouts.ARRANGEMENTS.columns(ctx)
assert(ctx.targets[3].placed.x == 800 and ctx.targets[3].placed.w == 400)
ctx = context(3)
layouts.ARRANGEMENTS.rows(ctx)
assert(ctx.targets[2].placed.y == 200 and ctx.targets[2].placed.w == 1200)
ctx = context(5)
layouts.ARRANGEMENTS.grid(ctx)
assert(ctx.targets[4].placed.x == 0 and ctx.targets[4].placed.y == 300, "5 windows make a 3 by 2 grid")
assert(ctx.targets[5].placed.w == 400)
layouts.ARRANGEMENTS.grid(context(0))

print("ok - window switcher hypr layouts")
