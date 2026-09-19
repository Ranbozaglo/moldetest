<?php
/**
 * Total Testing leads analytics
 * First-party visit tracking + wp-admin report + REST summary for the DIY admin dashboard.
 *
 * Historical rows in wp_tt_lead_events are read-only. Summary sessionizes in memory
 * (30-minute gap) and never UPDATEs stored source/referrer/UTM values.
 */
if ( ! defined( 'ABSPATH' ) ) {
	return;
}

define( 'TT_ANALYTICS_KEY', 'tt_ld_7f3c9e2a1b84d6f0' );

function tt_analytics_table() {
	global $wpdb;
	return $wpdb->prefix . 'tt_lead_events';
}

function tt_analytics_install() {
	global $wpdb;
	$table   = tt_analytics_table();
	$charset = $wpdb->get_charset_collate();
	$sql     = "CREATE TABLE {$table} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		sid varchar(64) NOT NULL,
		event varchar(20) NOT NULL,
		path varchar(190) NOT NULL DEFAULT '/',
		title varchar(190) NOT NULL DEFAULT '',
		referrer varchar(500) NOT NULL DEFAULT '',
		utm_source varchar(80) NOT NULL DEFAULT '',
		utm_medium varchar(80) NOT NULL DEFAULT '',
		utm_campaign varchar(80) NOT NULL DEFAULT '',
		search_query varchar(190) NOT NULL DEFAULT '',
		duration_ms int(10) unsigned NOT NULL DEFAULT 0,
		created_at datetime NOT NULL,
		PRIMARY KEY  (id),
		KEY sid (sid),
		KEY created_at (created_at),
		KEY event (event)
	) {$charset};";
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( $sql );
	$col = $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM {$table} LIKE %s", 'search_query' ) );
	if ( ! $col ) {
		$wpdb->query( "ALTER TABLE {$table} ADD search_query varchar(190) NOT NULL DEFAULT '' AFTER utm_campaign" );
	}
}
add_action( 'init', 'tt_analytics_install', 1 );

function tt_analytics_allowed_origins() {
	return array(
		'https://total-testing-diy.com',
		'https://www.total-testing-diy.com',
		'http://localhost:5173',
		'http://localhost:3000',
		'https://moldetest-f-frontend.onrender.com',
		'https://mold-testing-houston-frontend.onrender.com',
		'https://moldetest-1.onrender.com',
	);
}

function tt_analytics_cors() {
	$origin  = isset( $_SERVER['HTTP_ORIGIN'] ) ? esc_url_raw( wp_unslash( $_SERVER['HTTP_ORIGIN'] ) ) : '';
	$origin  = untrailingslashit( $origin );
	$allowed = tt_analytics_allowed_origins();
	if ( $origin && in_array( $origin, $allowed, true ) ) {
		header( 'Access-Control-Allow-Origin: ' . $origin );
		header( 'Vary: Origin' );
		header( 'Access-Control-Allow-Headers: Content-Type, X-TT-Analytics-Key' );
		header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
	}
}

function tt_analytics_source_label( $utm_source, $referrer ) {
	$utm  = strtolower( trim( (string) $utm_source ) );
	$host = strtolower( (string) wp_parse_url( $referrer, PHP_URL_HOST ) );
	$host = preg_replace( '/^www\./', '', $host );
	$hay  = $utm . ' ' . $host . ' ' . strtolower( (string) $referrer );

	if ( $utm ) {
		if ( 'ig' === $utm || 'insta' === $utm || false !== strpos( $utm, 'instagram' ) ) {
			return 'Instagram';
		}
		if ( false !== strpos( $utm, 'facebook' ) || 'fb' === $utm || 'meta' === $utm ) {
			return 'Facebook';
		}
		if ( false !== strpos( $utm, 'chatgpt' ) || false !== strpos( $utm, 'openai' ) ) {
			return 'ChatGPT';
		}
		if ( false !== strpos( $utm, 'perplexity' ) ) {
			return 'Perplexity';
		}
		if ( false !== strpos( $utm, 'gemini' ) ) {
			return 'Gemini';
		}
		if ( false !== strpos( $utm, 'copilot' ) ) {
			return 'Copilot';
		}
		if ( false !== strpos( $utm, 'claude' ) ) {
			return 'Claude';
		}
		if ( false !== strpos( $utm, 'google' ) ) {
			return 'Google';
		}
		if ( false !== strpos( $utm, 'bing' ) ) {
			return 'Bing';
		}
		return ucfirst( $utm );
	}

	if ( ! $host ) {
		return 'Direct';
	}
	if ( false !== strpos( $hay, 'chatgpt' ) || false !== strpos( $host, 'openai.com' ) ) {
		return 'ChatGPT';
	}
	if ( false !== strpos( $host, 'perplexity' ) ) {
		return 'Perplexity';
	}
	if ( false !== strpos( $host, 'gemini.google' ) || false !== strpos( $host, 'bard.google' ) ) {
		return 'Gemini';
	}
	if ( false !== strpos( $host, 'copilot.microsoft' ) || false !== strpos( $host, 'bing.com' ) ) {
		return false !== strpos( $host, 'copilot' ) ? 'Copilot' : 'Bing';
	}
	if ( false !== strpos( $host, 'claude.ai' ) || false !== strpos( $host, 'anthropic' ) ) {
		return 'Claude';
	}
	if ( false !== strpos( $host, 'you.com' ) || false !== strpos( $host, 'phind' ) || false !== strpos( $host, 'brave.com' ) ) {
		return 'AI search';
	}
	if ( false !== strpos( $host, 'instagram' ) ) {
		return 'Instagram';
	}
	if ( false !== strpos( $host, 'facebook' ) || false !== strpos( $host, 'fb.com' ) ) {
		return 'Facebook';
	}
	if ( false !== strpos( $host, 'google' ) ) {
		return 'Google';
	}
	if ( false !== strpos( $host, 'total-testing' ) ) {
		return 'Internal';
	}
	return $host;
}

