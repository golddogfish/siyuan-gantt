# Gantt Chart Widget

A Gantt chart visualization widget for SiYuan Note, displaying project timelines from database views.

## Features

- ✅ Read project data from SiYuan database views
- ✅ Switch between week and month views
- ✅ Today indicator line (red)
- ✅ Weekend background highlighting
- ✅ Drag and drop to adjust project timelines
- ✅ Custom status colors
- ✅ Filter specific statuses
- ✅ Auto-save configuration

## Usage

### 1. Prepare Database

Create a database in SiYuan Note with the following columns:

- **Project Name/Title**: Name of the project
- **Status**: Project status (single select type)
- **Start Date**: Project start date
- **End Date**: Project end date

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
- Drag color blocks to adjust project timelines
- Scroll to view more projects

## Configuration

Widget configuration is automatically saved to `/data/widgets/siyuan-gantt/gantt-config-{widgetId}.json`.

## Changelog

### v1.0.0 (2025-12-14)

- Initial release
- Support reading data from database views
- Support week and month views
- Support custom status colors
- Support filtering specific statuses

## License

MIT License

## Author

arrebol
