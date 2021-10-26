/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */
'use strict';

const storage = chrome.storage.local;

const title_apply  = 'Apply contrast fix!';
const title_remove = 'Remove contrast fix!';

const tabs          = new Set();
const disabled_tabs = new Set();

chrome.runtime.onInstalled.addListener(details => {

	if (details.reason === 'install') {

		const defaults = {
			'globalStr': 0,
			'size': 0,
			'sizeThreshold': 12,
			'brightness': 50,
			'skipColoreds': true,
			'skipWhites': true,
			'enableEverywhere': true
		};

		storage.set(defaults);

		chrome.tabs.create({ url: 'Welcome.html' });
		return;
	}
});

// chrome.action.onClicked.addListener(async (tab) => {
// 	await toggle(await chrome.action.getTitle({ tabId: tab.id }), tab.id);
// });

chrome.runtime.onMessage.addListener( async (request, sender, sendResponse) => {

	if (request.action === 'toggle') {
		const tabs = await chrome.tabs.query({active: true, currentWindow: true});
		const id   = tabs[0].id;

		await toggle(await chrome.action.getTitle({ tabId: id }), id);
		return;
	}

	if (request.from !== 'toggle')
		return;

	let title;
	let path;

	if (request.enabled) {
		title = title_remove;
		path = 'assets/icons/on.png';

		tabs.add(sender.tab.id);
		disabled_tabs.delete(sender.tab.id);
	} else {
		title = title_apply;
		path  = 'assets/icons/off.png';

		tabs.delete(sender.tab.id);
		disabled_tabs.add(sender.tab.id);
	}

	await chrome.action.setTitle({ tabId: sender.tab.id, title: title });
	// await chrome.action.setIcon({ tabId: sender.tab.id, path: path });
});

// chrome.tabs.onUpdated.addListener((tabId, change_info, tab) => {
//
// 	chrome.pageAction.show(tab.id);
//
// 	if (change_info.status !== 'complete')
// 		return;
//
// 	const url = tab.url;
// 	let hostname = '';
//
// 	if (url.startsWith('file://')) {
// 		hostname = url;
// 	} else {
// 		const matches = url.match(/\/\/(.+?)\//);
//
// 		if (matches)
// 			hostname = matches[1];
// 	}
//
// 	const data = [
// 		'whitelist',
// 		'blacklist',
// 		'enableEverywhere',
// 	];
//
// 	storage.get(data, items => {
//
// 		const blacklist = items.blacklist || [];
//
// 		if (blacklist.find(o => o.url === hostname)) {
// 			chrome.action.setIcon({ tabId: tabId, path: 'assets/icons/off.png' });
// 			chrome.action.setTitle({ title: title_apply, tabId: tabId });
// 			return;
// 		}
//
// 		const options = {
// 			file: 'src/enable.js',
// 			runAt: 'document_end',
// 			allFrames: true
// 		};
//
// 		if (items.enableEverywhere && !disabled_tabs.has(tabId)) {
// 			chrome.tabs.executeScript(tabId, options);
// 			return;
// 		}
//
// 		const whitelist = items.whitelist || [];
//
// 		if (tabs.has(tabId) || whitelist.find(x => x.url === hostname))
// 			chrome.tabs.executeScript(tabId, options);
// 	});
// });

chrome.commands.onCommand.addListener(async (command) => {

	if (command !== 'toggle')
		return;

	const tabs = await chrome.tabs.query({ currentWindow: true, active: true });
	const id   = tabs[0].id;

	await toggle(await chrome.action.getTitle({ tabId: id }), id);
});

chrome.tabs.onRemoved.addListener(tab => {
	tabs.delete(tab.id);
	disabled_tabs.delete(tab.id);
});

async function toggle(title, tab_id)
{
	let new_title = title_remove;
	let file      = 'src/enable.js';
	let icon_path = 'assets/icons/on.png';

	if (title === title_remove) {
		new_title = title_apply;
		file      = 'src/disable.js';
		icon_path = 'assets/icons/off.png';
	}

	// await chrome.action.setIcon({ tabId: tab_id, path: icon_path });
	await chrome.action.setTitle({ title: new_title, tabId: tab_id });
	await chrome.scripting.executeScript({
		target: {
			tabId: tab_id,
			allFrames: true,
		},
		files: [file],
	});
		// tab_id, { allFrames: true, file: file, runAt: 'document_end' }
}