function tt_analytics_extract_query( $referrer, $utm_term = '' ) {
	$term = trim( (string) $utm_term );
	if ( $term ) {
		return substr( $term, 0, 190 );
	}
	$query = (string) wp_parse_url( (string) $referrer, PHP_URL_QUERY );
	if ( ! $query ) {
		return '';
	}
	$vars = array();
	parse_str( $query, $vars );
	foreach ( array( 'q', 'query', 'p', 'text', 'search' ) as $key ) {
		if ( ! empty( $vars[ $key ] ) ) {
			return substr( sanitize_text_field( (string) $vars[ $key ] ), 0, 190 );
		}
	}
	return '';
}

function tt_analytics_topic( $path, $title = '' ) {
	$title = trim( preg_replace( '/\s*\|.*$/', '', (string) $title ) );
	if ( $title && ! preg_match( '/^at-home diy mold testing/i', $title ) ) {
		return $title;
	}
	$slug = trim( (string) $path, '/' );
	if ( '' === $slug ) {
		return 'Homepage';
	}
	$slug = preg_replace( '#^(packages|blog)/#', '', $slug );
	$text = ucwords( str_replace( '-', ' ', $slug ) );
	return $text ? $text : (string) $path;
}

function tt_analytics_clean_path( $path ) {
	$path = (string) $path;
	$path = wp_parse_url( $path, PHP_URL_PATH );
	$path = $path ? $path : '/';
	$path = '/' . ltrim( $path, '/' );
	if ( strlen( $path ) > 180 ) {
		$path = substr( $path, 0, 180 );
	}
	return $path;
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'tt-analytics/v1',
			'/hit',
			array(
				'methods'             => array( 'POST', 'OPTIONS' ),
				'permission_callback' => '__return_true',
				'callback'            => 'tt_analytics_hit',
			)
		);
		register_rest_route(
			'tt-analytics/v1',
			'/summary',
			array(
				'methods'             => array( 'GET', 'OPTIONS' ),
				'permission_callback' => '__return_true',
				'callback'            => 'tt_analytics_summary',
			)
		);
	}
);

add_filter(
	'rest_pre_serve_request',
	function ( $served, $result, $request ) {
		$route = $request->get_route();
		if ( 0 === strpos( $route, '/tt-analytics/' ) ) {
			tt_analytics_cors();
			if ( 'OPTIONS' === $request->get_method() ) {
				return true;
			}
		}
		return $served;
	},
	10,
	3
);

function tt_analytics_hit( WP_REST_Request $request ) {
	if ( 'OPTIONS' === $request->get_method() ) {
		tt_analytics_cors();
		return new WP_REST_Response( null, 204 );
	}

	$ua = strtolower( (string) ( $_SERVER['HTTP_USER_AGENT'] ?? '' ) );
	if ( preg_match( '/bot|crawl|spider|slurp|facebookexternalhit|preview/i', $ua ) ) {
		return array( 'ok' => true, 'ignored' => 'bot' );
	}

	$body = $request->get_json_params();
	if ( ! is_array( $body ) ) {
		$body = $request->get_params();
	}

	$sid = sanitize_text_field( (string) ( $body['sid'] ?? '' ) );
	if ( ! preg_match( '/^[a-zA-Z0-9\-]{8,64}$/', $sid ) ) {
		return new WP_Error( 'bad_sid', 'Invalid session', array( 'status' => 400 ) );
	}

	$event = sanitize_key( (string) ( $body['event'] ?? 'pageview' ) );
	if ( ! in_array( $event, array( 'pageview', 'leave', 'checkout' ), true ) ) {
		$event = 'pageview';
	}

	global $wpdb;
	$table = tt_analytics_table();
	$hour  = gmdate( 'Y-m-d H:00:00' );
	$count = (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$table} WHERE sid = %s AND created_at >= %s",
			$sid,
			$hour
		)
	);
	if ( $count > 80 ) {
		return array( 'ok' => true, 'ignored' => 'rate' );
	}

	$referrer = esc_url_raw( (string) ( $body['referrer'] ?? '' ) );
	$utm_term = substr( sanitize_text_field( (string) ( $body['utm_term'] ?? $body['search_query'] ?? '' ) ), 0, 190 );
	$wpdb->insert(
		$table,
		array(
			'sid'          => $sid,
			'event'        => $event,
			'path'         => tt_analytics_clean_path( $body['path'] ?? '/' ),
			'title'        => substr( sanitize_text_field( (string) ( $body['title'] ?? '' ) ), 0, 190 ),
			'referrer'     => substr( $referrer, 0, 500 ),
			'utm_source'   => substr( sanitize_text_field( (string) ( $body['utm_source'] ?? '' ) ), 0, 80 ),
			'utm_medium'   => substr( sanitize_text_field( (string) ( $body['utm_medium'] ?? '' ) ), 0, 80 ),
			'utm_campaign' => substr( sanitize_text_field( (string) ( $body['utm_campaign'] ?? '' ) ), 0, 80 ),
			'search_query' => tt_analytics_extract_query( $referrer, $utm_term ),
			'duration_ms'  => max( 0, min( 86400000, intval( $body['duration_ms'] ?? 0 ) ) ),
			'created_at'   => current_time( 'mysql', true ),
		),
		array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s' )
	);

	return array( 'ok' => true );
}

