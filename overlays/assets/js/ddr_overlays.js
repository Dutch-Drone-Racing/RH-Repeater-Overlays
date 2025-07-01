/* general socket */
function getQueryParam(name) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(name);
}

function displayClassName(streamclass, class_data) {
	if (!Array.isArray(class_data.classes) || class_data.classes.length === 0) {
		return '';
	}
	const current_class = class_data.classes.find(cls => cls.id == streamclass);
	if (current_class) {
		return current_class.displayname ? current_class.displayname : __('Class') + ' ' + current_class.id;
	}
	return '';
}

function imageExists(url, callback) {
	if (window.location.protocol === "file:") {
		// Fallback methode voor lokaal gebruik via file://
		var img = new Image();
		img.onload = function() { callback(true); };
		img.onerror = function() { callback(false); };
		img.src = url;
	} else {
		// Fetch-methode voor online gebruik
		fetch(url, { method: 'HEAD' })
			.then(response => {
				callback(response.ok);
			})
			.catch(() => {
				callback(false);
			});
	}
}

function pilot_attributes(rotorhazard) {
	for (var i in rotorhazard.event.pilots) {
		var pilot = rotorhazard.event.pilots[i];
		if (pilot.pilot_id != 0) {
			pilot.attributes = [];
			for (var attr_idx in rotorhazard.event.pilot_attributes) {
				var pilot_attr = rotorhazard.event.pilot_attributes[attr_idx];
				if (pilot[pilot_attr.name] != undefined) {
					pilot_attr.value = pilot[pilot_attr.name];
				} else {
					pilot_attr.value = '';
				}
				var pilot_attr_name = pilot_attr.name;
				var attr_object = { name: pilot_attr_name, value: pilot_attr.value };
				//pilot.attributes.push(attr_object);
				pilot.attributes[pilot_attr_name] = attr_object;
			}
		}
	}
}

function load_pilots(rotorhazard) {
	var pilotlist_html = '';
	pilot_attributes(rotorhazard);
	//console.log(rotorhazard.event.pilots);
}

function show_current_laps() {
	if (current_laps && rotorhazard.event.race_status) {
		var i = streamnode;
		var node_index = current_laps.node_index[streamnode];

		$('#pilot_current_laps tr').remove();
		$('#pilot_current_lap_text').html('');

		display_laps = node_index.laps
		while (display_laps.length > 10) {
			display_laps.shift();
		}

		$.each(display_laps, function (j, lap) { // j is loop num, lap is json object
			var tr = '';
			var lapTime = lap.lap_time;
			if (lap.splits.length > 0) {
				lapTime += ' (';
				for (k=0; k<lap.splits.length; k++) {
					var split = lap.splits[k];
					if (k > 0) {
						lapTime += ', ';
					}
					lapTime += split.split_time;
					if (split.split_speed) {
						lapTime += '/' + split.split_speed;
					}
				}
				lapTime += ')';
			}

			tr = $('<tr>')
			if (lap.lap_number == 0) {
				tr.addClass('lap_0');
				lap.lap_number = __('HS');
			}

			if (lap.lap_index == node_index.fastest_lap_index) {
				tr.addClass('fastest_lap');
			}

			tr.append(
				$('<td class="display_lap_number">').text(lap.lap_number + ":")
			);
			$time_td = $('<td>').text(lap.lap_time + ' ');
			$local_prepend = $('<span class="from_start">');

			$time_td.prepend($local_prepend);
			tr.append($time_td);

			if (j && lap.lap_raw < (rotorhazard.min_lap * 1000)) {
				tr.addClass('min-lap-warning');
			}
			if (!rotorhazard.event.race_status.race_mode && lap.lap_time_stamp > (rotorhazard.event.race_status.race_time_sec * 1000)) {
				//tr.addClass('after-time-expired');
			}
			tr.appendTo('#pilot_current_laps');

			// count display_laps
			console.log(display_laps.length);

			if (display_laps.length == 0) {
				$('#pilot_current_lap_text').html('STARTING');
			}
			if (display_laps.length == 1) {
				$('#pilot_current_lap_text').html('First Lap');
			}
			if (display_laps.length == 2) {
				$('#pilot_current_lap_text').html('Second Lap');
			}
			if (display_laps.length == 3) {
				$('#pilot_current_lap_text').html('Third Lap');
			}
			if (display_laps.length == 4) {
				$('#pilot_current_lap_text').html('Fourth Lap');
			}
			if (display_laps.length == 5) {
				$('#pilot_current_lap_text').html('Fifth Lap');
			}
			if (display_laps.length == 6) {
				$('#pilot_current_lap_text').html('Sixth Lap');
			}
		});
	}
}

