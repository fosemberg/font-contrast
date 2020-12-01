/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */
'use strict';

const storage = chrome.storage.local;

const title_apply  = "Apply contrast fix!";
const title_remove = "Remove contrast fix!";

let tabs = [];

browser.runtime.onInstalled.addListener(details =>  {

	if(details.reason === "install") {
		storage.set({"globalStr": 0});
		storage.set({"size": 0});
		storage.set({"sizeThreshold": 12});
		storage.set({"size": 0});
		storage.set({"sizeThreshold": 12});
		storage.set({"brightness": 50});
		storage.set({"skipColoreds": true});
		storage.set({"skipWhites": true});
		//storage.set({ "enableEverywhere": true });

		browser.tabs.create({ url: "Welcome.html" });
	} else if(details.reason === "update") {
		storage.get(["size", "sizeThreshold"], items =>  {
			if(typeof items.size === "undefined")
				storage.set({"size": 0});

			if(typeof items.sizeThreshold === "undefined")
				storage.set({"sizeThreshold": 12});
		});
	}
});

browser.runtime.onStartup.addListener(() => { storage.remove('tabs'); });

browser.browserAction.onClicked.addListener(async (tab) => {
	toggle(await browser.browserAction.getTitle({ tabId: tab.id }), tab.id);
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.from === "yo" && !request.t)  {
		chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'assets/icons/off.png'});
		chrome.browserAction.setTitle({title: title_apply, tabId: sender.tab.id});

		tabs.splice(tabs.indexOf(sender.tab.id), 1);
		storage.set({'tabs': tabs});
	} else {
		chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'assets/icons/on.png'});
		chrome.browserAction.setTitle({title: title_remove, tabId: sender.tab.id});

		if (tabs.indexOf(sender.tab.id) === -1) {
			tabs.push(sender.tab.id);
			storage.set({'tabs': tabs});
		}
	}
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	browser.pageAction.show(tab.id);

	if (changeInfo.status !== 'complete')
		return;

	const url = tab.url;
	let hostname = '';

	if (url.startsWith('file://')) {
		hostname = url;
	} else {
		const matches = url.match(/\/\/(.+?)\//);

		if(matches)
			hostname = matches[1];
	}

	storage.get(['blacklist', 'enableEverywhere'], items => {
		const blacklist = items.blacklist || [];

		if (blacklist.find(o => o.url === hostname)) {
			chrome.browserAction.setIcon({ tabId: tabId, path: 'assets/icons/off.png' });
			chrome.browserAction.setTitle({ title: title_apply, tabId: tabId });
			return;
		}

		if (items.enableEverywhere) {
			chrome.tabs.executeScript(tabId, { allFrames: true, file: 'src/enable.js', runAt:"document_end" });
			return;
		}

		storage.get(['whitelist', 'tabs'], items => {
			if (!items.whitelist)
				return;

			let whitelist = items.whitelist || [];

			if (items.tabs)
				tabs = items.tabs;

			if (~tabs.indexOf(tabId) || whitelist.find(o => o.url === hostname))
				chrome.tabs.executeScript(tabId, { allFrames: true, file: 'src/enable.js', runAt:"document_end" });
		});
	});
});

browser.commands.onCommand.addListener(async (command) => {
	if (!command === 'toggle')
		return;

	const tabs = await browser.tabs.query({ currentWindow: true, active: true });

	const id = tabs[0].id;

	toggle(await browser.browserAction.getTitle({ tabId: id }), id);
});

browser.tabs.onRemoved.addListener(tab => {
	tabs.splice(tabs.indexOf(tab.id), 1);
	storage.set({'tabs': tabs});
});

function toggle(title, tab_id)
{
	let new_title = title_remove;
	let file      = 'src/enable.js';
	let icon_path = 'assets/icons/on.png';

	if (title === title_remove) {
		new_title = title_apply;
		file      = 'src/disable.js';
		icon_path = 'assets/icons/off.png';
	}

	chrome.browserAction.setIcon({ tabId: tab_id, path: icon_path });
	chrome.browserAction.setTitle({ title: new_title, tabId: tab_id });
	chrome.tabs.executeScript(tab_id, { allFrames: true, file: file, runAt: "document_end" });
}
