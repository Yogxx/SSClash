'use strict';
'require view';
'require fs';
'require ui';
'require rpc';

var isReadonlyView = !L.hasViewPermission() || null;
let startStopButton = null;
let editor = null;

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

async function getServiceStatus() {
	try {
		return Object.values((await callServiceList('clash'))['clash']['instances'])[0]?.running;
	} catch (ignored) {
		return false;
	}
}

async function startService() {
	if (startStopButton) startStopButton.disabled = true;
	return fs.exec('/etc/init.d/clash', ['start'])
		.then(() => fs.exec('/etc/init.d/clash', ['enable']))
		.catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to start and enable service: %s').format(e.message)), 'error');
		})
		.finally(() => {
			if (startStopButton) startStopButton.disabled = false;
		});
}

async function stopService() {
	if (startStopButton) startStopButton.disabled = true;
	return fs.exec('/etc/init.d/clash', ['stop'])
		.then(() => fs.exec('/etc/init.d/clash', ['disable']))
		.catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to stop and disable service: %s').format(e.message)), 'error');
		})
		.finally(() => {
			if (startStopButton) startStopButton.disabled = false;
		});
}

async function toggleService() {
	const running = await getServiceStatus();
	if (running) {
		await stopService();
	} else {
		await startService();
	}
	window.location.reload();
}

async function restartService() {
	const running = await getServiceStatus();
	if (running) {
		await stopService();
	}
	await startService();
	window.location.reload();
}

async function Yacd() {
	let newWindow = window.open('', '_blank');
	const running = await getServiceStatus();
	if (running) {
		let port = '9090';
		let path = 'ui';
		let yacd = 'yacd';
		let protocol = window.location.protocol;
		let hostname = window.location.hostname;
		let url = `${protocol}//${hostname}:${port}/${path}/${yacd}?hostname=${hostname}&port=${port}`;
		newWindow.location.href = url;
	} else {
		newWindow.close();
		alert(_('Service is not running.'));
	}
}

async function Zash() {
	let newWindow = window.open('', '_blank');
	const running = await getServiceStatus();
	if (running) {
		let port = '9090';
		let path = 'ui';
		let yacd = 'zashboard';
		let protocol = window.location.protocol;
		let hostname = window.location.hostname;
		let url = `${protocol}//${hostname}:${port}/${path}/${yacd}?hostname=${hostname}&port=${port}`;
		newWindow.location.href = url;
	} else {
		newWindow.close();
		alert(_('Service is not running.'));
	}
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initializeAceEditor(content) {
    await loadScript('/luci-static/resources/view/ssclash/ace/ace.js');
    ace.config.set('basePath', '/luci-static/resources/view/ssclash/ace/');
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/tomorrow_night_bright");
    editor.session.setMode("ace/mode/yaml");
    editor.setValue(content);
    editor.clearSelection();
    editor.setOptions({
        fontSize: "12px",
        showPrintMargin: false,
        wrap: true
    });
}

return view.extend({
	load: function() {
		return L.resolveDefault(fs.read('/opt/clash/config.yaml'), '');
	},
	handleSaveApply: function(ev) {
		var value = editor.getValue().trim() + '\n';
		return fs.write('/opt/clash/config.yaml', value).then(function(rc) {
			ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
			return fs.exec('/etc/init.d/clash', ['reload']);
		}).then(function() {
			window.location.reload();
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e.message)), 'error');
		});
	},
	render: async function(config) {
		const running = await getServiceStatus();

		const view = E([
			E('button', {
				'class': 'btn',
				'click': Yacd,
				'style': 'margin-left: 10px; color: white; background: grey;'
			}, _('Yacd')),
			
			E('button', {
				'class': 'btn',
				'click': Zash,
				'style': 'margin-left: 10px; color: white; background: grey;'
			}, _('Zash')),
			
			(startStopButton = E('button', {
				'class': 'btn',
				'click': toggleService,
				'style': 'margin-left: 10px; color: white; background: grey;'
			}, running ? _('Stop') : _('Start'))),
			
			E('button', {
				'class': 'btn',
				'click': restartService,
				'style': 'margin-left: 10px; color: white; background: grey;'
			}, _('Restart')),
			
			E('span', {
				'style': running ? 'color: green; margin-left: 10px;' : 'color: red; margin-left: 10px;'
			}, running ? _('<strong>RUNNING</strong>') : _('<strong>STOP</strong>')),
			
			E('h2', _('<strong>SSClash</strong>')),
			E('p', { 'class': 'cbi-section-descr' }, _('<strong>Super Simple Clash aka SSCLASH</strong>')),
			E('div', {
				'id': 'editor',
				'style': 'width: 100%; height: 510px;'
			})
		]);

		initializeAceEditor(config);

		return view;
	},
	handleSave: null,
	handleReset: null
});
		      