function show_current_laps_nec() {
	if (current_laps && rotorhazard.event.race_status) {
		var i = streamnode;
		var node_index = current_laps.node_index[streamnode];

		$('#pilot_current_laps tr').remove();
		$('#pilot_current_lap_text').html('');

		let display_laps = node_index.laps.slice(-5); // Alleen de laatste 5 laps

		$.each(display_laps, function (j, lap) {
			var tr = '';
			tr = $('<tr>');
			tr.append(
				$('<td class="display_lap_number">').text(lap.lap_number + ":")
			);
			tr.append(
				$('<td>').text(lap.lap_time)
			);
			tr.appendTo('#pilot_current_laps');
		});

		// Onderste balk: toon het nummer van de laatste lap (indien aanwezig)
		if (display_laps.length > 0) {
			let lastLap = display_laps[display_laps.length - 1];
			$('#pilot_current_lap_text').html('Lap: ' + lastLap.lap_number);
		} else {
			$('#pilot_current_lap_text').html('STARTING');
		}
	}
}

function build_ddr_nextup(leaderboard, display_type, meta, display_starts=false) {
	if (typeof(display_type) === 'undefined')
		display_type = 'by_race_time';
	if (typeof(meta) === 'undefined') {
		meta = {
			team_racing_mode: false,
			start_behavior: 0,
			consecutives_count: 0,
			primary_leaderboard: null
		};
	}

	leaderboard.sort((a, b) => a.node - b.node);

	console.log("Leaderboard after sorting by node:", JSON.stringify(leaderboard, null, 2));

	$('#nextup_pilot_box').empty();

	let htmlBuffer = [];
	
	let promises = leaderboard.map((pilot) => {
		return new Promise((resolve) => {
			let pilot_name = pilot.callsign;
			let flag = getPilotFlag(pilot.pilot_id, ddr_pilots);
			let pilotImgPath = '../avatars/' + pilot_name.replace(/ /g, "_").toLowerCase() + '.jpg';
			let defaultImgPath = './assets/imgs/no_avatar.png';

			imageExists(pilotImgPath, function(exists) {
				let pilotImg = exists ? pilotImgPath : defaultImgPath;

				let html = `
					<div class="nextup_pilot">
						<div class="nextup_pilot_avatar">
							<div class="nextup_pilot_avatar_mask">
								<img src="${pilotImg}" alt="Avatar">
							</div>
						</div>
						<div class="nextup_pilot_flag">
							<div class="nextup_pilot_flag_mask">
								<img src="./assets/imgs/flags/${flag}.jpg">
							</div>
						</div>
						<div class="nextup_pilot_name">${pilot_name}</div>
					</div>
				`;

				htmlBuffer.push({ node: pilot.node, html });
				resolve();
			});
		});
	});

	Promise.all(promises).then(() => {
		
		htmlBuffer.sort((a, b) => a.node - b.node);
		
		$('#nextup_pilot_box').append(htmlBuffer.map(item => item.html).join(''));
	});
}



async function build_leaderboard_ddr(leaderboard_pilotcolor_show, leaderboard_pilotcolor, leaderboard, display_type, meta, display_starts = false, rotorhazard) {
    if (typeof display_type === 'undefined') display_type = 'by_race_time';
    if (typeof meta === 'undefined') {
        meta = {
            team_racing_mode: false,
            start_behavior: 0,
            consecutives_count: 0,
            primary_leaderboard: null
        };
    }

    let show_points = (display_type == 'round');
    let total_label = (meta.start_behavior == 2) ? __('Laps Total') : __('Total');

    // Beperk de leaderboard tot maximaal 16 items
    let limited_leaderboard = leaderboard.slice(0, 16);

	console.log('leaderboard_pilotcolor_show: ' + leaderboard_pilotcolor_show);

    // Maak HTML voor alle pilots
    let pilot_html = await Promise.all(
        limited_leaderboard.map(pilot => build_leaderboard_pilot_card(pilot, display_type, meta, display_starts, rotorhazard, leaderboard_pilotcolor_show, leaderboard_pilotcolor))
    );

    let html_output = "";

    if (pilot_html.length <= 8) {
        // Als er 8 of minder pilots zijn, plaats alles in één kolom
        html_output = `<div class="leaderboard_column">${pilot_html.join("")}</div>`;
    } else {
        // Als er meer dan 8 zijn, splits het in twee kolommen
        let first_column = pilot_html.slice(0, 8).join("");
        let second_column = pilot_html.slice(8).join("");
        html_output = `
            <div class="leaderboard_column">${first_column}</div>
            <div class="leaderboard_column">${second_column}</div>
        `;
    }

    document.getElementById("ddr_leaderboard").innerHTML = html_output;
}


