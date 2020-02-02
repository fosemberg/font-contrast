/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

const storage = chrome.storage.local;

const titleApply  = "Apply contrast fix!";
const titleRemove = "Remove contrast fix!";

let tabs = [];

browser.runtime.onInstalled.addListener(details => 
{
	if(details.reason === "install") 
	{
		storage.set({"globalStr": 0});
		storage.set({"size": 0});
		storage.set({"sizeThreshold": 12});
		storage.set({"skipColoreds": true});
		storage.set({"skipWhites": true});
		browser.tabs.create({url: "Welcome.html"});
		//storage.set({"enableEverywhere": true});
	}
	else if(details.reason === "update") 
	{
		storage.get(["size", "sizeThreshold"], (items) => 
		{
			if(typeof items.size === "undefined") storage.set({"size": 0});
			if(typeof items.sizeThreshold === "undefined") storage.set({"sizeThreshold": 12});
		});
	}
});

browser.runtime.onStartup.addListener(() => { storage.remove('tabs');});

browser.browserAction.onClicked.addListener((tab) =>
{
	chrome.browserAction.getTitle({tabId: tab.id}, title => 
	{
		if(title === titleApply) 
		{
			chrome.browserAction.setIcon({tabId: tab.id, path: 'assets/icons/on.png'});
			chrome.browserAction.setTitle({title: titleRemove, tabId: tab.id});

			chrome.tabs.executeScript(tab.id, {allFrames: false, file: 'src/enable.js', runAt:"document_end"});
		}
		else 
		{
			chrome.browserAction.setIcon({tabId: tab.id, path: 'assets/icons/off.png'});
			chrome.browserAction.setTitle({title: titleApply, tabId: tab.id});

			chrome.tabs.executeScript(tab.id, {allFrames: false, file: 'src/disable.js', runAt:"document_end"});
		}
	});
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => 
{
	if(request.from === "yo" && !request.t) 
	{
		chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'assets/icons/off.png'});
		chrome.browserAction.setTitle({title: titleApply, tabId: sender.tab.id});
	
		tabs.splice(tabs.indexOf(sender.tab.id), 1);
		storage.set({'tabs': tabs});
	}
	else 
	{
		chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'assets/icons/on.png'});
		chrome.browserAction.setTitle({title: titleRemove, tabId: sender.tab.id});

		if(tabs.indexOf(sender.tab.id) === -1) 
		{
			tabs.push(sender.tab.id);
			storage.set({'tabs': tabs});
		}
	}
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => 
{
	browser.pageAction.show(tab.id);

	if(changeInfo.status !== 'complete') return;

	let hostname = '';
	
	const url = tab.url;

	if(url.startsWith('file://'))
	{
		hostname = url;
	}
	else
	{
		hostname = url.match(/\/\/(.+?)\//)[1];
	}

	storage.get(['blacklist', 'enableEverywhere'], items => 
	{
		const blacklist = items.blacklist || [];

		if(blacklist.find(o => o.url === hostname)) 
		{
			chrome.browserAction.setIcon({ tabId: tabId, path: 'assets/icons/off.png' });
			chrome.browserAction.setTitle({ title: titleApply, tabId: tabId });
			
			return;
		}
		else 
		{
			if(items.enableEverywhere) 
			{
				chrome.tabs.executeScript(tabId, { allFrames: false, file: 'src/enable.js', runAt:"document_end" });
				
				return;
			}
			else 
			{
				storage.get(['whitelist', 'tabs'], items => 
				{
					if(!items.whitelist) return;

					let whitelist = items.whitelist || [];

					if(items.tabs) tabs = items.tabs;
				
					if (~tabs.indexOf(tabId) || whitelist.find(o => o.url === hostname)) 
					{
						chrome.tabs.executeScript(tabId, { allFrames: false, file: 'src/enable.js', runAt:"document_end" });
					}
				});
			}
		}
	});
});

browser.tabs.onRemoved.addListener(tab => 
{
	tabs.splice(tabs.indexOf(tab.id), 1);
	storage.set({'tabs': tabs});
});