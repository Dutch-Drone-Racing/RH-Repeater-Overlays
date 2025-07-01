function renderPageUrls() {
	//Top Race Status Bar

	topbar_title = document.getElementById('topbar_title').value;
	topbar_logo = document.getElementById('topbar_logo').checked;
	document.getElementById('url_topbar').value = baseUrl + '/overlays/bar.html?socket=' + document.getElementById('socket_address').value + '&event_title=' + topbar_title + '&showlogo=' + topbar_logo;

	//Node Overlay
	let node_id = document.getElementById('node_id').value - 1;
	document.getElementById('url_node').value = baseUrl + '/overlays/node.html?socket=' + document.getElementById('socket_address').value + '&node_id=' + node_id;

	//Next Up
	let bg_color = document.getElementById('nextup_bgcolor').value;
	bg_color = bg_color.replace(/^#/, '');
	document.getElementById('url_nextup').value = baseUrl + '/overlays/next_up.html?socket=' + document.getElementById('socket_address').value + '&nextup_title=' + document.getElementById('nextup_title').value + '&nextup_title_show=' + document.getElementById('nextup_title_show').checked + '&nextup_heatname=' + document.getElementById('nextup_heatname').checked + '&nextup_bgcolor=' + bg_color;

	//Leaderboard
	let lb_pilot_color = document.getElementById('leaderboard_pilotcolor').value;
	lb_pilot_color = lb_pilot_color.replace(/^#/, '');
	document.getElementById('url_leaderboard').value = baseUrl + '/overlays/leaderboard.html?socket=' + document.getElementById('socket_address').value + '&leaderboard_quantity=' + document.getElementById('leaderboard_quantity').value + '&leaderboard_avatar_show=' + document.getElementById('leaderboard_avatar_show').checked + '&leaderboard_flag_show=' + document.getElementById('leaderboard_flag_show').checked + '&leaderboard_pilotcolor_show=' + document.getElementById('leaderboard_pilotcolor_show').checked + '&leaderboard_pilotcolor=' + lb_pilot_color + '&leaderboard_title_show=' + document.getElementById('leaderboard_title_show').checked;

	//Leaderboard Top 3
	document.getElementById('url_leaderboard_top3').value = baseUrl + '/overlays/leaderboard_top3.html?socket=' + document.getElementById('socket_address').value + '&leaderboard_quantity=' + document.getElementById('leaderboard_quantity').value + '&leaderboard_avatar_show=' + document.getElementById('leaderboard_avatar_show').checked + '&leaderboard_flag_show=' + document.getElementById('leaderboard_flag_show').checked + '&leaderboard_pilotcolor_show=' + document.getElementById('leaderboard_pilotcolor_show').checked + '&leaderboard_pilotcolor=' + lb_pilot_color + '&leaderboard_title_show=' + document.getElementById('leaderboard_title_show').checked + '&leaderboard_top3_show_more=' + document.getElementById('leaderboard_top3_show_more').checked;

	//Brackets
	document.getElementById('url_brackets').value = baseUrl + '/overlays/brackets.html?socket=' + document.getElementById('socket_address').value + '&bracket_type=' + document.getElementById('brackets_type').value + '&class_id=' + document.getElementById('brackets_class_id').value;
}


function urlCopyToClipboard(item_id) {
	let copyText = document.getElementById(item_id);

	if (!copyText) {
		alert("Element not found!");
		return;
	}

	// Kopieer de waarde van het inputveld naar het clipboard
	navigator.clipboard.writeText(copyText.value).then(() => {
		alert("Copied the text: " + copyText.value);
	}).catch(err => {
		console.error("Error copying text: ", err);
		alert("Failed to copy text!");
	});
}

function urlOpenWindow(item_id) {
	let url = document.getElementById(item_id).value;
	window.open(url, '_blank');
}
