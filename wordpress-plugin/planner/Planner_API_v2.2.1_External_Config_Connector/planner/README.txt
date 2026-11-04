HOLIDAY PLANNER DATABASE CONNECTOR — VERSION 2.2.1

PURPOSE
This is a safe connection-verification step for the dedicated f9_operations database.
It reads credentials from planner-config.php located outside public_html, then checks
that the six expected tables exist. It does not seed trips, create users, or modify
WordPress tables.

CONFIG FILE
Place planner-config.php in the account home directory, outside public_html. In this
Hostinger File Manager layout, that is the same directory level as the public_html
folder (the My files root shown in File Manager).

The plugin searches parent directories of WordPress ABSPATH for planner-config.php.
Do not place the config file inside public_html, wp-content, or the plugin directory.
Do not upload it to GitHub.

The config file must define:
PLANNER_DB_NAME
PLANNER_DB_USER
PLANNER_DB_PASSWORD
PLANNER_DB_HOST

For this setup, the database name and user are the dedicated f9_operations database
and f9_system user. Use the password created for that MySQL user. Use the hostname
confirmed in Hostinger Remote MySQL details, then verify it through this connection test.

INSTALL
1. Keep a backup of the existing planner plugin folder.
2. In WordPress Admin > Plugins, deactivate the existing Planner API plugin if active.
3. Replace the plugin folder with the planner folder from this ZIP, or upload this ZIP
   through Plugins > Add Plugin > Upload Plugin if WordPress accepts it as an update.
4. Activate Planner API.
5. Open Settings > Planner Database.
6. Confirm that the external config file is loaded and that all six tables are found.

SAFETY / SCOPE
- This version only tests connectivity and table presence.
- It does not create, update, or delete records.
- It does not connect to or alter the WordPress primary database for Planner data.
- It does not implement production API endpoints or Master/Admin/Member authentication.
- Do not use this as the complete Holiday Planner backend yet.
