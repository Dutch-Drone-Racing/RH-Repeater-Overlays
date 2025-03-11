var sound_buzzer = $('#sound_buzzer')[0];
var sound_beep = $('#sound_beep')[0];
var sound_stage = $('#sound_stage')[0];

// bitmask values for 'phonetic_split_call' function
const SPLMSK_PILOT_NAME = 0x01
const SPLMSK_SPLIT_ID = 0x02
const SPLMSK_SPLIT_TIME = 0x04

// minimum value in logarithmic volume range and limit value for "zero" volume
const MIN_LOG_VOLUME = 0.01;
const MIN_LOG_VOL_LIM = MIN_LOG_VOLUME + MIN_LOG_VOLUME/1000.0;
const MAX_LOG_VOLUME = 1.0;

const LEADER_FLAG_CHAR = 'L';
const WINNER_FLAG_CHAR = 'W';

// Display sync warning above (ms)
const SYNC_WARNING_THRESHOLD_1 = 2
const SYNC_WARNING_THRESHOLD_3 = 10
const SYNC_WARNING_THRESHOLD_10 = 60

var speakObjsQueue = [];
var checkSpeakQueueFlag = true;
var checkSpeakQueueCntr = 0;

/* global functions */
function supportsLocalStorage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch(e){
		return false;
	}
}

// Returns the named URL-query parameter, or 'false' if not found
//  From: https://stackoverflow.com/questions/19491336/how-to-get-url-parameter-using-jquery-or-plain-javascript
function getUrlParameter(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	var sParameterName, i;
	for (i = 0; i < sURLVariables.length; i++) {
		sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] === sParam) {
			return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
		}
	}
	return false;
}

function median(arr){
	values = arr.concat()
	values.sort(function(a,b){
		return a-b;
	});
	if(values.length ===0) return 0;
	var half = Math.floor(values.length / 2);
	if (values.length % 2) return values[half];
	return (values[half - 1] + values[half]) / 2.0;
}

// Pad to 2 or 3 digits, default is 2
function pad(n, z=2) {
	return ('000000' + n).slice(-z);
}

function formatTimeMillis(s, timeformat='{m}:{s}.{d}') {
	s = Math.round(s);
	var ms = s % 1000;
	s = (s - ms) / 1000;
	var secs = s % 60;
	var mins = (s - secs) / 60;

	if (!formatted_time) {
		timeformat = '{m}:{s}.{d}';
	}
	var formatted_time = timeformat.replace('{d}', pad(ms, 3));
	formatted_time = formatted_time.replace('{s}', pad(secs));
	formatted_time = formatted_time.replace('{m}', mins)

	return formatted_time;
}

function colorvalToHex(color) {
	return '#' + pad(color.toString(16), 6);
}

function convertColor(color) {
	if(color.substring(0,1) == '#') {
		color = color.substring(1);
	}
	var rgbColor = {};
	rgbColor.r = parseInt(color.substring(0,2),16);
	rgbColor.g = parseInt(color.substring(2,4),16);
	rgbColor.b = parseInt(color.substring(4),16);
	return rgbColor;
}

function contrastColor(hexcolor) {
	hex = hexcolor.replace(/[^0-9A-F]/gi, '');
	var bigint = parseInt(hex, 16);
	var r = (bigint >> 16) & 255;
	var g = (bigint >> 8) & 255;
	var b = bigint & 255;

	var brightness = ((r * 299) + (g * 587) + (b * 114)) / 255000;

	// values range from 0 to 1
	// anything greater than 0.5 should be bright enough for dark text
	if (brightness >= 0.5) {
		return "#000000"
	} else {
		return "#ffffff"
	}
}