function tt_analytics_require_key( WP_REST_Request $request ) {
	$key = $request->get_header( 'x-tt-analytics-key' );
	if ( ! $key ) {
		$key = $request->get_param( 'key' );
	}
	if ( ! hash_equals( TT_ANALYTICS_KEY, (string) $key ) ) {
		return false;
	}
	return true;
}

function tt_analytics_raw_source( $utm_source, $referrer ) {
	$utm = trim( (string) $utm_source );
	if ( $utm !== '' ) {
		return $utm;
	}
	$host = strtolower( (string) wp_parse_url( (string) $referrer, PHP_URL_HOST ) );
	$host = preg_replace( '/^www\./', '', $host );
	return $host ? $host : '(none)';
}

function tt_analytics_is_package_path( $path ) {
	return 0 === strpos( (string) $path, '/packages/' );
}

function tt_analytics_content_slugs() {
	static $slugs = null;
	if ( is_array( $slugs ) ) {
		return $slugs;
	}
	$slugs = array();
	$posts = get_posts(
		array(
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'posts_per_page' => 200,
			'no_found_rows'  => true,
		)
	);
	foreach ( $posts as $post ) {
		$p = (string) wp_parse_url( get_permalink( $post ), PHP_URL_PATH );
		$p = '/' . trim( $p, '/' ) . '/';
		$p = str_replace( '//', '/', $p );
		$slugs[ untrailingslashit( $p ) ] = get_the_title( $post );
		$slugs[ $p ]                      = get_the_title( $post );
	}
	return $slugs;
}

function tt_analytics_is_content_path( $path ) {
	$path = untrailingslashit( '/' . ltrim( (string) $path, '/' ) );
	if ( '/' === $path || '' === $path ) {
		return false;
	}
	if ( tt_analytics_is_package_path( $path . '/' ) || tt_analytics_is_package_path( $path ) ) {
		return false;
	}
	$skip = array( '/pricing', '/about', '/how-it-works', '/faq', '/contact', '/blog', '/login', '/privacy-policy', '/terms-and-conditions', '/packages' );
	if ( in_array( $path, $skip, true ) ) {
		return false;
	}
	$slugs = tt_analytics_content_slugs();
	return isset( $slugs[ $path ] ) || isset( $slugs[ $path . '/' ] );
}

function tt_analytics_parse_range( $preset, $from_s, $to_s ) {
	$now    = time();
	$preset = $preset ? $preset : '30';
	if ( $preset === 'custom' && $from_s && $to_s ) {
		$from = strtotime( $from_s . ' 00:00:00 UTC' );
		$to   = strtotime( $to_s . ' 23:59:59 UTC' ) + 1;
		if ( ! $from || ! $to || $to <= $from ) {
			$preset = '30';
		}
	}
	if ( $preset === 'today' ) {
		$from = strtotime( gmdate( 'Y-m-d 00:00:00', $now ) . ' UTC' );
		$to   = $now;
	} elseif ( $preset === 'yesterday' ) {
		$from = strtotime( gmdate( 'Y-m-d 00:00:00', $now - DAY_IN_SECONDS ) . ' UTC' );
		$to   = strtotime( gmdate( 'Y-m-d 00:00:00', $now ) . ' UTC' );
	} elseif ( $preset === '7' ) {
		$from = $now - ( 7 * DAY_IN_SECONDS );
		$to   = $now;
	} elseif ( $preset === '90' ) {
		$from = $now - ( 90 * DAY_IN_SECONDS );
		$to   = $now;
	} elseif ( $preset !== 'custom' ) {
		$from = $now - ( 30 * DAY_IN_SECONDS );
		$to   = $now;
		$preset = '30';
	}
	$len      = max( 1, $to - $from );
	$prev_to  = $from;
	$prev_from = $from - $len;
	$hours    = $len / 3600;
	if ( $hours <= 48 ) {
		$bucket = 'hour';
	} elseif ( $hours <= 24 * 90 ) {
		$bucket = 'day';
	} else {
		$bucket = 'week';
	}
	return array(
		'preset'    => $preset,
		'from'      => $from,
		'to'        => $to,
		'prev_from' => $prev_from,
		'prev_to'   => $prev_to,
		'bucket'    => $bucket,
	);
}

