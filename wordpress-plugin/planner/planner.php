<?php
/**
 * Plugin Name: Planner API
 * Description: Multi-trip Planner API with MySQL trip storage and per-trip PIN access.
 * Version: 2.0.0
 * Author: Fairway Nine
 */
if (!defined('ABSPATH')) exit;
require_once plugin_dir_path(__FILE__).'includes/class-planner-api.php';
register_activation_hook(__FILE__, array('Planner_API', 'activate'));
add_action('plugins_loaded', function(){ Planner_API::instance(); });
