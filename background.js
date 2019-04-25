/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

const storage = chrome.storage.local;

let tabs = [], urls = [];
const titleApply = "Apply contrast fix!";
const titleRemove = "Remove contrast fix!";

browser.runtime.onInstalled.addListener((details) => {

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
    if(details.reason === "update") 
    {
        storage.get(["size",  "sizeThreshold"], (items) => {
            if(typeof items.size === "undefined") storage.set({"size": 0});
            if(typeof items.sizeThreshold === "undefined") storage.set({"sizeThreshold": 12});
      });
    }
});

browser.runtime.onStartup.addListener(() => { storage.remove('tabs');});

browser.browserAction.onClicked.addListener((tab) =>
{
    chrome.browserAction.getTitle({tabId: tab.id}, (title) => {
        if(title === titleApply) 
        {
            chrome.browserAction.setIcon({tabId: tab.id, path: 'icons/on.png'});
            chrome.browserAction.setTitle({title: titleRemove, tabId: tab.id});

            chrome.tabs.executeScript(tab.id, {allFrames: false, file: 'enable.js', runAt:"document_end"});
        }
        else 
        {
            chrome.browserAction.setIcon({tabId: tab.id, path: 'icons/off.png'});
            chrome.browserAction.setTitle({title: titleApply, tabId: tab.id});

            chrome.tabs.executeScript(tab.id, {allFrames: false, file: 'disable.js', runAt:"document_end"});
        }
    });
});

browser.tabs.onRemoved.addListener((tab) => {
    tabs.splice(tabs.indexOf(tab.id), 1);
    storage.set({'tabs': tabs});
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if(request.from === "yo" && !request.t) 
    {
        chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'icons/off.png'});
        chrome.browserAction.setTitle({title: titleApply, tabId: sender.tab.id});
    
        tabs.splice(tabs.indexOf(sender.tab.id), 1);
        storage.set({'tabs': tabs});
    }
    else 
    {
        chrome.browserAction.setIcon({tabId: sender.tab.id, path: 'icons/on.png'});
        chrome.browserAction.setTitle({title: titleRemove, tabId: sender.tab.id});

        if(tabs.indexOf(sender.tab.id) === -1) 
        {
            tabs.push(sender.tab.id);
            storage.set({'tabs': tabs});
        }
    }
});

browser.tabs.onUpdated.addListener((tabId,changeInfo,tab) => {

    /*if(tab.url.startsWith("http"))*/browser.pageAction.show(tab.id);

    if(changeInfo.status === "complete")
    {
        let domain = extractRootDomain(tab.url);

        storage.get('blacklist', (items) => {
            let blacklist = items.blacklist || [];

            if(blacklist.find(o => o.url === domain)) 
            {
                chrome.browserAction.setIcon({tabId: tabId, path: 'icons/off.png'});
                chrome.browserAction.setTitle({title: titleApply, tabId: tabId});
                return;
            }
            else 
            {
                storage.get('enableEverywhere', (items) => {
                    if(items.enableEverywhere) 
                    {
                        chrome.tabs.executeScript(tabId, {allFrames: false, file: 'enable.js', runAt:"document_end"});
                        return;
                    }
                    else 
                    {
                        storage.get(['whitelist', 'tabs'], (items) => {
                            if(items.whitelist)
                            {
                                let whitelist = items.whitelist || [];

                                if(items.tabs) tabs = items.tabs;
                            
                                if (~tabs.indexOf(tabId) || whitelist.find(o => o.url === domain)) 
                                {
                                    chrome.tabs.executeScript(tabId, {allFrames: false, file: 'enable.js', runAt:"document_end"});
                                }
                            }
                            else urls = [];
                        });
                    }
                });
            }
        });
    }
});

function extractHostname(url) {
  let hostname;

  if (url.indexOf("://") > -1) {
      hostname = url.split('/')[2];
  }
  else {
      hostname = url.split('/')[0];
  }

  hostname = hostname.split(':')[0];
  hostname = hostname.split('?')[0];
  hostname = hostname.replace('www.', '');

  return hostname;
}

function extractRootDomain(url) {
  let domain = extractHostname(url),
      splitArr = domain.split('.'),
      arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain
  if (arrLen > 2) {
      domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
      //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
      if (splitArr[arrLen - 1].length === 2 && splitArr[arrLen - 1].length === 2) {
          //this is using a ccTLD
          domain = splitArr[arrLen - 3] + '.' + domain;
      }
  }
  return domain;
}