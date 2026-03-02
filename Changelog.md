# Changelog

## 0.2.5

- Introduced keyboard shortcuts for running queries with a modular setup to allow adding more shortcuts in the future.
- Minor fixes and improvements in the settings UI.

# Changelog

## v0.2.1
- **Fixed Query Tool CRUD Actions**: Add, edit, delete, and download buttons now work properly - they were using stale query content.
- **Improved Edit Table Dialog**: Fixed SQL errors with empty fields, made dialog wider for better visibility, and adjusted positioning.
- **Added Row/Column Dialogs**: Add buttons now open proper dialogs instead of placeholder messages.
- **Better Saved Queries**: Queries sync immediately, delete works properly, and added hover-visible Load button on cards.
- **Upgraded Notifications**: Switched to Sonner for toast notifications with proper styling.
- **UI Polish**: Moved delete button to top-right, removed edit option, and updated sidebar link to GitHub issues.

## v0.2
- **Major UI/UX Overhaul**: Complete visual redesign with a new color palette, typography, and layout.
- **Enhanced Security Controls**: Resolved critical issues with the auto-lock mechanism. The application now strictly adheres to user-defined timeout settings.
- **Polished Interactions**: Smoother transitions and better feedback across the application.

## v0.1
- Initial release.
- Core features: Connect to multiple PostgreSQL servers, run SQL queries, and explore schemas.
- Secure local storage with AES-256 encryption and PIN protection.
