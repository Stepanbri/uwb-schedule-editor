# UWB Schedule Editor

[![Netlify Status](https://api.netlify.com/api/v1/badges/f875eae7-dfdb-41e9-a915-1e4895ab7d07/deploy-status)](https://app.netlify.com/projects/curious-zabaione-0a80f5/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React-based web application for students at the University of West Bohemia (UWB) to create, edit, and manage their course schedules. Integrates with the university's STAG system.

![UWB Schedule Editor Screenshot](https://via.placeholder.com/800x450?text=UWB+Schedule+Editor+Screenshot)

## Features

- **Course Management**: Add, remove, and organize courses in your schedule
- **STAG Integration**: Import courses directly from the university's STAG system
- **Preference Management**: Set time preferences to optimize your schedule
- **Schedule Generation**: Algorithm to automatically generate optimal schedules
- **Multi-language Support**: Available in Czech and English
- **Responsive Design**: Works on desktop and mobile devices
- **Export Functionality**: Save and export your schedule as an image

## Quick Start

```bash
# Clone repository
git clone https://github.com/stepanbri/uwb-schedule-editor.git
cd uwb-schedule-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser: `http://localhost:5173`

## Commands

- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

## Project Structure

The project follows a feature-based architecture with these main components:

- **Services**: Course, CourseEvent, Schedule, StagApi, Workspace classes
- **Features**: Editor, FAQ page, Landing page, Navigation components
- **Contexts**: Snackbar, StagApi, Theme, Workspace providers
- **Internationalization**: Czech and English translations

## About the Project

This Schedule Planner was created as a semester project for the KIV/UUR (User Interface Design) course at the Faculty of Applied Sciences, University of West Bohemia. The goal was to build a modern and user-friendly tool for students to plan their schedules before the official course registration.

## Acknowledgements

- University of West Bohemia for providing the STAG API
- Ing. Richard Lipka, Ph.D., and Ing. Michal Nykl, Ph.D., for their instruction in KIV/UUR

---

## UWB Schedule Editor (Česky)

[![Netlify Status](https://api.netlify.com/api/v1/badges/f875eae7-dfdb-41e9-a915-1e4895ab7d07/deploy-status)](https://app.netlify.com/projects/curious-zabaione-0a80f5/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Webová aplikace založená na Reactu, umožňující studentům Západočeské univerzity (ZČU) vytvářet a spravovat své rozvrhy. Integruje se s univerzitním systémem STAG.

## Funkce

- **Správa předmětů**: Přidávání a organizace předmětů v rozvrhu
- **Integrace se STAGem**: Import předmětů přímo z univerzitního systému
- **Správa preferencí**: Nastavení časových preferencí pro optimalizaci
- **Generování rozvrhu**: Algoritmus pro automatické generování rozvrhů
- **Vícejazyčná podpora**: Dostupné v češtině a angličtině
- **Responzivní design**: Funguje na počítačích i mobilních zařízeních
- **Funkce exportu**: Uložení a export rozvrhu jako obrázku

## Rychlý start

```bash
# Klonování repozitáře
git clone https://github.com/stepanbri/uwb-schedule-editor.git
cd uwb-schedule-editor

# Instalace závislostí
npm install

# Spuštění vývojového serveru
npm run dev
```

Otevřete prohlížeč: `http://localhost:5173`

## Příkazy

- **Vývoj**: `npm run dev`
- **Sestavení**: `npm run build`
- **Lint**: `npm run lint`
- **Formátování**: `npm run format`

## O projektu

Tento Plánovač rozvrhu vznikl jako semestrální práce v rámci předmětu KIV/UUR (Úvod do uživatelských rozhraní) na Fakultě aplikovaných věd Západočeské univerzity v Plzni. Cílem bylo vytvořit uživatelsky přívětivý nástroj pro studenty k sestavení rozvrhu před oficiálním termínem předezápisu.

## Poděkování

- Západočeská univerzita za poskytnutí STAG API
- Ing. Richard Lipka, Ph.D., a Ing. Michal Nykl, Ph.D., za vedení předmětu KIV/UUR