async function build_leaderboard_pilot_card(pilot, display_type, meta, display_starts = false, rotorhazard, leaderboard_pilotcolor_show, leaderboard_pilotcolor) {
    console.log(pilot);
	let pilot_color = getPilotColor(pilot.pilot_id, ddr_pilots);
	let pilot_html = '';

	console.log(meta);

	let total_label = (meta.start_behavior == 2) ? __('Laps Total') : __('Total');


	if(leaderboard_pilotcolor_show == 'false'){
		pilot_html += '<div class="pilot_card" style="border-color: #' + leaderboard_pilotcolor + ';">';

	}else{
		pilot_html += '<div class="pilot_card" style="border-color: ' + pilot_color + ';">';
	}

    pilot_html += '<div class="pilot_card_pos">' + (pilot.position !== null ? pilot.position : '-') + '</div>';

    let pilotImgPath = '../avatars/' + pilot.callsign.replace(/ /g, "_").toLowerCase() + '.jpg';
    let defaultImgPath = './assets/imgs/no_avatar.png';

    let finalImg = await new Promise((resolve) => {
        imageExists(pilotImgPath, function(exists) {
            resolve(exists ? pilotImgPath : defaultImgPath);
        });
    });

    pilot_html += '<div class="pilot_card_avatar"><img src="' + finalImg + '"></div>';
    pilot_html += '<div class="pilot_card_flag"><img class="country_flag" src="./assets/imgs/flags/' + getPilotFlag(pilot.pilot_id, ddr_pilots) + '.jpg"></div>';
    pilot_html += '<div class="pilot_card_pilot">' + pilot.callsign + '</div>';

	pilot_html += '<div class="pilot_card_data">';
	if (display_starts) {
		pilot_html += '<div class="pilot_card_data_item">'+pilot.starts+'</div>';
	}

	if (["by_race_time", "heat", "round", "current"].includes(display_type)) {
		//pilot_html += '<div class="pilot_card_data">'+pilot.laps+'</div>';
		pilot_html += '<div class="pilot_card_data_item">'+pilot.consecutives_base+'/'+pilot.consecutives+'</div>';
		//pilot_html += '<div class="pilot_card_data">'+pilot.avg+'</div>';

		
	}

	let pilot_starts = 0;
	if(pilot.consecutives_base != null){
		pilot_starts = pilot.consecutives_base;
	}

	pilot_html += '<div class="pilot_card_data_item" style="width: 100px;">'+pilot_starts+'/'+pilot.consecutives+ '</div>';
	
	pilot_html += '<div class="pilot_card_data_item" style="margin-right: 106px;">'+pilot.fastest_lap+ '</div>';


    pilot_html += '</div>';



    pilot_html += '</div>';

    return pilot_html;
}





