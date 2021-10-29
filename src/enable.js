/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";

// Style tag
var style_node;
// Text node
var css_node;

// svg url replacer {

async function getBackgroundUrlData (node) {
	const style = getComputedStyle(node);
	const url = style.backgroundImage.substring(5,style.backgroundImage.length-2);
	const res = await fetch(url);
	const text = await res.text();
	console.log('fosemberg', 'svgText', text);
	return text;
}

function addStyleToSvgStr (svgStr) {
	const insertSvgStyle = '<style type="text/css">*{fill: rgba(0,0,0,0.25)!important;color: #000!important;stroke: #000!important}</style>'
	// return svgStr.substring(0, svgStr.length - 7) + insertSvgStyle + svgStr.substring(svgStr.length - 7, svgStr.length);
	return svgStr.replace('</svg>', `${insertSvgStyle}</svg>`);
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function svgStrToDataImageCss (raw) {
	var encoded = raw.replace(/\s+/g, " ")

	// According to Taylor Hunt, lowercase gzips better ... my tiny test confirms this
	encoded = replaceAll(encoded, "%", "%25");
	encoded = replaceAll(encoded, "> <", "><"); // normalise spaces elements
	encoded = replaceAll(encoded, "; }", ";}"); // normalise spaces css
	encoded = replaceAll(encoded, "<", "%3c");
	encoded = replaceAll(encoded, ">", "%3e");
	encoded = replaceAll(encoded, "\"", "'");
	encoded = replaceAll(encoded, "#", "%23"); // needed for ie and firefox
	encoded = replaceAll(encoded, "{", "%7b");
	encoded = replaceAll(encoded, "}", "%7d");
	encoded = replaceAll(encoded, "|", "%7c");
	encoded = replaceAll(encoded, "^", "%5e");
	encoded = replaceAll(encoded, "`", "%60");
	encoded = replaceAll(encoded, "@", "%40");

	// charset reportedly not needed ... I need to test before implementing
	var uri = 'url("data:image/svg+xml;charset=UTF-8,' + encoded + '")';
	var style = 'background-image: ' + uri + ';';
	return style;
}

function withLog (fn) {
	return (...props) => {
		const result = fn(...props);
		console.log(fn.name, '(', ...props, ') =>');
		console.log(result);
		return result;
	}
}

async function makeBackgroundUrlStyleWithSvg(node) {
	return svgStrToDataImageCss(
		withLog(addStyleToSvgStr)(
			await getBackgroundUrlData(node)
		)
	);
}

// svg url replacer }

function getRGBarr(rgba_str) {
	return rgba_str.substring(4, rgba_str.length - 1).split(', ');
}

function getAlfa(rgba_str) {
	const rgbArr = getRGBarr(rgba_str)
	return rgbArr.length === 4
		? parseFloat(rgbArr[3])
		: 1
}

function checkIsRound (node, style = getComputedStyle(node)) {
	const {borderRadius, width, paddingLeft, paddingRight, height, paddingTop, paddingBottom} = style;
	const isPercent = borderRadius.match(/%/);
	const borderRadiusNum = parseFloat(borderRadius);
	let widthNum = 0;
	let heightNum = 0;

	if (width === 'auto' || height === 'auto') {
		widthNum = node.getBoundingClientRect().width;
		heightNum = node.getBoundingClientRect().height;
	} else {
		widthNum = parseFloat(paddingLeft) + parseFloat(width) + parseFloat(paddingRight);
		heightNum = parseFloat(paddingTop) + parseFloat(height) + parseFloat(paddingBottom);
	}
	// const widthNum = width === 'auto'
	// 	? node.getBoundingClientRect().width
	// 	: parseFloat(paddingLeft) + parseFloat(width) + parseFloat(paddingRight);
	// const heightNum = height === 'auto'
	// 	? node.getBoundingClientRect().height
	// 	: parseFloat(paddingTop) + parseFloat(height) + parseFloat(paddingBottom)
	// console.log({isPercent, borderRadiusNum});
	if (isPercent) {
		return borderRadiusNum > 40 && borderRadiusNum < 60
	} else {
		// console.log({widthNum, heightNum});
		return Math.max(widthNum, heightNum) / Math.min(widthNum, heightNum) < 2 &&
			Math.min(widthNum, heightNum) / borderRadiusNum < 3
	}
}

function calcBrightness([r, g, b, a = 1]) {
	return +(r * 0.2126 + g * 0.7152 + b * 0.0722).toFixed(1);
}

function calcColorfulness([r, g, b, a = 1]) {
	return Math.abs(r - g) + Math.abs(g - b);
}

function containsText(element) {
	return element.nodeType === Node.TEXT_NODE &&
		/\S/.test(element.nodeValue);
}

function roundTextsInsideRound(node) {
	for (const child of Array.from(node.childNodes)) {
		if (containsText(child)) {
			child.parentNode.setAttribute('rb__', '');
		}
	}
}

function childNodesContainsTextOrSvg(node) {
	const children = Array.from(node.childNodes);
	return children.some(containsText) || node.getElementsByTagName('svg').length;
}

function isButtonWithoutIcon(node, tag, style = getComputedStyle(node)) {
	return (
		tag === 'BUTTON' &&
		!node.getElementsByTagName('svg').length &&
		!node.getElementsByTagName('img').length &&
		!style.backgroundImage.match(/url\(/)
	)
}


function getBgBrightness(parent, bg_color) {
	// assume light-ish color if we can't find it
	let bg_luma = 236;

	const transparent = "rgba(0, 0, 0, 0)";

	while (bg_color === transparent && parent) {
		if (parent instanceof Element)
			bg_color = getComputedStyle(parent).getPropertyValue("background-color");

		parent = parent.parentNode;
	}

	if (bg_color !== transparent)
		bg_luma = calcBrightness(getRGBarr(bg_color));

	return bg_luma;
}

function nlToArr(nl) {
	let arr = [];

	for (let i = 0, len = arr.length = nl.length; i < len; ++i)
		arr[i] = nl[i];

	return arr;
}



function getCSS(cfg, url, bodyId) {
	let host = url.replace('www.', '');
	let additionalCss = ''
	switch (host) {
		case 'vk.com':
			additionalCss = 'svg {z-index: 3;}'
			break;
	}

	const white_background_picked = `#${bodyId},#${bodyId} [bg__]{background-color:#fff!important;}`;
	const delete_gradient_for_background = `#${bodyId} [bg_ig__]{background-image:unset!important;}`;
	const add_box_shadow_for_big_background = `#${bodyId} [bg_bs__]{box-shadow: 0px 0px 0px 0.5px #000;}`;
	const add_border_color_for_big_background = `#${bodyId} [bg_b__]{border-color: #000;border-width: 1px;border-style: solid;}`;

	const attr = `#${bodyId},#${bodyId}[id] [d__],#${bodyId} [d__] svg`;

	const white_background_for_text = `${attr}{background-color:#fff !important;}`;
	const black_fill = `${attr}{fill:#000 !important;}`;

	let color_black = 'color:#000!important';

	let dim = '';
	if (cfg.advDimming)
		dim = `${attr}{filter:brightness(${cfg.brightness}%);}`;
	else
		dim = `${attr}{${color_black}}`;

	let opacity = '';
	if (cfg.forceOpacity)
		opacity = '*,*[style]{opacity:1!important}';

	let smartOpacityCss = '';
	if (true) {
		smartOpacityCss = '[o__]{opacity:1!important}';
	}

	let forceColorBlackCss = '';
	if (true) {
		// forceColorBlackCss = '*,*[style]{color:#000!important}';
	}

	let forceFilterDropShadowCss = '';
	if (true) {
		forceFilterDropShadowCss = '[src$=".png"] {filter: drop-shadow(0 0 2px black);}';
	}

	let forceBorderColorBlackCss = '';
	if (true) {
		forceBorderColorBlackCss = `#${bodyId} *{border-color:#000!important}`;
	}

	let forceBeforeAfterBlackAndWhiteCss = '';
	if (true) {
		forceBeforeAfterBlackAndWhiteCss = '#bid__ :before,#bid__ :after{color:#000!important;background-color:rgba(0,0,0,0)!important;filter: drop-shadow(0 0 1px #000);}'
	}

	let forceSvgBlackAndWhiteCss = '';
	if (true) {
		forceSvgBlackAndWhiteCss = '#bid__ svg, #bid__ svg *{color:#000!important;fill:rgba(0,0,0,0.25)!important;stroke:#000;background-color:#fff!important;}'
	}

	let whiteBackground = '';
	// if (true)
	// 	whiteBackground = '*,*[style]{background-color:#fff!important}';

	let bold = '';
	if (cfg.boldText)
		bold = '*{font-weight:bold!important}';

	let underline = '';
	if (cfg.underlineLinks)
		underline = '[u__]{text-decoration:underline!important}';

	if (!cfg.forcePlhdr)
		color_black = '';

	const placeholder = `::placeholder{opacity:1!important;${color_black}}`;

	// Doesn't hurt to put it in, even if form borders are disabled
	const form_border = '[b__]{border:1px solid black!important}';

	let size_inc = '';

	if (cfg.size > 0) {
		let c = 1;
		while (c <= cfg.threshold)
			size_inc += `[s__='${c}']{font-size: calc(${c++}px + ${cfg.size}%)!important}\n`;
	}

	const roundBordersCss = '[r__] [d__]{border-radius: inherit;}';

	return [
		roundBordersCss,
		forceColorBlackCss,
		forceBorderColorBlackCss,
		forceFilterDropShadowCss,
		forceSvgBlackAndWhiteCss,
		forceBeforeAfterBlackAndWhiteCss,
    white_background_for_text,
    dim,
    whiteBackground,
    white_background_picked,
    delete_gradient_for_background,
    add_box_shadow_for_big_background,
    add_border_color_for_big_background,
		smartOpacityCss,
    black_fill,
    opacity,
    size_inc,
    bold,
    placeholder,
    form_border,
    underline,
    additionalCss,
	].join('');
}

function createStyleNode() {
	const doc = document;

	style_node = doc.createElement('style');
	style_node.setAttribute('id', '_fc_');
	doc.head.appendChild(style_node);

	css_node = doc.createTextNode('');
}

async function init() {
	if (document.getElementById('_fc_')) {
		style_node.appendChild(css_node);
		return;
	}

	createStyleNode();

	const stored = [
		'whitelist',
		'globalStr',
		'size',
		'sizeThreshold',
		'skipColoreds',
		'skipHeadings',
		'advDimming',
		'brightness',
		'boldText',
		'forceOpacity',
		'forcePlhdr',
		'skipWhites',
		'underlineLinks',
		'input_border'
	];

	let cfg = await new Promise(res => chrome.storage.local.get(stored, res));

	cfg.strength  = cfg.globalStr;
	cfg.threshold = cfg.sizeThreshold;

	const url = window.location.hostname || window.location.href;

	const wl  = cfg.whitelist || [];
	const idx = wl.findIndex(x => x.url === url);

	if (idx > -1)
		cfg = wl[idx];

	start(cfg, url);
}

function start(cfg, url) {
	let bodyId = document.body.getAttribute('id') || 'bid__';
	css_node.nodeValue = getCSS(cfg, url, bodyId);

	const nodes = nlToArr(document.body.getElementsByTagName('*'));
	document.body.setAttribute('bg__', '');

	document.body.setAttribute('id', bodyId);

	const tags_to_skip = [
		'svg',
		'SCRIPT',
		'LINK',
		'STYLE',
		'IMG',
		'VIDEO',
		'SOURCE',
		'CANVAS',
		'undefined'
	];

	const colors_to_skip  = [
		// 'rgb(0, 0, 0)',
		// 'rgba(0, 0, 0, 0)'
	];

	let classes_to_skip = '';

	let proc_img = true;

	if (cfg.skipWhites) {
		const white = [
			'rgb(255, 255, 255)',
			'rgb(254, 254, 254)',
			'rgb(253, 253, 253)',
			'rgb(252, 252, 252)',
			'rgb(251, 251, 251)',
			'rgb(250, 250, 250)'
		];

		colors_to_skip.push(...white);
	}

	if (cfg.skipHeadings)
		tags_to_skip.push(...['H1', 'H2', 'H3']);

	let callcnt = 0;

	const rgba_rules = new Set();

	const applyExceptions = () => {
		let host = url.replace('www.', '');

		switch (host) {
			case 'youtube.com':
				// Make sure youtube player stays untouched
				classes_to_skip += 'ytp';
				proc_img = false;
				break;
			case 'facebook.com':
				// skipWhites = true;
				proc_img = false;
				break;
		}
	};

	applyExceptions();

	const process = (nodes, mutation = false) => {
		// Debug variables
		let   db_arr     = [];
		const db_node    = true;
		const db_time    = false;
		let   db_timestr = `Process ${callcnt++} time`;

		if (db_time)
			console.time(db_timestr);

		const nodes_to_skip    = [];
		const nodes_behind_img = [];

		const new_rgba_rules = new Set();

		const setTextAttribs = node => {

			const tag = String(node.nodeName);

			const style = getComputedStyle(node);

			const bg              = style.getPropertyValue('background');

			if (tags_to_skip.includes(tag))
				return;

			if (nodes_to_skip.includes(node))
				return;

			if (classes_to_skip.length) {

				const classname = String(node.className);

				if (classname.includes(classes_to_skip)) {
					nodes_to_skip.push(...nlToArr(node.getElementsByTagName('*')));
					return;
				}
			}

			const bg_color        = style.getPropertyValue('background-color');

			const isRound = checkIsRound(node);
			if (
				isButtonWithoutIcon(node, tag, style) ||
				(
					bg_color &&
					bg_color !== 'rgba(255, 255, 255)' &&
					bg_color !== 'rgba(0, 0, 0, 0)' &&
					checkIsRound(node)
				)
			) {
				if (isRound) {
					node.setAttribute('r__', '');
				}
				node.setAttribute('bg__', '');
				const {borderWidth} = style;
				if (parseFloat(borderWidth) === 0) {
					node.setAttribute('bg_bs__', '');
				} else {
					const {borderColor} = style;
					// if (
					// 	borderColor !== 'rgba(0, 0, 0, 0)' &&
					// 	borderColor !== 'rgba(0, 0, 0)'
					// ) {
						node.setAttribute('bg_b__', '');
					// }
				}
			}

			const f_sz = parseInt(style.getPropertyValue('font-size'));

			if (f_sz === 0)
				return;

			if (cfg.size > 0) {
				if (f_sz <= cfg.threshold)
					node.setAttribute('s__', f_sz);
			}

			let img_offset = 0;

			if (proc_img) {
				const bg_img = style.getPropertyValue('background-image');

				if (bg_img !== 'none') {
					const img_children = nlToArr(node.getElementsByTagName("*"));
					nodes_behind_img.push(...img_children);
					img_offset = 127;
				}

				if (nodes_behind_img.includes(node))
					img_offset = 96;
			}

			if (cfg.input_border) {
				if(node.nodeName === 'INPUT' && node.type !== 'submit')
					node.setAttribute('b__', '');
			}

			if (!childNodesContainsTextOrSvg(node))
				return;

			const color = style.getPropertyValue('color');

			if (colors_to_skip.includes(color))
				return;

			let rgba_arr = getRGBarr(color);

			if (!rgba_arr)
				return;

			if (rgba_arr.length > 3) {

				const class_name = `fc_rgba__${rgba_arr[0]}${rgba_arr[1]}${rgba_arr[2]}`;
				node.classList.add(class_name);

				const new_color = color.replace(/\d\.\d+/, '1');
				const rule      = `.${class_name}{color:${new_color}!important}`;

				new_rgba_rules.add(rule);
			}

			const fg_brt          = calcBrightness(rgba_arr);
			const fg_colorfulness = calcColorfulness(rgba_arr);


			let db_obj = {};

			if (db_node) {
				db_obj = {
					tag,
					className: String(node.className),
					text: node.innerText,
					bg,
					fg_colorfulness,
				};

				db_arr.push(db_obj);
			}

			const bg_threshold = 160 - cfg.strength + img_offset;

			// if (bg_brt < bg_threshold)
			// return;

			// const contrast = +Math.abs(bg_brt - fg_brt).toFixed(2);
			const is_link  = tag === 'A';

			// if (cfg.skipColoreds) {
			// 	let   min_contrast      = 132 + (cfg.strength / 2);
			// 	const min_link_contrast = 96 + (cfg.strength / 3);
			// 	const min_colorfulness  = 32;
			//
			// 	if (db_node)
			// 		Object.assign(db_obj, { contrast, min_contrast, min_link_contrast });
			//
			// 	if (is_link)
			// 		min_contrast = min_link_contrast;
			//
			// 	if (contrast > min_contrast && fg_colorfulness > min_colorfulness)
			// 		return;
			// }



			if (
				bg_color &&
				bg_color !== 'rgba(255, 255, 255)' &&
				bg_color !== 'rgba(0, 0, 0, 0)'
			) {
				node.setAttribute('bg__', '');
			}
			node.setAttribute('d__', '');

			if (cfg.underlineLinks && is_link)
				node.setAttribute('u__', '');
		};

		const setBgAttribs = node => {
			const tag = String(node.nodeName);

			const style = getComputedStyle(node);

			const src             = node.getAttribute('src');
			const bg              = style.getPropertyValue('background');
			const bg_color        = style.getPropertyValue('background-color');
			const bg_image        = style.getPropertyValue('background-image');
			const width           = style.getPropertyValue('width');
			const widthNum        = parseInt(width);
			const height          = style.getPropertyValue('height');
			const heightNum       = parseInt(height);
			const opacity         = parseFloat(style.opacity);

			if (bg_image.match(/linear-gradient/)) {
				node.setAttribute('bg_ig__', '');
			}

			if (bg_image.match(/url\(".*\.svg"\)/)) {
				makeBackgroundUrlStyleWithSvg(node).then(svgBackground => {
					node.setAttribute('style', svgBackground)
				});
			}

			// if (src.match(/url\(".*\.svg"\)/)) {
			// 	makeBackgroundUrlStyleWithSvg(node).then(svgBackground => {
			// 		node.setAttribute('src', svgBackground)
			// 	});
			// }

			if (
				node.getAttribute('d__') === null &&
				bg_color &&
				bg_color !== 'rgba(255, 255, 255)' &&
				bg_color !== 'rgba(0, 0, 0, 0)' &&
				getAlfa(bg_color) > 0.5 &&
				opacity > 0.5 &&
				!bg.match(/url/) &&
				tag !== 'IMG' &&
				(
					width === 'auto' ||
					height === 'auto' ||
					(widthNum > 10 && heightNum > 10 && widthNum * heightNum > 1000)
				)
			) {
				node.setAttribute('bg__', '');
				// node.setAttribute('bg_bs__', '');
				if (
					widthNum > 50 &&
					heightNum > 50 &&
					widthNum * heightNum > 30_000
				) {
					const {borderWidth} = style;
					if (parseFloat(borderWidth) === 0) {
						node.setAttribute('bg_bs__', '');
					} else {
						const {borderColor} = style;
						if (
							borderColor !== 'rgba(0, 0, 0, 0)' &&
							borderColor !== 'rgba(0, 0, 0)'
						) {
							node.setAttribute('bg_b__', '');
						}
					}
				}
			}

			if (opacity > 0.1 && opacity < 0.9) {
				node.setAttribute('o__', '');
			}

		}

		const setAttribs = node => {
			setTextAttribs(node);
			setBgAttribs(node);
		}

		const iterateBigArr = (arr) => {
			const chunk = 200;
			const len   = arr.length;

			let idx = 0;

			const doChunk = () => {
				let c = chunk;

				while (c--) {
					if (idx > len - 1)
						return;

					setAttribs(arr[idx++]);
				}

				setTimeout(doChunk, 0);
			};

			doChunk();
		}

		iterateBigArr(nodes);

		// Get the RGBA selectors that aren't already present.
		const diff = [...new_rgba_rules].filter(x => !rgba_rules.has(x));

		if (diff.length) {
			css_node.nodeValue += diff.join('');

			for (const new_rule of new_rgba_rules)
				rgba_rules.add(new_rule);
		}

		if (db_time)
			console.timeEnd(db_timestr);

		if (db_node)
			console.table(db_arr);
	}

	process(nodes);

	const observer = mutations => {
		let new_nodes = [];

		mutations.forEach(mut => {
			for (const node of mut.addedNodes) {
				if (!(node instanceof Element))
					continue;

				// Get children of node, then node itself
				const nodes = nlToArr(node.getElementsByTagName('*'));
				nodes.push(node);

				new_nodes.push(...nodes);
			}
		});

		if(new_nodes.length)
			setTimeout(() => process(new_nodes, true), 1000);
	};

	new MutationObserver(observer).observe(document.body, { childList: true, subtree: true });

	style_node.appendChild(css_node);
}

init();

chrome.runtime.sendMessage({ from: 'toggle', enabled: true });
