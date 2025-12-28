# Gantt Chart Widget

A Gantt chart visualization widget for SiYuan Note, displaying project timelines from database views.

> 🤖 **This widget is entirely designed and developed by AI.**
>
> 📦 **Based on [FullCalendar](https://fullcalendar.io/) open-source project.**

## Features

- ✅ Read project data from SiYuan database views
- ✅ Switch between week and month views
- ✅ Today indicator line (red) with date header highlight
- ✅ Weekend background highlighting
- ✅ **Drag and drop to adjust timelines, database auto-syncs**
- ✅ **Right-click to change status, database auto-syncs**
- ✅ Custom status colors
- ✅ Filter specific statuses
- ✅ Auto-save configuration
- ✅ Scrollable context menu for long status lists

## Requirements

- **SiYuan Note**: v2.10.0 or higher (requires stable database API support)

## Usage

### 1. Prepare Database

#### Option A: Use Provided Template (Easiest)

Download the template from the repository (both Chinese and English filenames are available) and import it into SiYuan Note:

- Chinese template: [`甘特图模板.sy.zip`](https://raw.githubusercontent.com/golddogfish/siyuan-gantt/main/%E7%94%98%E7%89%B9%E5%9B%BE%E6%A8%A1%E6%9D%BF.sy.zip)
- English template: [`Gantt Chart Template.sy.zip`](https://raw.githubusercontent.com/golddogfish/siyuan-gantt/main/Gantt%20Chart%20Template.sy.zip)

Import into SiYuan Note and it's ready to use.

#### Option B: Use Recommended Template

This widget also supports the [SiYuan Note Project Management Database Template](https://ld246.com/article/1732722385803).

**Important**: When using this template, you need to rename the first「状态」(Status) column to「完成情况」(Completion Status) to avoid conflicts with the second「状态」column, and to allow the widget to read data correctly.

#### Option C: Create Database Manually

Create a database in SiYuan Note with the following columns:

- **Project Name/Title**: Name of the project (支持：TODO、项目内容、项目名称、标题、headline、Project List)
- **Status**: Project status - single select type (支持：状态、status)
- **Start Date**: Project start date (支持：开始日、开始时间、开始日期、start)
- **End Date**: Project end date (支持：截止日、截止时间、截止日期、end)

> 💡 **Column Name Recognition**: The widget automatically recognizes the following column names (Chinese and English supported)

### 2. Insert Widget

Insert a widget in SiYuan Note and select "Gantt Chart".

### 3. Configure Widget

Click the ⚙️ button in the top-right corner:

1. **Enter Database ID**: Input your database block ID
2. **Select Hidden Statuses**: Check statuses you want to hide
3. **Customize Colors**: Choose colors for each status
4. Click "Save and Refresh"

### 4. View Gantt Chart

- Use toolbar to switch between week/month views
- **Drag color blocks to adjust timelines** - database auto-syncs
- **Right-click color blocks to change status** - database auto-syncs
- Scroll to view more projects

> ⚠️ **Sync Tip**: If data is not synced, click the ⚙️ button in the top-right corner, then click "Save and Refresh" to reload data.

## Configuration

Widget configuration is automatically saved to `/data/widgets/siyuan-gantt/gantt-config-{widgetId}.json`.

## Changelog

### v1.4.0 (2025-12-28)

- ✨ **English UI & robustness**: Added English UI support and robustness fixes to ensure toolbar and controls remain interactive after host re-renders.
- 🔧 **Fix**: Eliminated toolbar duplication/flashing by using FullCalendar API (`calendar.setOption`) and merging existing `customButtons` to preserve click handlers; added delegated click fallback and a MutationObserver to recover from host-side re-renders.
- 📁 **Config migration & backup**: Automatically migrates old saved configuration shapes (e.g., `customColorMap`) to the new format and creates timestamped backups before overwriting user config files.
- 🧪 **Tests**: Added/updated Puppeteer tests (locale, toolbar navigation with transient detection, config migration test, name parsing, real DB regression tests).
- 🔒 **Defaults**: DEBUG and profiling remain disabled by default; tests can enable page-level debugging via `TEST_DEBUG=1`.

### v1.3.4 (2025-12-18)

- ✅ Merge: v1.3.4 (from branch v1.3.2) merged into `main` and release package added at `releases/v1.3.4/package.zip`.
- ⚡ Minor: Packaging and documentation updates; includes prior perf and production-safety fixes.

### v1.3.2 (2025-12-18)

- 🔧 **Perf**: Added profiling helpers and `runProfile` harness; replaced direct remove/add calendar updates with `calendar.setOption('resources', ...)` and `calendar.setOption('events', ...)` to leverage FullCalendar's internal diffing (significant rendering/perf improvements for large datasets).
- 🔧 **Memory**: Reduced per-event listeners by switching to a delegated contextmenu handler and binding `data-event-id` to event DOM elements (reduces GC pressure when many events).
- 🧪 Added `scripts/offline_profile.js` and `scripts/generate_large_json.js` to reproduce and benchmark parsing/rendering with large test datasets (10k rows used for profiling).


### v1.3.1 (2025-12-18)

- 🔖 Bump: Save current working version as **v1.3.1**.
- ⚙️ Perf: Added initial debug/profiling flags and reduced noisy logging to prepare for performance profiling in v1.3.2.
- 🧾 Misc: Documentation and release artifacts updated (icon/preview included in release bundle).

### v1.3.0 (2025-12-17)

- ✨ New: Added **Light (bright) theme** and theme-detection on each refresh — widget now matches SiYuan's bright/dark mode when you click `刷新`.
- 🔧 Improved: Theme application now toggles classes on `html`/`body`/`#calendar` and forces FullCalendar layout refresh so styles take effect reliably.
- 🔧 Fixed: Settings panel (配色/状态复选框) now shows dark text on light theme and inputs/checkboxes are styled correctly.
- 🔧 Fixed: Today indicator and header underline retain the red styling in light theme and are not clipped by header backgrounds.
- 🔧 Improved: Scroll-sync between header and timeline is more robust (tries multiple selectors, short retries, and a one-time MutationObserver fallback).
- 🔧 Misc: Various small UI fixes and logging improvements.

### v1.2.0 (2025-12-16)

- ✨ New: Right-click on Gantt bars to change status directly
- ✨ New: Today's date header now has a red underline for better visibility
- 🔧 Fixed: Project names now properly remove trailing tags (e.g., `#1#`)
- 🔧 Fixed: Date range display now covers the full end date
- 🔧 Fixed: Context menu now scrollable when status list is too long
- 🎯 Changed: Drag restricted to horizontal only (no row switching)
- 🎯 Changed: Hidden the small triangle arrow on today indicator

### v1.1.0 (2025-12-16)

- 🔧 Fixed: Database ID now persists after closing the widget
- 🎯 Changed default view to week view
- 📍 Auto-scroll to center today's position when opening month view
- 🎨 Updated default color scheme (14 vibrant colors)
- ✨ Optimized Gantt bar vertical alignment with left-side text
- 🔄 Fixed left-right scroll synchronization issue
- ⚡ Improved scroll performance, reduced lag when switching views

### v1.0.0 (2025-12-14)

- Initial release
- Support reading data from database views
- Support week and month views
- Support custom status colors
- Support filtering specific statuses

## Development & Testing

- Run the local static server and run Puppeteer tests from project root (requires Node.js):
  - `node scripts/test_locale.js` — validates locale detection and UI translations (en/zh)
  - `node scripts/test_toolbar_navigation.js` — verifies toolbar remains stable when navigating views (detects transient duplication)
  - `node scripts/test_name_parse.js` — unit tests for name parsing from AV payloads
  - `node scripts/test_real_db.js` — exercises refresh/parsing using a real AV JSON payload (see `data/`).
  - Note: **DEBUG is disabled by default**; to enable page-level debug logs for this test set `TEST_DEBUG=1` in your shell before running the script.

- Debugging in a real SiYuan environment:
  1. Open DevTools console in SiYuan and enable debug logs: `window.DEBUG = true`.
  2. Open the Gantt widget, switch to week/month view and click prev/next repeatedly.
  3. To collect toolbar DOM snapshot: run `document.querySelector('.fc-toolbar').outerHTML` in Console and paste the output.

- Notes:
  - The toolbar duplication issue was fixed by using FullCalendar's API (`calendar.setOption`) instead of direct DOM `textContent` overrides to avoid render races.
  - Tests use Puppeteer and a small local server; no external network access is required.

### Config migration & backup

- On load the widget now **automatically migrates and merges** any existing saved configuration into the current format (no manual reconfiguration required after upgrades). Old keys (e.g., `customColorMap`) are detected and migrated to the new shape.
- Before overwriting a saved config the widget creates a timestamped backup at `/data/widgets/siyuan-gantt/gantt-config-<widgetId>.backup-<ts>.json` to allow rollback or inspection.
- You can test the migration logic with: `node scripts/test_config_migration.js` (this script simulates an older config and validates it is migrated and applied).

## License

GPL-3.0 License

## Author

goldfish