function build_leaderboard_ddr_backup(leaderboard, display_type, meta, display_starts=false, rotorhazard) {
	if (typeof(display_type) === 'undefined')
		display_type = 'by_race_time';
	if (typeof(meta) === 'undefined') {
		meta = {
			team_racing_mode: false,
			start_behavior: 0,
			consecutives_count: 0,
			primary_leaderboard: null
		};
	}

	let show_points = (display_type == 'round');
	let total_label = (meta.start_behavior == 2) ? __('Laps Total') : __('Total');

	let twrap = $('<div class="responsive-wrap">');
	let table = $('<table class="leaderboard">');
	let header = $('<thead>');
	let header_row = $('<tr>');

	header_row.append('<th class="pos">Pos</th>');
	header_row.append('<th class="avatar"><span class="screen-reader-text">Avatar</span></th>');
	header_row.append('<th class="flags"><span class="screen-reader-text">Flag</span></th>');
	header_row.append('<th class="pilot">' + __('Pilot') + '</th>');

	if (meta.team_racing_mode) {
		header_row.append('<th class="team">' + __('Team') + '</th>');
	}
	if (display_starts) {
		header_row.append('<th class="starts">' + __('Starts') + '</th>');
	}
	if (["by_race_time", "heat", "round", "current"].includes(display_type)) {
		header_row.append('<th class="laps">' + __('Laps') + '</th>');
		header_row.append('<th class="total">' + total_label + '</th>');
		header_row.append('<th class="avg">' + __('Avg.') + '</th>');
	}

	header.append(header_row);
	table.append(header);

	let body = $('<tbody>');

	leaderboard.forEach((pilot) => {
		let row = $('<tr id="pilot_id_' + pilot.pilot_id + '">');

		row.append('<td class="pos">' + (pilot.position !== null ? pilot.position : '-') + '</td>');

		let pilotImgPath = './avatars/' + pilot.callsign.replace(/ /g, "_").toLowerCase() + '.jpg';
		let defaultImgPath = './assets/imgs/no_avatar.png';

		let avatarCell = $('<td class="avatar"><img src="' + defaultImgPath + '"></td>');
		row.append(avatarCell);

		let flag = getPilotFlag(pilot.pilot_id, ddr_pilots);
		row.append('<td class="flag"><img class="country_flag" src="./assets/imgs/flags/' + flag + '.jpg"></td>');

		row.append('<td class="pilot">' + pilot.callsign + '</td>');

		if (meta.team_racing_mode) {
			row.append('<td class="team">' + pilot.team_name + '</td>');
		}
		if (display_starts) {
			row.append('<td class="starts">' + pilot.starts + '</td>');
		}

		// **Betrouwbare controle op afbeelding en correct updaten**
		imageExists(pilotImgPath, function(exists) {
			let finalImg = exists ? pilotImgPath : defaultImgPath;
			avatarCell.find('img').attr('src', finalImg);
		});

		body.append(row);
	});

	table.append(body);
	twrap.append(table);
	return twrap;
}



function getPilotFlag(pilot_id, ddr_pilots){
	count = Object.keys(ddr_pilots).length;
	for (var i = 0; i < count; i++) {
		let pilot = ddr_pilots[i];
		if (pilot.pilot_id == pilot_id) {						
			pilot = ddr_pilots[i];
			if(pilot.country){
				country_upp = pilot.country;
				return country_upp;
			}else{
				country_upp = 'xx';
				return country_upp;
			}
			break;
		}
	}
}

function getPilotColor(pilot_id, ddr_pilots){
	count = Object.keys(ddr_pilots).length;
	for (var i = 0; i < count; i++) {
		let pilot = ddr_pilots[i];
		if (pilot.pilot_id == pilot_id) {						
			pilot = ddr_pilots[i];
			if(pilot.color){
				color = pilot.color;
				return color;
			}
			break;
		}
	}
}


function render_pilots(rotorhazard) {
	var pilotlist = document.getElementById('pilotlist');
	var pilotlist_html_2 = '';


	pilot_attributes(rotorhazard);

	for (var i = 0; i < rotorhazard.event.pilots.length; i++) {

		pilot = rotorhazard.event.pilots[i];
		//pilot.attributes = pilot_attributes(rotorhazard, rotorhazard.event.pilots[i].pilot_id);
		//console.log(pilot);
		country_flag = pilot.attributes.country.value.toLowerCase();
		pilot_id = pilot.pilot_id;
		console.log(country_flag + ' - ' + pilot_id);

		// if div exists pilot_id_flag_'+leaderboard[i].pilot_id+'
		if(document.getElementById('pilot_id_flag_'+pilot.pilot_id)){
			//console.log('pilot_id_flag_'+pilot.pilot_id);
			document.getElementById('pilot_id_flag_'+pilot.pilot_id).innerHTML = '<img class="country_flag" src="./assets/imgs/flags/'+country_flag+'.jpg">';
		}

	}

	//pilots = rotorhazard.event.pilots;

	//pilotlist.innerHTML = pilotlist_html_2;
	
}





