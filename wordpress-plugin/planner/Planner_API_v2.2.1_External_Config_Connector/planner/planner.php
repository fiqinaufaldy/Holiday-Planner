<?php
/**
 * Plugin Name: Planner API
 * Description: Dedicated database connection checker for the Fairway Nine Holiday Planner.
 * Version: 2.2.1
 * Author: Fairway Nine
 */
if (!defined('ABSPATH')) exit;

require_once plugin_dir_path(__FILE__) . 'includes/class-planner-api.php';

add_action('plugins_loaded', function () {
    Planner_API::instance();
});