function rgbtoHex(rgb) {
	rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
	function hex(x) {
		return ("0" + parseInt(x).toString(16)).slice(-2);
	}
	return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hslToHex(h, s, l) {
	h = parseInt(h.replace(/[^0-9\.]/gi, '')) / 360;
	s = parseInt(s.replace(/[^0-9\.]/gi, '')) / 100;
	l = parseInt(l.replace(/[^0-9\.]/gi, '')) / 100;

	let r, g, b;
	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	const toHex = x => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex) {
	regex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i
	var result = regex.exec(hex);
	if (result) {
		r = parseInt(result[1], 16);
		g = parseInt(result[2], 16);
		b = parseInt(result[3], 16);
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;
		if(max == min){
			h = s = 0; // achromatic
		}else{
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
	} else {
		h = 0;
		s = 0;
		l = 0.5;
	}
	var HSL = new Object();
	HSL['h']=h * 360;
	HSL['s']=s * 100;
	HSL['l']=l * 100;
	return HSL;
}

function LogSlider(options) {
   options = options || {};
   this.minpos = options.minpos || 0;
   this.maxpos = options.maxpos || 100;
   this.minlval = Math.log(options.minval || 1);
   this.maxlval = Math.log(options.maxval || 100000);

   this.scale = (this.maxlval - this.minlval) / (this.maxpos - this.minpos);
}
LogSlider.prototype = {
   // Calculate value from a slider position
   value: function(position) {
	  return Math.exp((position - this.minpos) * this.scale + this.minlval);
   },
   // Calculate slider position from a value
   position: function(value) {
	  return this.minpos + (Math.log(value) - this.minlval) / this.scale;
   }
};

if ( !window.performance || !window.performance.now ) {
	Date.now || ( Date.now = function () {
		return new this().getTime();
	});

	( window.performance ||
		( window.performance = {} ) ).now = function () {
			return Date.now() - offset;
		};

	var offset = ( window.performance.timing ||
		( window.performance.timing = {} ) ).navigatorStart ||
			( window.performance.timing.navigatorStart = Date.now() );
}

var keyCodeMap = {
		48:"0", 49:"1", 50:"2", 51:"3", 52:"4", 53:"5", 54:"6", 55:"7", 56:"8", 57:"9", 59:";",
		65:"a", 66:"b", 67:"c", 68:"d", 69:"e", 70:"f", 71:"g", 72:"h", 73:"i", 74:"j", 75:"k", 76:"l",
		77:"m", 78:"n", 79:"o", 80:"p", 81:"q", 82:"r", 83:"s", 84:"t", 85:"u", 86:"v", 87:"w", 88:"x", 89:"y", 90:"z",
		96:"0", 97:"1", 98:"2", 99:"3", 100:"4", 101:"5", 102:"6", 103:"7", 104:"8", 105:"9"
}

$.fn.setup_navigation = function(settings) {

	settings = jQuery.extend({
		menuHoverClass: 'show-menu',
	}, settings);

	// Add ARIA role to menubar and menu items
	$(this).attr('role', 'menubar').find('li').attr('role', 'menuitem');

	var top_level_links = $(this).find('> li > a');

	// Added by Terrill: (removed temporarily: doesn't fix the JAWS problem after all)
	// Add tabindex="0" to all top-level links
	// Without at least one of these, JAWS doesn't read widget as a menu, despite all the other ARIA
	//$(top_level_links).attr('tabindex','0');

	// Set tabIndex to -1 so that top_level_links can't receive focus until menu is open
	$(top_level_links).next('ul')
		.attr('data-test','true')
		.attr({ 'aria-hidden': 'true', 'role': 'menu' })
		.find('a')
		.attr('tabIndex',-1);

	// Adding aria-haspopup for appropriate items
	$(top_level_links).each(function(){
		if($(this).next('ul').length > 0)
			$(this).parent('li').attr('aria-haspopup', 'true');
	});

	$(top_level_links).hover(function(){
		$(this).closest('ul')
			.attr('aria-hidden', 'false')
			.find('.'+settings.menuHoverClass)
			.attr('aria-hidden', 'true')
			.removeClass(settings.menuHoverClass)
			.find('a')
			.attr('tabIndex',-1);
		$(this).next('ul')
			.attr('aria-hidden', 'false')
			.addClass(settings.menuHoverClass)
			.find('a').attr('tabIndex',0);
	});

	$(top_level_links).focus(function(){
		$(this).closest('ul')
			// Removed by Terrill
			// The following was adding aria-hidden="false" to root ul since menu is never hidden
			// and seemed to be causing flakiness in JAWS (needs more testing)
			// .attr('aria-hidden', 'false')
			.find('.'+settings.menuHoverClass)
			.attr('aria-hidden', 'true')
			.removeClass(settings.menuHoverClass)
			.find('a')
			.attr('tabIndex',-1);

	$(this).next('ul')
			.attr('aria-hidden', 'false')
			.addClass(settings.menuHoverClass)
			.find('a').attr('tabIndex',0);
	});

	// Bind arrow keys for navigation
	$(top_level_links).keydown(function(e){
		if(e.keyCode == 37) {
			e.preventDefault();
			// This is the first item
			if($(this).parent('li').prev('li').length == 0) {
				$(this).parents('ul').find('> li').last().find('a').first().focus();
			} else {
				$(this).parent('li').prev('li').find('a').first().focus();
			}
		} else if(e.keyCode == 38) {
			e.preventDefault();
			if($(this).parent('li').find('ul').length > 0) {
				$(this).parent('li').find('ul')
					.attr('aria-hidden', 'false')
					.addClass(settings.menuHoverClass)
					.find('a').attr('tabIndex',0)
					.last().focus();
			}
		} else if(e.keyCode == 39) {
			e.preventDefault();
			// This is the last item
			if($(this).parent('li').next('li').length == 0) {
				$(this).parents('ul').find('> li').first().find('a').first().focus();
			} else {
				$(this).parent('li').next('li').find('a').first().focus();
			}
		} else if(e.keyCode == 40) {
			e.preventDefault();
			if($(this).parent('li').find('ul').length > 0) {
				$(this).parent('li').find('ul')
					.attr('aria-hidden', 'false')
					.addClass(settings.menuHoverClass)
					.find('a').attr('tabIndex',0)
					.first().focus();
			}
		} else if(e.keyCode == 13 || e.keyCode == 32) {
			// If submenu is hidden, open it
			e.preventDefault();
			$(this).parent('li').find('ul[aria-hidden=true]')
					.attr('aria-hidden', 'false')
					.addClass(settings.menuHoverClass)
					.find('a').attr('tabIndex',0)
					.first().focus();
		} else if(e.keyCode == 27) {
			e.preventDefault();
			$('.'+settings.menuHoverClass)
				.attr('aria-hidden', 'true')
				.removeClass(settings.menuHoverClass)
				.find('a')
				.attr('tabIndex',-1);
		} else {
			$(this).parent('li').find('ul[aria-hidden=false] a').each(function(){
				if($(this).text().substring(0,1).toLowerCase() == keyCodeMap[e.keyCode]) {
					$(this).focus();
					return false;
				}
			});
		}
	});


	var links = $(top_level_links).parent('li').find('ul').find('a');
	$(links).keydown(function(e){
		if(e.keyCode == 38) {
			e.preventDefault();
			// This is the first item
			if($(this).parent('li').prev('li').length == 0) {
				$(this).parents('ul').parents('li').find('a').first().focus();
			} else {
				$(this).parent('li').prev('li').find('a').first().focus();
			}
		} else if(e.keyCode == 40) {
			e.preventDefault();
			if($(this).parent('li').next('li').length == 0) {
				$(this).parents('ul').parents('li').find('a').first().focus();
			} else {
				$(this).parent('li').next('li').find('a').first().focus();
			}
		} else if(e.keyCode == 27 || e.keyCode == 37) {
			e.preventDefault();
			$(this)
				.parents('ul').first()
					.prev('a').focus()
					.parents('ul').first().find('.'+settings.menuHoverClass)
					.attr('aria-hidden', 'true')
					.removeClass(settings.menuHoverClass)
					.find('a')
					.attr('tabIndex',-1);
		} else if(e.keyCode == 32) {
			e.preventDefault();
			window.location = $(this).attr('href');
		} else {
			var found = false;
			$(this).parent('li').nextAll('li').find('a').each(function(){
				if($(this).text().substring(0,1).toLowerCase() == keyCodeMap[e.keyCode]) {
					$(this).focus();
					found = true;
					return false;
				}
			});

			if(!found) {
				$(this).parent('li').prevAll('li').find('a').each(function(){
					if($(this).text().substring(0,1).toLowerCase() == keyCodeMap[e.keyCode]) {
						$(this).focus();
						return false;
					}
				});
			}
		}
	});


	// Hide menu if click or focus occurs outside of navigation
	$(this).find('a').last().keydown(function(e){
		if(e.keyCode == 9) {
			// If the user tabs out of the navigation hide all menus
			$('.'+settings.menuHoverClass)
				.attr('aria-hidden', 'true')
				.removeClass(settings.menuHoverClass)
				.find('a')
					.attr('tabIndex',-1);
		}
	});

	$(document).click(function(){ $('.'+settings.menuHoverClass).attr('aria-hidden', 'true').removeClass(settings.menuHoverClass).find('a').attr('tabIndex',-1); });

	$(this).click(function(e){
		e.stopPropagation();
	});
}


var globalAudioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);

var node_tone = [
	440,
	466.2,
	493.9,
	523.3,
	554.4,
	587.3,
	622.3,
	659.3
];

// context unlocking
function webAudioUnlock (context) {
	return new Promise(function (resolve, reject) {
		if (context.state === 'suspended') {
			var unlock = function() {
				context.resume().then(function() {
					$(document).off('touchstart', unlock);
					$(document).off('touchend', unlock);
					$(document).off('mouseup', unlock);

					resolve(true);
				},
				function (reason) {
					reject(reason);
				});
			};

			$(document).on('touchstart', unlock);
			$(document).on('touchend', unlock);
			$(document).on('mouseup', unlock);
		} else {
			resolve(false);
		}
	});
}

webAudioUnlock(globalAudioCtx);

// test for Firefox (has broken RamptoValue audio function)
var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

//Generate tone. All arguments are optional:
//duration of the tone in milliseconds. Default is 500
//frequency of the tone in hertz. default is 440
//type of tone. Possible values are sine, square, sawtooth, triangle, and custom. Default is sine.
//callback to use on end of tone
/* https://stackoverflow.com/questions/879152/how-do-i-make-javascript-beep/29641185#29641185 */
function play_beep(duration, frequency, volume, type, fadetime, callback) {
	if (volume && volume > MIN_LOG_VOL_LIM) {
		var oscillator = globalAudioCtx.createOscillator();
		var gainNode = globalAudioCtx.createGain();
	
		oscillator.connect(gainNode);
		gainNode.connect(globalAudioCtx.destination);
	
		if (!duration)
			duration = 500;
	
		gainNode.gain.value = volume;
	
		if (frequency)
			oscillator.frequency.value = frequency;
		if (type)
			oscillator.type = type;
		if (!fadetime)
			fadetime = 1;
		if (callback)
			oscillator.onended = callback;
	
		if(isFirefox)
			fadetime = 0;
	
		oscillator.start();
		setTimeout(function(gNode, fade){
			gNode.gain.exponentialRampToValueAtTime(0.00001, globalAudioCtx.currentTime + fade);
		}, duration, gainNode, fadetime);

		/*
		setTimeout(function(){
			oscillator.stop();
		}, duration + (fadetime * 1000));*/
	}
};

function play_mp3_beep(audio_obj, volume) {
	if (volume && volume > MIN_LOG_VOL_LIM) {
		audio_obj.volume = volume;
		audio_obj.play();
	}
};

function playLeaderTone() {
	if (rotorhazard.use_mp3_tones) {
		play_mp3_beep(sound_leader, rotorhazard.indicator_beep_volume);
	}
	else {
		play_beep(75, 1200, rotorhazard.indicator_beep_volume, 'square');
		setTimeout(function(tone){
			play_beep(100, 1800, rotorhazard.indicator_beep_volume, 'square');
		}, 75, 0);
	}
};

function playWinnerTone() {
	if (rotorhazard.use_mp3_tones) {
		play_mp3_beep(sound_winner, rotorhazard.indicator_beep_volume);
	}
	else {
		play_beep(50, 1200, rotorhazard.indicator_beep_volume, 'square');
		setTimeout(function(tone) {
			play_beep(75, 1800, rotorhazard.indicator_beep_volume, 'square');
		}, 50, 0);
		setTimeout(function(tone) {
			play_beep(50, 1200, rotorhazard.indicator_beep_volume, 'square');
		}, 125, 0);
		setTimeout(function(tone) {
			play_beep(75, 1800, rotorhazard.indicator_beep_volume, 'square');
		}, 175, 0);
		setTimeout(function(tone) {
			play_beep(50, 1200, rotorhazard.indicator_beep_volume, 'square');
		}, 250, 0);
		setTimeout(function(tone) {
			play_beep(100, 1800, rotorhazard.indicator_beep_volume, 'square');
		}, 300, 0);
	}
};

function __(text) {
	// return translated string
	if (rotorhazard.language_strings[rotorhazard.interface_language]) {
		if (rotorhazard.language_strings[rotorhazard.interface_language]['values'][text]) {
			return rotorhazard.language_strings[rotorhazard.interface_language]['values'][text]
		}
	}
	return text
}

function __l(text) {
	// return translated string for local voice
	var lang = rotorhazard.voice_string_language;
	if (rotorhazard.voice_string_language == 'match-timer') {
		lang = rotorhazard.interface_language;
	}

	if (rotorhazard.language_strings[lang]) {
		if (rotorhazard.language_strings[lang]['values'][text]) {
			return rotorhazard.language_strings[lang]['values'][text]
		}
	}
	return text
}

/* Data model for nodes */
function nodeModel() {
	this.trigger_rssi = false;
	this.fObj = {
		key: '—',
		fString: 0,
		band: null,
		channel: null,
		frequency: 0
	};
	this.node_peak_rssi = false;
	this.node_nadir_rssi = false;
	this.pass_peak_rssi = false;
	this.pass_nadir_rssi = false;
	this.graphing = false;
	this.enter_at_level = false;
	this.exit_at_level = false;

	this.canvas = false;
	this.graph = '';
	this.series = '';
	this.crossingSeries = '';

	this.graphPausedTime = false;
	this.graphPaused = false;
	this.pauseSeries = '';
}
nodeModel.prototype = {
	checkValues: function(){
		if (!this.frequency) {
			return null;
		}

		var warnings = [];

		if (this.node_nadir_rssi > 0 && this.node_nadir_rssi < this.node_peak_rssi - 20) {
			// assume node data is invalid unless nadir and peak are minimally separated
			if (this.enter_at_level > this.node_peak_rssi) {
				warnings.push(__('EnterAt is higher than NodePeak: <strong>Passes may not register</strong>. <em>Complete a lap pass before adjusting node values.</em>'));
			} else if (this.enter_at_level >= this.node_peak_rssi - 5) {
				warnings.push(__('EnterAt is very near NodePeak: <strong>Passes may not register</strong>. <em>Complete a lap pass before adjusting node values.</em>'));
			}
		}

		if (this.node_nadir_rssi > 0 && this.exit_at_level <= this.node_nadir_rssi) {
			warnings.push('ExitAt is lower than NodeNadir: <strong>Passes WILL NOT register</strong>.');
		}

		if (this.enter_at_level <= this.exit_at_level) {
			warnings.push(__('EnterAt must be greater than ExitAt: <strong>Passes WILL NOT register correctly</strong>.'));
		} else if (this.enter_at_level <= this.exit_at_level + 10) {
			warnings.push(__('EnterAt is very near ExitAt: <strong>Passes may register too frequently</strong>.'));
		}

		if (this.exit_at_level < this.pass_nadir_rssi) {
			warnings.push(__('ExitAt is lower than PassNadir: <strong>Passes may not complete</strong>.'));
		} else if (this.exit_at_level <= this.pass_nadir_rssi + 5) {
			warnings.push(__('ExitAt is very near PassNadir: <strong>Passes may not complete</strong>.'));
		}

		var output = '';
		if (warnings.length) {
			var output = $('<ul class="node-warnings">');
			for (i in warnings) {
				output.append('<li>' + warnings[i] + '</li>')
			}
		}
		return output;
	},
	setup: function(element){
		this.graph.addTimeSeries(this.series, {lineWidth:1.7,
			strokeStyle:'hsl(214, 53%, 60%)',
			fillStyle:'hsla(214, 53%, 60%, 0.4)'
		});
		this.graph.addTimeSeries(this.crossingSeries, {lineWidth:1.7,
			strokeStyle:'none',
			fillStyle:'hsla(136, 71%, 70%, 0.3)'
		});
		this.graph.streamTo(element, 200); // match delay value to heartbeat in server.py
	},
	updateThresholds: function(){
		this.graph.options.horizontalLines = [
			{color:'hsl(8.2, 86.5%, 53.7%)', lineWidth:1.7, value: this.enter_at_level}, // red
			{color:'hsl(25, 85%, 55%)', lineWidth:1.7, value: this.exit_at_level}, // orange
			// {color:'#999', lineWidth:1.7, value: this.node_peak_rssi},
			// {color:'#666', lineWidth:1.7, value: this.pass_nadir_rssi},
		];
		if (this.graphPaused) {
			this.graph.render(this.canvas, this.graphPausedTime);
		}
	}
}

/* Data model for timer */

function timerModel() {
	// interval control
	this.interval = 100; // in ms
	this.min_interval = 10; // skip interval if too soon

	this.timeout = false;
	this.expected = false;
	this.next_interval = 100; // in ms

	this.callbacks = {
		'start': false,
		'stop': false,
		'step': false,
		'expire': false,
	};
	this.staging_cb_tic = null; // prevent double callbacks

	this.running = false;
	this.remote_zero_time = null; // timestamp for server's t=0 point (race start)
	this.remote_staging_start_time = null; // timestamp for server's staging start time
	this.local_zero_time = null; // timestamp for local T=0 point (race start)
	this.local_staging_start_time = null; // timestamp for local staging start time
	this.phased_staging = false; // timer counts independently in staging
	this.hidden_staging = false; // display 'ready' message instead of showing time remaining
	this.staging_tones = 0; // sound tones during staging
	this.time = null; // start-relative time in ms
	this.time_tenths = null; // race-relative display time in tenths (inverts when counting down)
	this.time_staging_tenths = null; // staging-relative time
	this.count_up = false; // use fixed-length timer
	this.duration_tenths = 0; // fixed-length duration, in tenths
	this.has_looped = false; // prevent expire callbacks until timer runs 1 loop
	this.allow_expire = false; // prevent multiple expire callbacks

	this.drift_history = [];
	this.drift_history_samples = 10;
	this.drift_correction = 0;

	this.warn_until = 0; // display sync warning

	var self = this;

	function step() { // timer control
		var now = window.performance.now();
		self.time = now - self.local_zero_time;
		var continue_timer = true;

		self.time_staging_tenths = Math.round((now - self.local_staging_start_time) / 100);

		if (self.time > self.interval / -2) {
			// time is positive or zero
			if (!self.count_up) {
				var new_time_tenths = self.duration_tenths - Math.round(self.time / 100);

				if (new_time_tenths != self.time_tenths) { // prevent double callbacks
					self.time_tenths = new_time_tenths;

					if (self.time_tenths <= 0) {
						// continue_timer = false;
						// self.running = false;
						if (self.has_looped && self.allow_expire && self.callbacks.expire instanceof Function) {
							self.callbacks.expire(self);
							self.allow_expire = false;
						} else if (self.callbacks.step instanceof Function) {
							self.callbacks.step(self);
						}
					} else {
						if (self.callbacks.step instanceof Function) {
							self.callbacks.step(self);
						}
					}
				}
			} else {
				var new_time_tenths = Math.round(self.time / 100);

				if (new_time_tenths != self.time_tenths) { // prevent double callbacks
					self.time_tenths = new_time_tenths;

					if (self.callbacks.step instanceof Function) {
						self.callbacks.step(self);
					}
				}
			}
		} else {
			// negative
			var new_time_tenths = Math.round(self.time / 100);

			if (new_time_tenths != self.time_tenths) { // prevent double callbacks
				self.time_tenths = new_time_tenths;

				if (self.callbacks.step instanceof Function) {
					self.callbacks.step(self);
				}
			}
		}

		self.has_looped = true;

		if (continue_timer) {
			now = window.performance.now();
			var drift = now - self.expected;
			if (drift > self.interval) {
				// self-resync if timer is interrupted (tab change, device goes to sleep, etc.)
				if (self.callbacks.self_resync instanceof Function) {
					self.callbacks.self_resync(self);
				}
				self.continue();
			} else {
				self.get_next_step(now);
				self.timeout = setTimeout(step, Math.max(0, self.next_interval - self.drift_correction));

				self.drift_history.push(drift + self.drift_correction);
				self.drift_correction = median(self.drift_history);
				if (self.drift_history.length >= self.drift_history_samples) {
					self.drift_history.shift();
				}
			}
		}
	}

	function run_after_sync() {
		// check for sync
		if (self.local_zero_time != null) {
			// initialize expiration allowance
			now = window.performance.now();
			self.allow_expire = (!self.count_up && now < self.local_zero_time);

			// start timing loop
			self.continue();

			// do callback
			if (self.callbacks.start instanceof Function) {
				self.callbacks.start(self);
			}
		} else {
			self.timeout = setTimeout(run_after_sync, 100);
		}
	}

	this.get_next_step = function(now){
		// find current differential
		var diff = this.local_zero_time - now;

		if (diff >= 0) {
			// waiting for zero
			var to_next = diff % this.interval;
		} else {
			// timer past zero
			var to_next = this.interval + (diff % this.interval);
		}

		this.expected = now + to_next;
		this.next_interval = to_next;

		if (to_next < this.min_interval) { // skip tic if too short (prevents extra tics from delay compensation)
			this.expected += this.interval;
			this.next_interval += this.interval;
		}
	}

	this.start = function(server_start_time, server_staging_start_time=null){
		// reset simplified time and staging callback
		this.time_tenths = false;
		this.staging_cb_tic = null;

		this.remote_zero_time = server_start_time;
		this.remote_staging_start_time = server_staging_start_time;
		this.sync(rotorhazard.server_time_differential);

		// begin timing once sync is established
		run_after_sync();
	}

	this.continue = function(race_start_ms) {
		// begin timing loop from unknown position
		var now = window.performance.now();
		if (this.running) {
			clearTimeout(this.timeout);
		}

		this.get_next_step(now);

		this.timeout = setTimeout(step, this.next_interval);
		this.running = true;
	}

	this.sync = function() {
		// set local timer based on remote and calculated differential
		// only valid when both components provided
		var local_remote_differential = rotorhazard.server_time_differential; // get diff from shared store

		this.local_zero_time = null;
		this.local_staging_start_time = null;
		
		if (local_remote_differential != null) {
			if (this.remote_zero_time != null) {
				this.local_zero_time = this.remote_zero_time - local_remote_differential;

				if (this.remote_staging_start_time != null) {
					this.local_staging_start_time = this.remote_staging_start_time - local_remote_differential;
				} else {
					this.local_staging_start_time = this.remote_zero_time - local_remote_differential;
				}
			}
		}
	}

	this.stop = function(){
		// stop timing
		clearTimeout(this.timeout);
		this.running = false;
		if (self.callbacks.stop instanceof Function) {
			self.callbacks.stop(this);
		}
	}

	this.renderHTML = function() {
		if (this.local_zero_time == null || typeof this.time_tenths != 'number' || !this.running) {
			return '--:--';
		}

		if (this.hidden_staging && this.time < 0) {
			return __l('Ready');
		}

		var active_time_tenths = this.time_tenths;

		// hold timer during prestage
		if (this.phased_staging && this.time_staging_tenths < 0) {
			active_time_tenths = Math.trunc((this.local_staging_start_time - this.local_zero_time) / 100);
		}

		var active_time_s = Math.trunc(active_time_tenths / 10);
		var display_time = Math.abs(active_time_s);

		if (this.time < 0 && active_time_tenths < 0) {
			var sign = '';
		} else {
			var sign = active_time_tenths >= 0 ? '' : '-';
		}

		var hour = Math.floor(display_time / 3600);
		display_time = display_time % 3600;
		var minute = Math.floor(display_time / 60);
		var second = display_time % 60;
		var decimal = Math.abs(active_time_tenths % 10);

		second = (second < 10) ? '0' + second : second; // Pad zero if under 10
		minute = (minute < 10) ? '0' + minute : minute;

		if (hour) {
			return sign + hour + ':' + minute + ':' + second + '.' + decimal;
		} else {
			return sign + minute + ':' + second + '.' + decimal;
		}
	}
}

function parseJsonStr(str) {
	try {
		var retVal = JSON.parse(str);
		if (retVal == null) {
  			throw 'Null data found';
		}
		return retVal;
	} catch(ex) {
		console.error('Error parsing data ("' + str + '") - ' + ex);
		return null;
	}
}

function parseIntOrBoolean(str) {
	if (str == 'false') {
		return 0;
	}
	if (str == 'true') {
		return 1;
	}
	try {
		var retVal = JSON.parse(str);
		if (retVal == null) {
  			throw 'Null data found';
		}
		return retVal;
	} catch(ex) {
		console.error('Error parsing data ("' + str + '") int/bool - ' + ex);
		return 0;
	}
}

function parseIntDefault(str, defaultVal=0) {
	var retVal = parseInt(str);
	return isNaN(retVal) ? defaultVal : retVal;
}

/* rotorhazard object for local settings/storage */
var rotorhazard = {
	raceMode: {
		0: 'Fixed time',
		1: 'No Time Limit',
	},
	startBehavior: {
		0: 'Hole Shot',
		1: 'First Lap',
		2: 'Staggered Start',
	},
	winCondition: {
		1: 'Most Laps in Fastest Time',
		5: 'Most Laps Only',
		6: 'Most Laps Only with Overtime',
		2: 'First to X Laps',
		3: 'Fastest Lap',
		4: 'Fastest Consecutive Laps',
		0: 'None',
	},
	stagingTones: {
		2: 'Each Second',
		1: 'One',
		0: 'None',
	},
	//
	event: {}, // race data
	options: {}, // server options

	language_strings: {},
	interface_language: '',
	// text-to-speech callout options
	voice_string_language: 'match-timer', // text source language
	voice_language: '', // speech synthesis engine (browser-supplied)
	voice_volume: 1.0, // voice call volume
	voice_rate: 1.25,  // voice call speak pitch
	voice_pitch: 1.0,  // voice call speak rate
	voice_callsign: 1, // speak pilot callsigns
	voice_lap_count: 2, // speak pilot lap counts
	voice_team_lap_count: 1, // speak team lap counts
	voice_lap_time: 1, // speak lap times
	voice_race_timer: 2, // speak race timer
	voice_race_winner: 1, // speak race winner
	voice_split_timer: 0, // split timer
	voice_if_node_finished: 0, // call laps after pilot completed
	voice_race_leader: 0, // speak race leader pilot name

	tone_volume: 1.0, // race stage/start tone volume
	beep_crossing_entered: false, // beep node crossing entered
	beep_crossing_exited: false, // beep node crossing exited
	beep_manual_lap_button: false, // beep when manual lap button bit
	beep_race_leader_lap: false, // beep on lap by race leader
	beep_race_winner_declared: false, // beep on race winner declared
	beep_cluster_connect: false, // cluster timer connect / disconnect
	use_mp3_tones: false, //use mp3 tones instead of synthetic tones during Races
	beep_on_first_pass_button: false, // beep during the first pass where not voice announcment is played

	schedule_m: 0, //time in minutes for scheduled races
	schedule_s: 10, //time in seconds for scheduled races
	indicator_beep_volume: 0.5, // indicator beep volume

	//display options
	display_lap_id: false, //enables the display of the lap id
	display_time_start: false, //shows the timestamp of the lap since the race was started
	display_time_first_pass: false, //shows the timestamp of the lap since the first pass was recorded
	display_laps_reversed: false, //shows race laps in reverse order
	display_chan_freq: true, //shows node channel and frequency (Current Race page only)
	hide_graphs: false, //hides RSSI graphs on Run page
	display_late_laps_cur: false, //shows "late" laps on Current Race page

	min_lap: 0, // minimum lap time
	admin: false, // whether to show admin options in nav
	show_messages: true, // whether to display messages
	graphing: false, // currently graphing RSSI
	primaryPilot: -1, // restrict voice calls to single pilot (default: all)
	nodes: [], // node array
	heats: {}, // heats object
	race_format: {}, // current format object

	panelstates: {}, // collapsible panel state

	// all times in ms (decimal micros if available)
	pi_time_request: false,
	server_time_differential: null,
	server_time_differential_samples: [], // stored previously acquired offsets
	has_server_sync: false,
	sync_within: Infinity,
	winner_declared_flag: false,

	timer: {
		deferred: new timerModel(),
		race: new timerModel(),
		stopAll: function() {
			this.deferred.stop();
			this.race.stop();
		},
		running: function() {
			return (this.deferred.running || this.race.running);
		}
	},
	rhStorageItems : [
		{ name: 'rotorhazard.voice_string_language', getVal: function() {return rotorhazard.voice_string_language;}, setVal: function(val) {rotorhazard.voice_string_language = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_language', getVal: function() {return rotorhazard.voice_language;}, setVal: function(val) {rotorhazard.voice_language = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_volume', getVal: function() {return rotorhazard.voice_volume;}, setVal: function(val) {rotorhazard.voice_volume = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_rate', getVal: function() {return rotorhazard.voice_rate;}, setVal: function(val) {rotorhazard.voice_rate = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_pitch', getVal: function() {return rotorhazard.voice_pitch;}, setVal: function(val) {rotorhazard.voice_pitch = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_callsign', getVal: function() {return rotorhazard.voice_callsign;}, setVal: function(val) {rotorhazard.voice_callsign = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_lap_count', getVal: function() {return rotorhazard.voice_lap_count;}, setVal: function(val) {rotorhazard.voice_lap_count = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_team_lap_count', getVal: function() {return rotorhazard.voice_team_lap_count;}, setVal: function(val) {rotorhazard.voice_team_lap_count = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_lap_time', getVal: function() {return rotorhazard.voice_lap_time;}, setVal: function(val) {rotorhazard.voice_lap_time = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_race_timer', getVal: function() {return rotorhazard.voice_race_timer;}, setVal: function(val) {rotorhazard.voice_race_timer = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_race_winner', getVal: function() {return rotorhazard.voice_race_winner;}, setVal: function(val) {rotorhazard.voice_race_winner = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_if_node_finished', getVal: function() {return rotorhazard.voice_if_node_finished;}, setVal: function(val) {rotorhazard.voice_if_node_finished = parseIntOrBoolean(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_split_timer', getVal: function() {return rotorhazard.voice_split_timer;}, setVal: function(val) {rotorhazard.voice_split_timer = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.voice_race_leader', getVal: function() {return rotorhazard.voice_race_leader;}, setVal: function(val) {rotorhazard.voice_race_leader = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.tone_volume', getVal: function() {return rotorhazard.tone_volume;}, setVal: function(val) {rotorhazard.tone_volume = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_crossing_entered', getVal: function() {return rotorhazard.beep_crossing_entered;}, setVal: function(val) {rotorhazard.beep_crossing_entered = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_crossing_exited', getVal: function() {return rotorhazard.beep_crossing_exited;}, setVal: function(val) {rotorhazard.beep_crossing_exited = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_manual_lap_button', getVal: function() {return rotorhazard.beep_manual_lap_button;}, setVal: function(val) {rotorhazard.beep_manual_lap_button = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_race_leader_lap', getVal: function() {return rotorhazard.beep_race_leader_lap;}, setVal: function(val) {rotorhazard.beep_race_leader_lap = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_race_winner_declared', getVal: function() {return rotorhazard.beep_race_winner_declared;}, setVal: function(val) {rotorhazard.beep_race_winner_declared = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_cluster_connect', getVal: function() {return rotorhazard.beep_cluster_connect;}, setVal: function(val) {rotorhazard.beep_cluster_connect = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.use_mp3_tones', getVal: function() {return rotorhazard.use_mp3_tones;}, setVal: function(val) {rotorhazard.use_mp3_tones = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.beep_on_first_pass_button', getVal: function() {return rotorhazard.beep_on_first_pass_button;}, setVal: function(val) {rotorhazard.beep_on_first_pass_button = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.schedule_m', getVal: function() {return rotorhazard.schedule_m;}, setVal: function(val) {rotorhazard.schedule_m = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.schedule_s', getVal: function() {return rotorhazard.schedule_s;}, setVal: function(val) {rotorhazard.schedule_s = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.indicator_beep_volume', getVal: function() {return rotorhazard.indicator_beep_volume;}, setVal: function(val) {rotorhazard.indicator_beep_volume = parseJsonStr(val);}, isAudio: true },
		{ name: 'rotorhazard.min_lap', getVal: function() {return rotorhazard.min_lap;}, setVal: function(val) {rotorhazard.min_lap = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.admin', getVal: function() {return rotorhazard.admin;}, setVal: function(val) {rotorhazard.admin = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.primaryPilot', getVal: function() {return rotorhazard.primaryPilot;}, setVal: function(val) {rotorhazard.primaryPilot = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.hide_graphs', getVal: function() {return rotorhazard.hide_graphs;}, setVal: function(val) {rotorhazard.hide_graphs = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_lap_id', getVal: function() {return rotorhazard.display_lap_id;}, setVal: function(val) {rotorhazard.display_lap_id = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_time_start', getVal: function() {return rotorhazard.display_time_start;}, setVal: function(val) {rotorhazard.display_time_start = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_time_first_pass', getVal: function() {return rotorhazard.display_time_first_pass;}, setVal: function(val) {rotorhazard.display_time_first_pass = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_laps_reversed', getVal: function() {return rotorhazard.display_laps_reversed;}, setVal: function(val) {rotorhazard.display_laps_reversed = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_chan_freq', getVal: function() {return rotorhazard.display_chan_freq;}, setVal: function(val) {rotorhazard.display_chan_freq = parseJsonStr(val);}, isAudio: false },
		{ name: 'rotorhazard.display_late_laps_cur', getVal: function() {return rotorhazard.display_late_laps_cur;}, setVal: function(val) {rotorhazard.display_late_laps_cur = parseIntOrBoolean(val);}, isAudio: false }
	],
	importAudioSettingsDataStr: function(dataStr) {
		try {
			if (dataStr) {
				var lines_arr = dataStr.split("\n");
				for (var line_idx in lines_arr) {
					var line_str = lines_arr[line_idx];
					if (line_str && line_str.length > 0 && line_str[0] != '#') {
						var keyValArr = line_str.split("=");
						if (keyValArr.length > 1) {
							var matchedFlag = false;
							for (var idx in rotorhazard.rhStorageItems) {
								var entry = rotorhazard.rhStorageItems[idx];
								if (entry.isAudio && keyValArr[0] == entry.name) {
									entry.setVal(keyValArr[1]);
									matchedFlag = true;
									break;
								}
							}
							if (!matchedFlag) {
								console.error("Error importing audio settings; invalid key: " + keyValArr[0])
							}
						}
					}
				}
				
				return true;
			}
		} catch(ex) {
			console.error("Error importing audio settings: " + ex)
		}
		return false;
	},
	importAudioSettingsFile: function(fileNameStr, callBackFn) {
		try {
			var fr = new FileReader();
			fr.onload = function () {
				rotorhazard.importAudioSettingsDataStr(fr.result);
				if (callBackFn) {
					callBackFn();
				}
			}
			fr.readAsText(fileNameStr);
		} catch(ex) {
			console.error("Error loading audio settings file: " + ex)
		}
	},
	getAudioSettingsStr: function(date) {
		var outData = "";
		if (date) {
			outData += "# RotorHazard Audio Settings " + this.getCurDateTimeLongStr(date) + "\n";
		}
		for (var idx in rotorhazard.rhStorageItems) {
			var entry = rotorhazard.rhStorageItems[idx];
			if (entry.isAudio) {
				outData += entry.name + "=" + JSON.stringify(entry.getVal()) + "\n";
			}
		}
		return outData;
	},
	getCurDateTimeLongStr: function(date) {
		var options = { year: "numeric", month: "short", day: "numeric",
						hour: "2-digit", minute: "2-digit", second: "2-digit" };
		return date.toLocaleTimeString("en-us", options);
	},
	getCurDateTimeNumStr: function(date) {
	function pad2(number) { return (number < 10 ? '0' : '') + number }
	return date.getFullYear() + pad2(date.getMonth()) + pad2(date.getDay()) + '_' +
			pad2(date.getHours()) + pad2(date.getMinutes()) + pad2(date.getSeconds());
	},
	loadDefaultAudioSettings: function() {
		return rotorhazard.importAudioSettingsDataStr(defaultAudioSettingsStr);
	},
};

var defaultAudioSettingsStr = rotorhazard.getAudioSettingsStr(null);

// deferred timer callbacks (time until race)
rotorhazard.timer.deferred.callbacks.start = function(timer){
	if (rotorhazard.timer.race.running) {  // defer timing to staging/race timers
		rotorhazard.timer.deferred.stop();
	}
}
rotorhazard.timer.deferred.callbacks.step = function(timer){
	if (rotorhazard.has_server_sync && timer.warn_until < window.performance.now()) {
		$('.timing-clock .warning').hide();
	}
	if (rotorhazard.voice_race_timer != 0) {
		if (timer.time_tenths < -36000 && !(timer.time_tenths % -36000)) { // 2+ hour callout
			var hours = timer.time_tenths / -36000;
			speak('<div>' + __l('Next race begins in') + ' ' + hours + ' ' + __l('Hours') + '</div>', true);
		} else if (timer.time_tenths == -36000) {
			speak('<div>' + __l('Next race begins in') + ' 1 ' + __l('Hour') + '</div>', true);
		} else if (timer.time_tenths == -18000) {
			speak('<div>' + __l('Next race begins in') + ' 30 ' + __l('Minutes') + '</div>', true);
		} else if (timer.time_tenths == -6000) {
			speak('<div>' + __l('Next race begins in') + ' 10 ' + __l('Minutes') + '</div>', true);
		} else if (timer.time_tenths < -600 && timer.time_tenths >= -3000 && !(timer.time_tenths % 600)) { // 2–5 min callout
			var minutes = timer.time_tenths / -600;
			speak('<div>' + __l('Next race begins in') + ' ' + minutes + ' ' + __l('Minutes') + '</div>', true);
		} else if (timer.time_tenths == -600) {
			speak('<div>' + __l('Next race begins in') + ' 1 ' + __l('Minute') + '</div>', true);
		} else if (timer.time_tenths == -300) {
			speak('<div>' + __l('Next race begins in') + ' 30 ' + __l('Seconds') + '</div>', true);
		} else if (timer.time_tenths == -100) {
			speak('<div>' + __l('Next race begins in') + ' 10 ' + __l('Seconds') + '</div>', true);
		}else if (timer.time_tenths == -50) {
			speak('<div>' + __l('Next race begins in') + ' 5 ' + __l('Seconds') + '</div>', true);
		}
	}

	$('.time-display').html(timer.renderHTML());
}
rotorhazard.timer.deferred.callbacks.stop = function(timer){
	$('.timing-clock .warning').hide();
	$('.time-display').html(timer.renderHTML());
}
rotorhazard.timer.deferred.callbacks.expire = function(timer){
	rotorhazard.timer.deferred.stop();
	$('.time-display').html(__('Wait'));
}
rotorhazard.timer.deferred.callbacks.self_resync = function(timer){
	// display resync warning
	if (rotorhazard.has_server_sync) {
		$('.timing-clock .warning .value').text(__('recovery'));
	}
	timer.warn_until = window.performance.now() + 3000;
	$('.timing-clock .warning').show();
}

// race/staging timer callbacks
rotorhazard.timer.race.phased_staging = true;

rotorhazard.timer.race.callbacks.start = function(timer){
	$('.time-display').html(timer.renderHTML());
	rotorhazard.timer.deferred.stop(); // cancel lower priority timer
}

rotorhazard.timer.race.callbacks.step = function(timer){
	if (rotorhazard.has_server_sync && timer.warn_until < window.performance.now()) {
		$('.timing-clock .warning').hide();
	}
	if (timer.time_tenths < 0) {
		// time before race begins (staging)
		if (timer.time_staging_tenths < (timer.staging_tones*10)
			&& timer.time_staging_tenths >= 0
			&& timer.time_staging_tenths % 10 == 0
			&& timer.time_staging_tenths != timer.staging_cb_tic) {
			timer.staging_cb_tic = timer.time_staging_tenths;
			if (rotorhazard.use_mp3_tones) {
				play_mp3_beep(sound_stage, rotorhazard.tone_volume);
			}
			else {
				play_beep(100, 440, rotorhazard.tone_volume, 'triangle');
			}
		}
	} else if (timer.time_tenths == 0 ||
		(!timer.count_up && timer.time_tenths == timer.duration_tenths)
		) {
		// play start tone
		if (rotorhazard.use_mp3_tones) {
			play_mp3_beep(sound_buzzer, rotorhazard.tone_volume);
		}
		else {
			play_beep(700, 880, rotorhazard.tone_volume, 'triangle', 0.25);
		}
	} else {
		if (!timer.count_up) {
			if (timer.time_tenths <= 50 && timer.time_tenths > 0) { // Final seconds
				if (timer.time_tenths % 10 == 0) {
					if (rotorhazard.use_mp3_tones) {
						play_mp3_beep(sound_stage, rotorhazard.tone_volume);
					}
					else {
						play_beep(100, 440, rotorhazard.tone_volume, 'triangle');
					}
				}
			} else if (timer.time_tenths == 100) { // announce 10s only when counting down
				if (rotorhazard.voice_race_timer != 0)
					speak('<div>10 ' + __l('Seconds') + '</div>', true);
			}
		}

		if (rotorhazard.voice_race_timer == 1 ||
				(rotorhazard.voice_race_timer == 2 && (!timer.count_up))) {
			if (timer.time_tenths > 36000 && !(timer.time_tenths % 36000)) { // 2+ hour callout (endurance)
				var hours = timer.time_tenths / 36000;
				speak('<div>' + hours + ' ' + __l('Hours') + '</div>', true);
			} else if (timer.time_tenths == 36000) {
				speak('<div>1 ' + __l('Hour') + '</div>', true);
			} else if (timer.time_tenths == 18000) {
				speak('<div>30 ' + __l('Minutes') + '</div>', true);
			} else if (timer.time_tenths > 600 && timer.time_tenths <= 3000 && !(timer.time_tenths % 600)) { // 2–5 min callout
				var minutes = timer.time_tenths / 600;
				speak('<div>' + minutes + ' ' + __l('Minutes') + '</div>', true);
			} else if (timer.time_tenths == 600) {
				speak('<div>1 ' + __l('Minute') + '</div>', true);
			} else if (timer.time_tenths == 300) {
				speak('<div>30 ' + __l('Seconds') + '</div>', true);
			}
		}
	}
	$('.time-display').html(timer.renderHTML());
}
rotorhazard.timer.race.callbacks.stop = function(timer){
	$('.timing-clock .warning').hide();
	$('.time-display').html(timer.renderHTML());
}
rotorhazard.timer.race.callbacks.expire = function(timer){
	// play expired tone
	if (rotorhazard.use_mp3_tones) {
		play_mp3_beep(sound_buzzer, rotorhazard.tone_volume);
	}
	else {
		play_beep(700, 880, rotorhazard.tone_volume, 'triangle', 0.25);
	}
	$('.time-display').html(timer.renderHTML());
}
rotorhazard.timer.race.callbacks.self_resync = function(timer){
	// display resync warning
	if (rotorhazard.has_server_sync) {
		$('.timing-clock .warning .value').text(__('recovery'));
	}
	timer.warn_until = window.performance.now() + 3000;
	$('.timing-clock .warning').show();
}




/* global page behaviors */
var socket = false;
var standard_message_queue = [];
var interrupt_message_queue = [];
var system_messages = [];


if (typeof jQuery != 'undefined') {
jQuery(document).ready(function($){
	// display admin options

    socket = io.connect('http://' + host);

	// reconnect when visibility is regained
	$(document).on('visibilitychange', function(){
		if (!document['hidden']) {
			if (!socket.connected) {
 				socket.connect();
			}
		}
	});

	// display socket status
	function socket_listener() {
		if (socket.connected) {
			$('.socket-warning').slideUp();
		} else {
			$('.socket-warning').slideDown();
		}
	}
	setInterval(socket_listener, 1000);

});
}