function tt_analytics_sessionize( $rows ) {
	$by_sid = array();
	foreach ( $rows as $row ) {
		$by_sid[ $row['sid'] ][] = $row;
	}
	$gap      = 30 * 60;
	$sessions = array();
	foreach ( $by_sid as $sid => $evts ) {
		$current = null;
		foreach ( $evts as $row ) {
			$ts = strtotime( $row['created_at'] . ' UTC' );
			if ( ! $current || ( $ts - $current['last_ts'] ) > $gap ) {
				if ( $current ) {
					$sessions[] = $current;
				}
				$current = array(
					'sid'             => $sid,
					'started'         => $row['created_at'],
					'start_ts'        => $ts,
					'last_ts'         => $ts,
					'ended'           => $row['created_at'],
					'landing'         => $row['path'],
					'topic'           => tt_analytics_topic( $row['path'], $row['title'] ?? '' ),
					'exit_page'       => $row['path'],
					'referrer'        => $row['referrer'],
					'utm_source'      => $row['utm_source'],
					'raw_source'      => tt_analytics_raw_source( $row['utm_source'], $row['referrer'] ),
					'source'          => tt_analytics_source_label( $row['utm_source'], $row['referrer'] ),
					'pageviews'       => 0,
					'checkout_clicks' => 0,
					'duration_ms'     => 0,
					'paths'           => array(),
					'saw_package'     => false,
				);
			}
			$current['last_ts']     = $ts;
			$current['ended']       = $row['created_at'];
			$current['exit_page']   = $row['path'];
			$current['duration_ms'] = max( $current['duration_ms'], intval( $row['duration_ms'] ) );
			if ( 'pageview' === $row['event'] ) {
				$current['pageviews']++;
				$current['paths'][] = $row['path'];
				if ( tt_analytics_is_package_path( $row['path'] ) ) {
					$current['saw_package'] = true;
				}
			}
			if ( 'checkout' === $row['event'] ) {
				$current['checkout_clicks']++;
			}
		}
		if ( $current ) {
			$sessions[] = $current;
		}
	}
	foreach ( $sessions as &$s ) {
		$span           = max( 0, $s['last_ts'] - $s['start_ts'] );
		$s['duration_sec'] = max( intval( $s['duration_ms'] / 1000 ), $span );
	}
	unset( $s );
	return $sessions;
}

function tt_analytics_kpi_pair( $value, $prev, $is_rate = false ) {
	$out = array(
		'value'    => $value,
		'prev'     => $prev,
		'delta_pct' => null,
		'delta_pp'  => null,
	);
	if ( $is_rate ) {
		$out['delta_pp'] = round( ( $value - $prev ) * 100, 1 );
		return $out;
	}
	if ( $prev > 0 ) {
		$out['delta_pct'] = round( ( ( $value - $prev ) / $prev ) * 100, 1 );
	} elseif ( $value > 0 && $prev === 0 ) {
		$out['delta_pct'] = null;
	} else {
		$out['delta_pct'] = 0;
	}
	return $out;
}

function tt_analytics_bucket_key( $ts, $bucket ) {
	if ( 'hour' === $bucket ) {
		return gmdate( 'Y-m-d H:00', $ts );
	}
	if ( 'week' === $bucket ) {
		return gmdate( 'o-\WW', $ts );
	}
	return gmdate( 'Y-m-d', $ts );
}