async function build_leaderboard_ddr_top3(leaderboard_pilotcolor_show, leaderboard_pilotcolor, leaderboard, display_type, meta, display_starts = false, rotorhazard) {
    if (typeof display_type === 'undefined') display_type = 'by_race_time';
    if (typeof meta === 'undefined') {
        meta = {
            team_racing_mode: false,
            start_behavior: 0,
            consecutives_count: 0,
            primary_leaderboard: null
        };
    }

    let show_points = (display_type == 'round');
    let total_label = (meta.start_behavior == 2) ? __('Laps Total') : __('Total');

    // Beperk de leaderboard tot maximaal 16 items
    let limited_leaderboard = leaderboard.slice(3, 24);

	//limit leaderboard to 3 items
	let limited_leaderboard_top3 = leaderboard.slice(0, 3);

	build_leaderboard_top3_podium(limited_leaderboard_top3, display_type, meta, display_starts, rotorhazard);

	console.log('leaderboard_pilotcolor_show: ' + leaderboard_pilotcolor_show);

    // Maak HTML voor alle pilots
    let pilot_html = await Promise.all(
        limited_leaderboard.map(pilot => build_leaderboard_pilot_card(pilot, display_type, meta, display_starts, rotorhazard, leaderboard_pilotcolor_show, leaderboard_pilotcolor))
    );

    let html_output = "";

    if (pilot_html.length <= 8) {
        // Als er 8 of minder pilots zijn, plaats alles in één kolom
        html_output = `<div class="leaderboard_column">${pilot_html.join("")}</div>`;
    } else {
        // Als er meer dan 8 zijn, splits het in twee kolommen
        let first_column = pilot_html.slice(0, 11).join("");
        let second_column = pilot_html.slice(11).join("");
        html_output = `
            <div class="leaderboard_column">${first_column}</div>
            <div class="leaderboard_column">${second_column}</div>
        `;
    }



    document.getElementById("leaderboard_top3_show_more").innerHTML = html_output;
}

function build_leaderboard_top3_podium(leaderboard) {
	
	document.getElementById("leaderboard_top3_third_callsign").innerHTML = leaderboard[2].callsign;
	document.getElementById("leaderboard_top3_third_time").innerHTML = leaderboard[2].consecutives_base+'/'+leaderboard[2].consecutives;
	document.getElementById("leaderboard_top3_third_flag").innerHTML = '<img src="./assets/imgs/flags/' + getPilotFlag(leaderboard[2].pilot_id, ddr_pilots) + '.jpg">';
	document.getElementById("leaderboard_top3_third_avatar").innerHTML = '<img src="../avatars/4x2/' + leaderboard[2].callsign.replace(/ /g, "_").toLowerCase() + '.png">';

	document.getElementById("leaderboard_top3_second_callsign").innerHTML = leaderboard[1].callsign;
	document.getElementById("leaderboard_top3_second_time").innerHTML = leaderboard[1].consecutives_base+'/'+leaderboard[1].consecutives;
	document.getElementById("leaderboard_top3_second_flag").innerHTML = '<img src="./assets/imgs/flags/' + getPilotFlag(leaderboard[1].pilot_id, ddr_pilots) + '.jpg">';
	document.getElementById("leaderboard_top3_second_avatar").innerHTML = '<img src="../avatars/4x2/' + leaderboard[1].callsign.replace(/ /g, "_").toLowerCase() + '.png">';

	document.getElementById("leaderboard_top3_first_callsign").innerHTML = leaderboard[0].callsign;
	document.getElementById("leaderboard_top3_first_time").innerHTML = leaderboard[0].consecutives_base+'/'+leaderboard[0].consecutives;
	document.getElementById("leaderboard_top3_first_flag").innerHTML = '<img src="./assets/imgs/flags/' + getPilotFlag(leaderboard[0].pilot_id, ddr_pilots) + '.jpg">';
	document.getElementById("leaderboard_top3_first_avatar").innerHTML = '<img src="../avatars/4x2/' + leaderboard[0].callsign.replace(/ /g, "_").toLowerCase() + '.png">';

}












/* HTML generators for brackets */
class BracketHeat {
    constructor(number, type, column, advance_to) {
        this.number = number;          /* heat number, starting from 1 */
        this.type = type;              /* 'winner' or 'loser' */
        this.column = column;          /* column index where the heat shall be rendered, starting from 0 */
        this.advance_to = advance_to;  /* the next heat where the winners of this heat will race
                                        * applicable only if the first and the second classified advance to the same heat */
    }
}

