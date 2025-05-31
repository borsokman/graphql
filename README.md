# graphql

A simple profile dashboard built with vanilla HTML, CSS, and JavaScript that connects to the 01 Gritlab GraphQL API.

## 🔐 Features

- Login with email/username + password using JWT authentication
- Fetch and display user profile info from the GraphQL API
- Visualize stats with SVG-based charts:
  - 📊 XP by Project (bar chart)
  - 📈 XP by Exercise (area + line chart with tooltips)
- Auto login if token is saved
- Logout functionality
- Fully hosted and accessible via GitHub Pages

## 🚀 Live Demo

👉 [https://borsokman.github.io/graphql/](https://borsokman.github.io/graphql/)

## 📦 Tech Stack

- HTML, CSS, JavaScript
- GraphQL (01 platform endpoint)
- SVG (no external libraries)

## 📊 Data Queried

- `user` table: ID, login, name, campus, etc.
- `transaction` table: XP amounts by project/exercise
- `object` table (nested): names and types
- Aggregate queries: total XP

## 🧠 Learning Goals

- Understand GraphQL queries (basic, nested, with arguments)
- Work with JWT tokens and API authentication
- Build dynamic SVG charts
- Improve UI/UX without any frontend frameworks
- Deploy and host using GitHub Pages

## 📁 Folder Structure