function tt_analytics_aggregate_sessions( $sessions ) {
	$n            = count( $sessions );
	$visitors     = array();
	$pageviews    = 0;
	$clicks       = 0;
	$click_sess   = 0;
	$dur_sum      = 0;
	$pkg          = 0;
	$acq      = array();
	$pages    = array();
	$exits    = array();
	$journeys = array();

	$init_page = static function ( $path, $topic = '' ) {
		return array(
			'path'            => $path,
			'topic'           => $topic ? $topic : tt_analytics_topic( $path, '' ),
			'entrances'       => 0,
			'sessions'        => 0,
			'pageviews'       => 0,
			'duration_sec'    => 0,
			'checkout_clicks' => 0,
			'checkout_sess'   => 0,
			'exits'           => 0,
		);
	};

	foreach ( $sessions as $s ) {
		$visitors[ $s['sid'] ] = true;
		$pageviews            += $s['pageviews'];
		$clicks               += $s['checkout_clicks'];
		$dur_sum              += $s['duration_sec'];
		if ( $s['checkout_clicks'] > 0 ) {
			$click_sess++;
		}
		if ( $s['saw_package'] ) {
			$pkg++;
		}
		$src = $s['source'];
		if ( ! isset( $acq[ $src ] ) ) {
			$acq[ $src ] = array(
				'source'          => $src,
				'raw_sources'     => array(),
				'sessions'        => 0,
				'pageviews'       => 0,
				'duration_sec'    => 0,
				'checkout_clicks' => 0,
				'checkout_sess'   => 0,
			);
		}
		$acq[ $src ]['sessions']++;
		$acq[ $src ]['pageviews']       += $s['pageviews'];
		$acq[ $src ]['duration_sec']    += $s['duration_sec'];
		$acq[ $src ]['checkout_clicks'] += $s['checkout_clicks'];
		if ( $s['checkout_clicks'] > 0 ) {
			$acq[ $src ]['checkout_sess']++;
		}
		$acq[ $src ]['raw_sources'][ $s['raw_source'] ] = ( $acq[ $src ]['raw_sources'][ $s['raw_source'] ] ?? 0 ) + 1;

		foreach ( $s['paths'] as $p ) {
			if ( ! isset( $pages[ $p ] ) ) {
				$pages[ $p ] = $init_page( $p, $p === $s['landing'] ? $s['topic'] : '' );
			}
			$pages[ $p ]['pageviews']++;
		}
		$unique_paths = array_values( array_unique( $s['paths'] ? $s['paths'] : array( $s['landing'] ) ) );
		foreach ( $unique_paths as $p ) {
			if ( ! isset( $pages[ $p ] ) ) {
				$pages[ $p ] = $init_page( $p, $p === $s['landing'] ? $s['topic'] : '' );
			}
			$pages[ $p ]['sessions']++;
			$pages[ $p ]['duration_sec']    += $s['duration_sec'];
			$pages[ $p ]['checkout_clicks'] += $s['checkout_clicks'];
			if ( $s['checkout_clicks'] > 0 ) {
				$pages[ $p ]['checkout_sess']++;
			}
		}
		$lk = $s['landing'];
		if ( ! isset( $pages[ $lk ] ) ) {
			$pages[ $lk ] = $init_page( $lk, $s['topic'] );
		}
		$pages[ $lk ]['entrances']++;
		if ( $s['topic'] ) {
			$pages[ $lk ]['topic'] = $s['topic'];
		}

		$ek = $s['exit_page'];
		if ( ! isset( $pages[ $ek ] ) ) {
			$pages[ $ek ] = $init_page( $ek );
		}
		$pages[ $ek ]['exits']++;
		if ( ! isset( $exits[ $ek ] ) ) {
			$exits[ $ek ] = array(
				'path'         => $ek,
				'sessions'     => 0,
				'duration_sec' => 0,
			);
		}
		$exits[ $ek ]['sessions']++;
		$exits[ $ek ]['duration_sec'] += $s['duration_sec'];

		$jk = $s['landing'] . "\t" . $s['exit_page'];
		if ( ! isset( $journeys[ $jk ] ) ) {
			$journeys[ $jk ] = array(
				'entry'    => $s['landing'],
				'exit'     => $s['exit_page'],
				'sessions' => 0,
			);
		}
		$journeys[ $jk ]['sessions']++;
	}

	$finish = static function ( $rows ) {
		$out = array();
		foreach ( $rows as $row ) {
			$den = max( 1, intval( $row['sessions'] ?? $row['entrances'] ?? 0 ) );
			$row['avg_engaged_sec']     = round( intval( $row['duration_sec'] ) / $den );
			$row['checkout_click_rate'] = round( intval( $row['checkout_sess'] ) / $den, 4 );
			if ( isset( $row['exits'] ) ) {
				$row['exit_rate'] = round( intval( $row['exits'] ) / max( 1, intval( $row['sessions'] ?? $row['entrances'] ) ), 4 );
			}
			if ( isset( $row['raw_sources'] ) && is_array( $row['raw_sources'] ) ) {
				arsort( $row['raw_sources'] );
				$raw = array();
				foreach ( array_slice( $row['raw_sources'], 0, 8, true ) as $k => $v ) {
					$raw[] = array(
						'value'    => $k,
						'sessions' => $v,
					);
				}
				$row['raw_sources'] = $raw;
			}
			unset( $row['duration_sec'], $row['checkout_sess'] );
			$out[] = $row;
		}
		return $out;
	};

	$acq_rows = $finish( $acq );
	usort(
		$acq_rows,
		static function ( $a, $b ) {
			return $b['sessions'] <=> $a['sessions'];
		}
	);

	$land_src = array();
	foreach ( $pages as $row ) {
		if ( intval( $row['entrances'] ) > 0 ) {
			$land_src[] = $row;
		}
	}
	$land_rows = $finish( $land_src );
	usort(
		$land_rows,
		static function ( $a, $b ) {
			return $b['entrances'] <=> $a['entrances'];
		}
	);

	$content_src = array();
	foreach ( $pages as $row ) {
		if ( ! tt_analytics_is_content_path( $row['path'] ) ) {
			continue;
		}
		if ( intval( $row['sessions'] ) < 1 && intval( $row['entrances'] ) < 1 ) {
			continue;
		}
		$content_src[] = $row;
	}
	$content_rows = $finish( $content_src );
	usort(
		$content_rows,
		static function ( $a, $b ) {
			return $b['entrances'] <=> $a['entrances'];
		}
	);

	$exit_rows = array();
	foreach ( $exits as $row ) {
		$row['avg_engaged_sec'] = round( $row['duration_sec'] / max( 1, $row['sessions'] ) );
		$row['exit_share']      = $n ? round( $row['sessions'] / $n, 4 ) : 0;
		unset( $row['duration_sec'] );
		$exit_rows[] = $row;
	}
	usort(
		$exit_rows,
		static function ( $a, $b ) {
			return $b['sessions'] <=> $a['sessions'];
		}
	);

	$journey_rows = array_values( $journeys );
	usort(
		$journey_rows,
		static function ( $a, $b ) {
			return $b['sessions'] <=> $a['sessions'];
		}
	);

	return array(
		'visitors'         => count( $visitors ),
		'sessions'         => $n,
		'pageviews'        => $pageviews,
		'avg_engaged_sec'  => $n ? round( $dur_sum / $n ) : 0,
		'checkout_clicks'  => $clicks,
		'checkout_sess'    => $click_sess,
		'checkout_click_rate' => $n ? round( $click_sess / $n, 4 ) : 0,
		'package_viewed'   => $pkg,
		'acquisition'      => array_slice( $acq_rows, 0, 40 ),
		'landings'         => array_slice( $land_rows, 0, 40 ),
		'content'          => array_slice( $content_rows, 0, 40 ),
		'exits'            => array_slice( $exit_rows, 0, 30 ),
		'journeys'         => array_slice( $journey_rows, 0, 25 ),
	);
}