const bracket_formats = {
	"ddr8de": [
			new BracketHeat(1,  "preliminary", 	0, 6),
			new BracketHeat(2,  "preliminary", 	0, 6),
			new BracketHeat(3,  "loser", 		0, 8),
			new BracketHeat(4,  "winner", 		1, 8),
			new BracketHeat(5,  "loser",       	1, 9),
			new BracketHeat(6,  "winner",      	2, 11),
	  ],
    "multigp16": [
                   new BracketHeat(1,  "preliminary", 0, 6),
                   new BracketHeat(2,  "preliminary", 0, 6),
                   new BracketHeat(3,  "preliminary", 0, 8),
                   new BracketHeat(4,  "preliminary", 0, 8),
                   new BracketHeat(5,  "loser",       0, 9),
                   new BracketHeat(6,  "winner",      1, 11),
                   new BracketHeat(7,  "loser",       0, 10),
                   new BracketHeat(8,  "winner",      1, 11),
                   new BracketHeat(9,  "loser",       1, 12),
                   new BracketHeat(10, "loser",       1, 12),
                   new BracketHeat(11, "winner",      2, 14),
                   new BracketHeat(12, "loser",       2, 13),
                   new BracketHeat(13, "loser",       3, 14),
                   new BracketHeat(14, "winner",      3),
                 ],
    "fai16de":   [  
					new BracketHeat(1,  "preliminary", 0, 6),
					new BracketHeat(2,  "preliminary", 0, 6),
					new BracketHeat(3,  "preliminary", 0, 8),
					new BracketHeat(4,  "preliminary", 0, 8),
					new BracketHeat(5,  "loser",       0, 9),
					new BracketHeat(6,  "loser",      0, 11),
					new BracketHeat(7,  "winner",       1, 10),
					new BracketHeat(8,  "winner",      1, 11),
					new BracketHeat(9,  "loser",       1, 12),
					new BracketHeat(10, "loser",       1, 12),
					new BracketHeat(11, "loser",      2, 14),
					new BracketHeat(12, "winner",       2, 13),
					new BracketHeat(13, "loser",       3, 14),
					new BracketHeat(14, "winner",      3),
				],
    //"fai32":     [],
    "fai32de":   [
					new BracketHeat(1,  "winner", 0),
					new BracketHeat(2,  "winner", 0),
					new BracketHeat(3,  "winner", 0),
					new BracketHeat(4,  "winner", 0),
					new BracketHeat(5,  "winner", 1),
					new BracketHeat(6,  "winner", 1),
					new BracketHeat(7,  "winner", 1),
					new BracketHeat(8,  "winner", 1),
					new BracketHeat(9,  "winner", 2),
					new BracketHeat(10, "winner", 2),
					new BracketHeat(11, "winner", 2),
					new BracketHeat(12, "winner", 2),
					new BracketHeat(13, "loser",  0),
					new BracketHeat(14, "loser",  0),
					new BracketHeat(15, "loser",  0),
					new BracketHeat(16, "loser",  0),
					new BracketHeat(17, "loser",  1),
					new BracketHeat(18, "loser",  1),
					new BracketHeat(19, "loser",  1),
					new BracketHeat(20, "loser",  1),
					new BracketHeat(21, "loser",  2),
					new BracketHeat(22, "loser",  2),
					new BracketHeat(23, "winner", 3),
					new BracketHeat(24, "winner", 3),
					new BracketHeat(25, "loser",  3),
					new BracketHeat(26, "loser",  3),
					new BracketHeat(27, "loser",  4),
					new BracketHeat(28, "winner", 4),
					new BracketHeat(29, "loser",  5),
					new BracketHeat(30, "winner", 5),
                 ]
}

