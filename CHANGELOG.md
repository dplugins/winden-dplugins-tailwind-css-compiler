# Winden Changelog

All notable changes to this plugin.

Entries under `Unreleased` are added automatically by coding-buddy when a task
passes the gate, and promoted to a version number by hand at release time — a
version bump is an approval-tier action, so the header version is usually one
that has already shipped.

## Unreleased

- Fixed a fatal error on a fresh install in the admin cache path: `get_option('winden_dplugins_cache')` returns `false` when the option has never been set, which is the normal state on a fresh install, and that value was passed where an array was expected.
- Set the stable tag to 1.4.0.
- Silenced the `error_log` sniff on the `WP_DEBUG` logger.
- Added a test that fails the build if any code reads an option key that the migration in `App/Helpers/Migration.php` renames and deletes.