function tt_analytics_opportunities( $cur, $prev, $thresholds ) {
	$out     = array();
	$min_all = $thresholds['min_sessions_period'];
	$min_seg = $thresholds['min_sessions_segment'];
	if ( $cur['sessions'] >= $min_all && $prev['sessions'] >= $min_all ) {
		$pct = $prev['sessions'] ? round( ( ( $cur['sessions'] - $prev['sessions'] ) / $prev['sessions'] ) * 100 ) : 0;
		if ( abs( $pct ) >= 15 ) {
			$dir  = $pct > 0 ? 'increased' : 'decreased';
			$out[] = array(
				'kind'     => 'observation',
				'text'     => 'Traffic ' . $dir . ' ' . abs( $pct ) . '% compared with the previous period.',
				'based_on' => 'sessions vs previous equivalent period',
			);
		}
	}
	$total_s = max( 1, $cur['sessions'] );
	$total_c = max( 1, $cur['checkout_sess'] );
	foreach ( $cur['acquisition'] as $row ) {
		if ( $row['sessions'] < $min_seg ) {
			continue;
		}
		$sess_share     = $row['sessions'] / $total_s;
		$src_click_sess = (int) round( $row['checkout_click_rate'] * $row['sessions'] );
		$click_share    = $src_click_sess / $total_c;
		if ( $sess_share >= 0.2 && $click_share <= 0.5 * $sess_share ) {
			$out[] = array(
				'kind'     => 'observation',
				'text'     => $row['source'] . ' generated ' . round( $sess_share * 100 ) . '% of sessions but ' . round( $click_share * 100 ) . '% of checkout-click sessions.',
				'based_on' => 'source share vs checkout-click share',
			);
		}
	}
	$site_rate = $cur['checkout_click_rate'];
	$seen      = array();
	foreach ( array_merge( $cur['content'], $cur['landings'] ) as $row ) {
		$key = $row['path'] ?? ( $row['topic'] ?? '' );
		if ( isset( $seen[ $key ] ) ) {
			continue;
		}
		$entr = intval( $row['entrances'] ?? $row['sessions'] ?? 0 );
		if ( $entr < $min_seg ) {
			continue;
		}
		$eng  = intval( $row['avg_engaged_sec'] ?? 0 );
		$rate = floatval( $row['checkout_click_rate'] ?? 0 );
		if ( $eng >= 60 && $site_rate > 0 && $rate <= ( $site_rate * 0.5 ) ) {
			$seen[ $key ] = true;
			$label        = $row['path'] ? $row['path'] : ( $row['topic'] ?? '' );
			$out[]        = array(
				'kind'     => 'observation',
				'text'     => $label . ' has high engagement but a low checkout click rate.',
				'based_on' => 'engagement vs checkout click rate; min ' . $min_seg . ' sessions',
			);
		}
	}
	return array_slice( $out, 0, 6 );
}

function tt_analytics_future_fields() {
	return array(
		'orders'                    => null,
		'revenue'                   => null,
		'purchase_conversion_rate'  => null,
		'revenue_per_visitor'       => null,
		'utm_content'               => null,
		'utm_term'                  => null,
		'creator'                   => null,
		'creative'                  => null,
		'device'                    => null,
		'scroll_depth'              => null,
		'first_touch'               => null,
		'last_touch'                => null,
	);
}