function build_elimination_brackets(race_bracket_type, race_class_id, ddr_pilot_data, ddr_heat_data, ddr_class_data, ddr_race_data) {

    // clear brackets
    $('#winner_bracket_content').html('');
    $('#loser_bracket_content').html('');

    var elimination_heats = [];

    Object.values(ddr_heat_data).forEach(heat => {
        if (heat.class_id == race_class_id) {
            elimination_heats.push(heat);
        }
    });

    // loop through heats and build brackets
    console.log('There are ' + elimination_heats.length + ' heats');

    for (let i = 0; i < elimination_heats.length; i++) {
        const heat = elimination_heats[i];
        let html = '<div class="bracket_race">';
        html += '<div class="bracket_race_title">' + heat.displayname + '</div>';
        html += '<div class="bracket_race_pilots">';

        const filtered_slots = heat.slots.filter(slot => /*slot.seed_id*/true && slot.seed_rank);

        for (let j = 0; j < filtered_slots.length; j++) {
            const slot = filtered_slots[j];
            let pilot;

            if (slot.pilot_id === 0) {
                // try to get the pilot from completed heats
                if (slot.method == 1) {
                    // heat
                    if (
                        ddr_race_data &&
                        ddr_race_data.heats &&
                        ddr_race_data.heats[slot.seed_id] &&
                        ddr_race_data.heats[slot.seed_id].leaderboard &&
                        ddr_race_data.heats[slot.seed_id].leaderboard.meta &&
                        ddr_race_data.heats[slot.seed_id].leaderboard.meta.primary_leaderboard
                    ) {
                        const leaderboard_type = ddr_race_data.heats[slot.seed_id].leaderboard.meta.primary_leaderboard;
                        pilot = ddr_race_data.heats[slot.seed_id].leaderboard[leaderboard_type]?.find(p => p.position === slot.seed_rank);
                    } else {
                        pilot = undefined;
                    }
                }
            } else {
                // pilot available
                pilot = ddr_pilot_data.find(p => p.pilot_id === slot.pilot_id);
            }

            if (pilot) {
                let flagImg = getFlagURL(pilot.pilot_id, ddr_pilot_data);
                let pilotImg = getPilotImgURL(pilot);

                html += '<div class="bracket_race_pilot">';

                html += '<div class="avatar"><img src="' + pilotImg + '"></div>';
                html += '<div class="flag"><img src="' + flagImg + '" alt="USA"></div>';
                html += '<div class="pilot_name">' + pilot.callsign + '</div>';

                html += '</div>';
            } else {
                let method_text = get_method_descriptor(ddr_pilot_data, ddr_heat_data, ddr_class_data, slot.method, slot.seed_id, slot.seed_rank, slot.pilot_id)
                html += '<div class="bracket_race_pilot">';
                html += '<div class="no_pilot">' + method_text + '</div>';
                html += '</div>';
            }
        }

        html += '</div>';
        html += '</div>';

        if (bracket_formats[race_bracket_type] != undefined) {
            let bracket_heat_info = bracket_formats[race_bracket_type][i];

            if (bracket_heat_info.type == "winner" || bracket_heat_info.type == "preliminary") {
                var column_counter = bracket_heat_info.column; 
                if ($('#bracket_column_' + column_counter).length == 0) {
                    $('#winner_bracket_content').append('<div id="bracket_column_'+column_counter+'" class="bracket_column"></div>');
                }
                $('#bracket_column_'+column_counter).append( html );
            } else {
                var column_counter = bracket_heat_info.column + 1;
                if ($('#bracket_column_loser_' + column_counter).length == 0) {
                    $('#loser_bracket_content').append('<div id="bracket_column_loser_'+column_counter+'" class="bracket_column"></div>');
                }
                $('#bracket_column_loser_'+column_counter).append( html );
            }
        }
    }
}

function get_method_descriptor(ddr_pilot_data, ddr_heat_data, ddr_class_data, method, seed, rank, pilot_id) {
    if (method == 0) { // pilot
        var pilot = ddr_pilot_data?.find(obj => {return obj.pilot_id == pilot_id});

        if (pilot) {
            return pilot.callsign;
        } else {
            return false;
        }
    } else if (method == 1) { // heat
        var heat = ddr_heat_data?.find(obj => {return obj.id == seed});

        if (heat) {
            return heat.displayname + " " + __('Rank') + " " + rank;
        } else {
            return false;
        }
    } else if (method == 2) { // class
        var race_class = ddr_class_data?.find(obj => {return obj.id == seed});

        if (race_class) {
            return race_class.displayname + " " + __('Rank') + " " + rank;
        } else {
            return false;
        }
    }
    return false;
}



/* utility functions */
function setsAreEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    return [...set1].every(item => set2.has(item));
}




/* Pilot data retrieval */
function getFlagURL(pilot_id, ddr_pilot_data) {
    let flagImg = './assets/imgs/flags/' + getPilotFlag(pilot_id, ddr_pilot_data) + '.jpg';
    if (!imageExists(flagImg)) {
        // flagImg = './assets/imgs/no_flag.jpg';
    }
    return flagImg;
}

function getPilotImgURL(pilot) {
    let pilotImg = '/avatars/' + pilot.callsign.replace(/ /g,"_").toLowerCase() + '.jpg';
    if (!imageExists(pilotImg)) {
        pilotImg = './assets/imgs/no_avatar.png';
    }
    return pilotImg;
}
