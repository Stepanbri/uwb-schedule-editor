# UWB Schedule Editor

A React-based web application for students at the University of West Bohemia (UWB) to create, edit, and manage their course schedules. The application integrates with the university's STAG system to import course data and provides an intuitive interface for building an optimal schedule.

![UWB Schedule Editor Screenshot](https://via.placeholder.com/800x450?text=UWB+Schedule+Editor+Screenshot)

## 🌟 Features

- **Course Management**: Add, remove, and organize courses in your schedule
- **STAG Integration**: Import courses directly from the university's STAG system
- **Preference Management**: Set time preferences to optimize your schedule
- **Schedule Generation**: Algorithm to automatically generate optimal schedules based on preferences
- **Multi-language Support**: Available in Czech and English
- **Responsive Design**: Works on desktop and mobile devices
- **Export Functionality**: Save and export your schedule as an image

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/stepanbri/uwb-schedule-editor.git
   cd uwb-schedule-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## 🛠️ Building for Production

To build the application for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## 🧪 Linting and Formatting

### Linting

To lint your code:

```bash
npm run lint
```

### Formatting with Prettier

This project uses Prettier for consistent code formatting. The configuration is defined in `.prettierrc.json` with the following settings:

```json
{
    "tabWidth": 4,
    "printWidth": 100,
    "singleQuote": true,
    "trailingComma": "es5",
    "bracketSpacing": true,
    "endOfLine": "lf",
    "semi": true
}
```

Excluded files and directories are specified in `.prettierignore`:

```
# Build artifacts
dist/
build/

# Node modules
node_modules/

# Cache directories
.cache/
.vite/

# Generated files
coverage/
*.min.js

# Environment files
.env*

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

To format your code with Prettier, you can add a script to `package.json`:

```json
"scripts": {
  "format": "prettier --write \"src/**/*.{js,jsx,json,css}\""
}
```

Then run:

```bash
npm run format
```

For best results, consider using the Prettier extension in your code editor for formatting on save.

## 🧩 Project Structure

```text
uwb-schedule-editor/
├── public/
│   └── locales/       # Translation files for i18n
│       ├── cs/        # Czech translations
│       └── en/        # English translations
├── src/
│   ├── assets/        # Static assets like images
│   ├── constants/     # Application constants
│   ├── contexts/      # React context providers
│   ├── features/      # Feature-based components
│   │   ├── editor/    # Main schedule editor components
│   │   ├── faq/       # FAQ page components
│   │   ├── landing/   # Landing page components
│   │   └── navigation/ # Navigation components
│   ├── services/      # Business logic and data handling
│   ├── styles/        # Global styles
│   └── utils/         # Utility functions
├── .eslintrc.json     # ESLint configuration
├── .prettierrc.json   # Prettier configuration
└── vite.config.js     # Vite configuration
```

## 🧠 Core Components

### Services

- **CourseClass**: Represents a course with its metadata and events
- **CourseEventClass**: Represents a specific course event (lecture, seminar, etc.)
- **ScheduleClass**: Manages the enrolled course events and schedule operations
- **StagApiService**: Handles integration with the STAG API
- **WorkspaceService**: Manages workspace data and persistence

### Features

- **Editor**: The main schedule editing interface
- **CourseBar**: Lists available and enrolled courses
- **PropertyBar**: Manages user preferences and settings
- **ScheduleBox**: Visual representation of the schedule

## 🔄 Integration with STAG

The application integrates with the UWB STAG system to:

1. Authenticate users
2. Load course data for selected departments
3. Import courses from student study plans
4. Fetch available course events

## 🌐 Internationalization

The application supports Czech and English languages using the i18next library. Translation files are located in the `public/locales` directory.

## 🎨 Styling

The application uses Material UI (MUI) for its UI components and styling, with a custom theme that supports both light and dark modes.

## 🧩 Dependencies

Major dependencies include:

- React (v19)
- React Router (v7)
- Material UI (v7)
- i18next for internationalization
- html2canvas for exporting schedules as images

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- University of West Bohemia for providing the STAG API
- All contributors who have helped with the development
