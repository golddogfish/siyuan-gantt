# Gantt Chart Widget

A Gantt chart visualization widget for SiYuan Note, displaying project timelines from database views.

> 🤖 **This widget is entirely designed and developed with the assistance of AI.**
>
> 📦 **Based on [FullCalendar](https://fullcalendar.io/) open-source project.**

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

## License

MIT License

## Author

goldfish