function tt_analytics_build_summary_range( $range, $source_filter = '' ) {
	global $wpdb;
	$table = tt_analytics_table();
	$has_q = (bool) $wpdb->get_var( $wpdb->prepare( "SHOW COLUMNS FROM {$table} LIKE %s", 'search_query' ) );
	$qcol  = $has_q ? 'search_query' : "'' AS search_query";
	$from  = gmdate( 'Y-m-d H:i:s', $range['prev_from'] );
	$to    = gmdate( 'Y-m-d H:i:s', $range['to'] );
	$rows  = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT sid, event, path, title, referrer, utm_source, {$qcol}, duration_ms, created_at
			 FROM {$table}
			 WHERE created_at >= %s AND created_at < %s
			 ORDER BY sid ASC, created_at ASC",
			$from,
			$to
		),
		ARRAY_A
	);
	if ( ! is_array( $rows ) ) {
		$rows = array();
	}
	$all      = tt_analytics_sessionize( $rows );
	$current  = array();
	$previous = array();
	foreach ( $all as $s ) {
		if ( $source_filter && $s['source'] !== $source_filter ) {
			continue;
		}
		if ( $s['start_ts'] >= $range['from'] && $s['start_ts'] < $range['to'] ) {
			$current[] = $s;
		} elseif ( $s['start_ts'] >= $range['prev_from'] && $s['start_ts'] < $range['prev_to'] ) {
			$previous[] = $s;
		}
	}
	$cur  = tt_analytics_aggregate_sessions( $current );
	$prev = tt_analytics_aggregate_sessions( $previous );

	$trend_map = array();
	foreach ( $current as $s ) {
		$key = tt_analytics_bucket_key( $s['start_ts'], $range['bucket'] );
		if ( ! isset( $trend_map[ $key ] ) ) {
			$trend_map[ $key ] = array(
				't'               => $key,
				'visitors'        => array(),
				'sessions'        => 0,
				'pageviews'       => 0,
				'checkout_clicks' => 0,
				'checkout_sess'   => 0,
			);
		}
		$trend_map[ $key ]['visitors'][ $s['sid'] ] = true;
		$trend_map[ $key ]['sessions']++;
		$trend_map[ $key ]['pageviews']       += $s['pageviews'];
		$trend_map[ $key ]['checkout_clicks'] += $s['checkout_clicks'];
		if ( $s['checkout_clicks'] > 0 ) {
			$trend_map[ $key ]['checkout_sess']++;
		}
	}
	ksort( $trend_map );
	$trend = array();
	foreach ( $trend_map as $row ) {
		$sess = max( 1, $row['sessions'] );
		$trend[] = array(
			't'                   => $row['t'],
			'visitors'            => count( $row['visitors'] ),
			'pageviews'           => $row['pageviews'],
			'checkout_clicks'     => $row['checkout_clicks'],
			'checkout_click_rate' => round( $row['checkout_sess'] / $sess, 4 ),
		);
	}

	$funnel = array(
		array(
			'step'       => 'Sessions',
			'sessions'   => $cur['sessions'],
			'pct_total'  => $cur['sessions'] ? 1 : 0,
			'pct_prev'   => 1,
			'drop_prev'  => 0,
		),
		array(
			'step'       => 'Package page viewed',
			'sessions'   => $cur['package_viewed'],
			'pct_total'  => $cur['sessions'] ? round( $cur['package_viewed'] / $cur['sessions'], 4 ) : 0,
			'pct_prev'   => $cur['sessions'] ? round( $cur['package_viewed'] / $cur['sessions'], 4 ) : 0,
			'drop_prev'  => $cur['sessions'] ? round( 1 - ( $cur['package_viewed'] / $cur['sessions'] ), 4 ) : 0,
		),
		array(
			'step'       => 'Checkout click',
			'sessions'   => $cur['checkout_sess'],
			'pct_total'  => $cur['sessions'] ? round( $cur['checkout_sess'] / $cur['sessions'], 4 ) : 0,
			'pct_prev'   => $cur['package_viewed'] ? min( 1, round( $cur['checkout_sess'] / $cur['package_viewed'], 4 ) ) : 0,
			'drop_prev'  => $cur['package_viewed'] ? max( 0, round( 1 - ( $cur['checkout_sess'] / $cur['package_viewed'] ), 4 ) ) : 0,
		),
	);

	$thresholds = array(
		'min_sessions_period'  => 20,
		'min_sessions_segment' => 15,
		'session_timeout_min'  => 30,
	);

	$kpis = array(
		'visitors'            => tt_analytics_kpi_pair( $cur['visitors'], $prev['visitors'] ),
		'sessions'            => tt_analytics_kpi_pair( $cur['sessions'], $prev['sessions'] ),
		'pageviews'           => tt_analytics_kpi_pair( $cur['pageviews'], $prev['pageviews'] ),
		'avg_engaged_sec'     => tt_analytics_kpi_pair( $cur['avg_engaged_sec'], $prev['avg_engaged_sec'] ),
		'checkout_clicks'     => tt_analytics_kpi_pair( $cur['checkout_clicks'], $prev['checkout_clicks'] ),
		'checkout_click_rate' => tt_analytics_kpi_pair( $cur['checkout_click_rate'], $prev['checkout_click_rate'], true ),
	);

	return array(
		'phase'         => 1,
		'contract'      => array(
			'version'  => 1,
			'reserved' => array_keys( tt_analytics_future_fields() ),
		),
		'range'         => array(
			'preset'    => $range['preset'],
			'from'      => gmdate( 'c', $range['from'] ),
			'to'        => gmdate( 'c', $range['to'] ),
			'prev_from' => gmdate( 'c', $range['prev_from'] ),
			'prev_to'   => gmdate( 'c', $range['prev_to'] ),
			'bucket'    => $range['bucket'],
			'source'    => $source_filter ? $source_filter : null,
		),
		'thresholds'    => $thresholds,
		'kpis'          => $kpis,
		'future'        => tt_analytics_future_fields(),
		'trend'         => array(
			'bucket' => $range['bucket'],
			'points' => $trend,
		),
		'acquisition'   => $cur['acquisition'],
		'landings'      => $cur['landings'],
		'content'       => $cur['content'],
		'funnel'        => $funnel,
		'exits'         => $cur['exits'],
		'journeys'      => $cur['journeys'],
		'opportunities' => tt_analytics_opportunities( $cur, $prev, $thresholds ),
		'totals'        => array(
			'sessions'         => $cur['sessions'],
			'pageviews'        => $cur['pageviews'],
			'avg_duration_sec' => $cur['avg_engaged_sec'],
			'checkouts'        => $cur['checkout_clicks'],
		),
		'sources'       => array_map(
			static function ( $row ) {
				return array(
					'source'   => $row['source'],
					'sessions' => $row['sessions'],
				);
			},
			$cur['acquisition']
		),
		'dropoffs'      => array_map(
			static function ( $row ) {
				return array(
					'path'     => $row['path'],
					'sessions' => $row['sessions'],
				);
			},
			$cur['exits']
		),
	);
}

