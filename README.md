# Class Points App

<p>
  <img src="weeble.svg" alt="ClassPoints Logo" width="80" height="auto" align=left style="margin-right: 15px;">
</p>

Class Points is a simple and engaging web application for tracking, managing, and rewarding students in a classroom setting. It allows teachers to assign points, customize avatars, celebrate achievements, and sync data across devices.

## 🚀 Features

- **Student Management**: Add, remove, and update students easily.
- **Point System**: Award points (+1, +5, +10) and track progress.
- **Avatar Customization**: Modify student avatars with unique styles.
- **Bulk Actions**: Select multiple students to update points at once.
- **Celebration Mode**: Launch confetti to celebrate student achievements.
- **Sorting & Searching**: Quickly find and sort students by name or score.
- **Cloud Sync & Backup**: Export and import data, or sync via Google App Script.

## 🛠️ Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/lokulin/lauchl.in
   ```
2. Open `index.html` in your browser to start using the app.

## 📝 Usage

1. **Add Students**: Enter a name and click "Add Student."
2. **Assign Points**: Use the ❤️, +5, or +10 buttons on student cards.
3. **Customize Avatars**: Click the settings icon on a student card.
4. **Celebrate Achievements**: Click "🎉 Celebrate!" to launch confetti.
5. **Backup & Restore**: Use the export/import features to save progress.
6. **Enable Cloud Sync**: Login to sync data across devices.

## 🔧 Development

This app is built with **vanilla JavaScript**, utilizing:
- **LocalStorage** for persistence.
- **Google App Script** for syncing data.
- **Observer Pattern** to trigger updates efficiently.

### Running a Local Server
For development, you can run a simple local server:
```sh
npx serve
```

Then, open `http://localhost:3000` in your browser.

## 📌 Roadmap
- [ ] Multiple classes per user.
- [ ] More robust syncing.

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss.

## 📜 License
This project is licensed under the MIT License. See `LICENSE` for details.

## 📚 References
- [Google App Script](https://developers.google.com/apps-script)
- [Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern)

