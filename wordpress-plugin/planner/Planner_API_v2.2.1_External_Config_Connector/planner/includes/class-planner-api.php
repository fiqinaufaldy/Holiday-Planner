<?php
if (!defined('ABSPATH')) exit;

/**
 * Dedicated database connector for Holiday Planner.
 * This release only verifies the isolated database and expected schema.
 * It does not seed trips, create users, or modify WordPress tables.
 */
class Planner_API {
    private static $instance = null;
    private $db = null;
    private $db_error = '';
    private $config_loaded = false;

    public static function instance() {
        if (self::$instance === null) self::$instance = new self();
        return self::$instance;
    }

    private function __construct() {
        $this->load_external_config();
        add_action('admin_menu', [$this, 'menu']);
    }

    /**
     * Look for planner-config.php in parent directories of WordPress ABSPATH.
     * The file is intentionally expected OUTSIDE public_html/document root.
     */
    private function load_external_config() {
        $dir = rtrim(ABSPATH, '/\\');
        for ($i = 0; $i < 6; $i++) {
            $dir = dirname($dir);
            if ($dir === '.' || $dir === DIRECTORY_SEPARATOR) continue;
            $candidate = $dir . DIRECTORY_SEPARATOR . 'planner-config.php';
            if (is_file($candidate) && is_readable($candidate)) {
                require_once $candidate;
                $this->config_loaded = true;
                return;
            }
        }
        $this->db_error = 'File planner-config.php tidak ditemukan di direktori induk WordPress. Pastikan file berada di luar public_html.';
    }

    private function expected_tables() {
        return [
            'f9_planner_users',
            'f9_planner_trips',
            'f9_planner_trip_access',
            'f9_planner_admin_trips',
            'f9_planner_trip_items',
            'f9_planner_activity_logs',
        ];
    }

    private function database() {
        if ($this->db instanceof wpdb) return $this->db;

        if (!$this->config_loaded) {
            if ($this->db_error === '') $this->db_error = 'File konfigurasi database eksternal belum berhasil dimuat.';
            return false;
        }

        $required = ['PLANNER_DB_NAME', 'PLANNER_DB_USER', 'PLANNER_DB_PASSWORD', 'PLANNER_DB_HOST'];
        foreach ($required as $constant) {
            if (!defined($constant) || constant($constant) === '' || strpos((string) constant($constant), 'REPLACE_WITH_') === 0) {
                $this->db_error = 'Konfigurasi ' . $constant . ' belum diisi dengan benar di planner-config.php.';
                return false;
            }
        }

        require_once ABSPATH . WPINC . '/wp-db.php';
        $db = new wpdb(PLANNER_DB_USER, PLANNER_DB_PASSWORD, PLANNER_DB_NAME, PLANNER_DB_HOST);
        $db->hide_errors();
        $db->suppress_errors(true);

        $connected = $db->check_connection(false);
        if (!$connected || !empty($db->error)) {
            $this->db_error = 'Koneksi ke database khusus gagal. Periksa hostname, nama database, username, password, dan izin user MySQL.';
            return false;
        }

        $db->set_prefix('');
        $this->db = $db;
        $this->db_error = '';
        return $this->db;
    }

    public function connection_report() {
        $db = $this->database();
        if (!$db) {
            return [
                'connected' => false,
                'config_loaded' => $this->config_loaded,
                'database' => defined('PLANNER_DB_NAME') ? PLANNER_DB_NAME : '(belum diatur)',
                'message' => $this->db_error,
                'tables' => [],
                'missing' => $this->expected_tables(),
            ];
        }

        $found = [];
        foreach ($this->expected_tables() as $table) {
            $exists = $db->get_var($db->prepare('SHOW TABLES LIKE %s', $table));
            if ($exists === $table) $found[] = $table;
        }
        $missing = array_values(array_diff($this->expected_tables(), $found));

        return [
            'connected' => true,
            'config_loaded' => $this->config_loaded,
            'database' => PLANNER_DB_NAME,
            'message' => empty($missing)
                ? 'Koneksi berhasil dan keenam tabel ditemukan.'
                : 'Koneksi berhasil, tetapi ada tabel yang belum ditemukan.',
            'tables' => $found,
            'missing' => $missing,
        ];
    }

    public function menu() {
        add_options_page(
            'Planner Database',
            'Planner Database',
            'manage_options',
            'planner-database',
            [$this, 'settings_page']
        );
    }

    public function settings_page() {
        if (!current_user_can('manage_options')) return;
        $report = $this->connection_report();
        ?>
        <div class="wrap">
            <h1>Holiday Planner — Database Connection</h1>
            <p>Halaman ini hanya memeriksa koneksi ke database khusus Holiday Planner. Tidak ada data yang dibuat, diubah, atau dihapus.</p>
            <div class="notice <?php echo $report['connected'] && empty($report['missing']) ? 'notice-success' : 'notice-warning'; ?>">
                <p><strong><?php echo esc_html($report['message']); ?></strong></p>
            </div>
            <table class="widefat striped" style="max-width:760px">
                <tbody>
                    <tr><th style="width:220px">File konfigurasi eksternal</th><td><?php echo $report['config_loaded'] ? 'Ditemukan dan dimuat' : 'Tidak ditemukan'; ?></td></tr>
                    <tr><th>Database</th><td><code><?php echo esc_html($report['database']); ?></code></td></tr>
                    <tr><th>Status koneksi</th><td><?php echo $report['connected'] ? 'Terhubung' : 'Belum terhubung'; ?></td></tr>
                    <tr><th>Tabel ditemukan</th><td><?php echo esc_html((string) count($report['tables'])); ?> / 6</td></tr>
                    <tr><th>Tabel tersedia</th><td><?php echo esc_html(implode(', ', $report['tables']) ?: '-'); ?></td></tr>
                    <tr><th>Tabel belum ditemukan</th><td><?php echo esc_html(implode(', ', $report['missing']) ?: '-'); ?></td></tr>
                </tbody>
            </table>
            <p style="margin-top:16px"><a class="button button-primary" href="<?php echo esc_url(admin_url('options-general.php?page=planner-database')); ?>">Periksa ulang koneksi</a></p>
            <p><strong>Catatan:</strong> kredensial dibaca dari <code>planner-config.php</code> di luar <code>public_html</code>. Plugin ini belum menyediakan API data atau autentikasi pengguna.</p>
        </div>
        <?php
    }
}