function tt_analytics_build_summary( $days ) {
	$days  = max( 1, min( 90, intval( $days ) ) );
	$range = tt_analytics_parse_range( (string) $days, '', '' );
	return tt_analytics_build_summary_range( $range, '' );
}

function tt_analytics_summary( WP_REST_Request $request ) {
	if ( 'OPTIONS' === $request->get_method() ) {
		tt_analytics_cors();
		return new WP_REST_Response( null, 204 );
	}
	if ( ! tt_analytics_require_key( $request ) ) {
		return new WP_Error( 'forbidden', 'Invalid analytics key', array( 'status' => 403 ) );
	}
	$preset = sanitize_text_field( (string) ( $request->get_param( 'preset' ) ?: '' ) );
	$days   = $request->get_param( 'days' );
	if ( ! $preset && $days ) {
		$preset = (string) intval( $days );
	}
	$from   = sanitize_text_field( (string) ( $request->get_param( 'from' ) ?: '' ) );
	$to     = sanitize_text_field( (string) ( $request->get_param( 'to' ) ?: '' ) );
	$source = sanitize_text_field( (string) ( $request->get_param( 'source' ) ?: '' ) );
	$range  = tt_analytics_parse_range( $preset ? $preset : '30', $from, $to );
	return tt_analytics_build_summary_range( $range, $source );
}

add_action(
	'admin_menu',
	function () {
		add_menu_page(
			'Leads Analytics',
			'Leads Analytics',
			'manage_options',
			'tt-leads-analytics',
			'tt_analytics_admin_page',
			'dashicons-chart-area',
			26
		);
	}
);

function tt_analytics_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$days = isset( $_GET['days'] ) ? intval( $_GET['days'] ) : 30;
	$data = tt_analytics_build_summary( $days );
	echo '<div class="wrap"><h1>Leads Analytics</h1>';
	echo '<p>Visits on total-testing.com since tracking started. Same numbers appear in the DIY admin dashboard.</p>';
	echo '<p><a class="button" href="?page=tt-leads-analytics&days=7">7 days</a> ';
	echo '<a class="button" href="?page=tt-leads-analytics&days=30">30 days</a> ';
	echo '<a class="button" href="?page=tt-leads-analytics&days=90">90 days</a></p>';
	$t = $data['totals'];
	echo '<div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;">';
	foreach ( array(
		'Sessions'         => $t['sessions'],
		'Page views'       => $t['pageviews'],
		'Avg time (sec)'   => $t['avg_duration_sec'],
		'Checkout clicks'  => $t['checkouts'],
	) as $label => $val ) {
		echo '<div style="background:#fff;border:1px solid #dcdcde;padding:16px 20px;min-width:140px;"><strong style="display:block;font-size:22px;">' . esc_html( $val ) . '</strong>' . esc_html( $label ) . '</div>';
	}
	echo '</div>';
	echo '<h2>Sources</h2><table class="widefat striped"><thead><tr><th>Source</th><th>Sessions</th></tr></thead><tbody>';
	foreach ( $data['sources'] as $row ) {
		echo '<tr><td>' . esc_html( $row['source'] ) . '</td><td>' . intval( $row['sessions'] ) . '</td></tr>';
	}
	echo '</tbody></table>';
	echo '<h2>Drop-off</h2><table class="widefat striped"><thead><tr><th>Last page</th><th>Sessions</th></tr></thead><tbody>';
	foreach ( $data['dropoffs'] as $row ) {
		echo '<tr><td>' . esc_html( $row['path'] ) . '</td><td>' . intval( $row['sessions'] ) . '</td></tr>';
	}
	echo '</tbody></table></div>';
}

add_action(
	'wp_footer',
	function () {
		if ( is_admin() ) {
			return;
		}
		?>
<script>
(function () {
  var KEY = 'tt_sid';
  var sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random().toString(16).slice(2));
    localStorage.setItem(KEY, sid);
  }
  var params = new URLSearchParams(location.search);
  var started = Date.now();
  var visibleStarted = Date.now();
  var engaged = 0;
  function payload(event) {
    return {
      sid: sid,
      event: event,
      path: location.pathname,
      title: document.title || '',
      referrer: document.referrer || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || params.get('q') || '',
      duration_ms: engaged + (document.hidden ? 0 : (Date.now() - visibleStarted))
    };
  }
  function send(event) {
    try {
      fetch('/wp-json/tt-analytics/v1/hit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(event)),
        keepalive: true
      });
    } catch (e) {}
  }
  send('pageview');
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      engaged += Date.now() - visibleStarted;
      send('leave');
    } else {
      visibleStarted = Date.now();
    }
  });
  window.addEventListener('pagehide', function () { send('leave'); });
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    if (a.href.indexOf('buy.stripe.com') !== -1) send('checkout');
  }, true);
})();
</script>
		<?php
	},
	99
);
